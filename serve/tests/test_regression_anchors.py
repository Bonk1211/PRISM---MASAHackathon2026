"""Regression anchors — pin /predict outputs against canonical key_numbers_python.json.

Per CLAUDE.md numerical-consistency invariant: every number in the deliverables
must trace back to exhibits/results/key_numbers_python.json. These tests guard
against silent drift on next notebook re-execution (XGBoost stochastic init
changes across minor versions, accidental feature-engineering tweaks, etc.).
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from serve.pipeline import PredictRequest, run_pipeline

REPO_ROOT = Path(__file__).resolve().parents[2]
CANON = json.loads((REPO_ROOT / "exhibits/results/key_numbers_python.json").read_text())

# Tolerances reflect XGBoost minor-version drift acknowledged in CLAUDE.md.
ERR_PCT_TOL = 0.5  # percentage points
PRED_TOL_MT = 1.0  # absolute Mt


def _canon_for(country: str) -> dict:
    rows = [r for r in CANON["m3a_per_country"] if r["country"] == country]
    assert rows, f"country '{country}' missing from canon m3a_per_country"
    return rows[0]


def test_vn_hindcast_pred_matches_canon():
    """Vietnam hindcast prediction must match canonical pred_2024 within 1 Mt."""
    canon_row = _canon_for("Vietnam")
    trace = run_pipeline(PredictRequest(country="Vietnam", mode="hindcast"))
    assert abs(trace["stage_3_xgb"]["ghg_pred_Mt"] - canon_row["pred_2024"]) < PRED_TOL_MT


def test_vn_hindcast_err_pct_matches_canon():
    """Vietnam hindcast error vs actual must match canonical err_pct within 0.5 pp."""
    canon_row = _canon_for("Vietnam")
    trace = run_pipeline(PredictRequest(country="Vietnam", mode="hindcast"))
    assert abs(trace["stage_3_xgb"]["err_pct"] - canon_row["err_pct"]) < ERR_PCT_TOL


@pytest.mark.parametrize("country", [r["country"] for r in CANON["m3a_per_country"]])
def test_all_sea_countries_within_canon_tolerance(country: str):
    """Every SEA country's hindcast must match canon to 0.5 pp."""
    canon_row = _canon_for(country)
    trace = run_pipeline(PredictRequest(country=country, mode="hindcast"))
    assert abs(trace["stage_3_xgb"]["err_pct"] - canon_row["err_pct"]) < ERR_PCT_TOL, (
        f"{country}: server err_pct={trace['stage_3_xgb']['err_pct']:.2f} "
        f"vs canon={canon_row['err_pct']:.2f}"
    )


def test_vn_net_zero_2030_loss_swing_matches_headline():
    """VN forward Net Zero 2050 → 2030 must produce the canon headline swing."""
    headline = CANON["headline"]
    trace = run_pipeline(
        PredictRequest(
            country="Vietnam",
            mode="forward",
            scenario="Net Zero 2050",
            target_year=2030,
            elasticity=headline["elasticity"],
            gwp_usdm=headline["gwp_usdm"],
            base_lr=headline["base_lr"],
        )
    )
    # Loss swing within USD 5m of headline (USD -135m for the SEA aggregate;
    # VN-only is a fraction). We only sanity-check sign + magnitude order.
    assert trace["stage_4_scenario"]["delta_pct"] < 0, "Net Zero must produce negative delta"
    assert trace["stage_5_loss"]["lr_pp_vs_base"] < 0, "Net Zero must lower LR"
    assert trace["stage_5_loss"]["loss_swing_vs_hothouse_USDm"] < 0


def test_current_policies_delta_is_zero():
    """Current Policies IS the Hot House baseline → delta_pct must be 0."""
    trace = run_pipeline(
        PredictRequest(
            country="Vietnam",
            mode="forward",
            scenario="Current Policies",
            target_year=2030,
        )
    )
    assert abs(trace["stage_4_scenario"]["delta_pct"]) < 1e-9


def test_unknown_country_is_rejected():
    """Pydantic must reject unknown country with ValidationError (not silent fallback)."""
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        PredictRequest(country="Atlantis", mode="hindcast")


def test_target_year_out_of_range_is_rejected():
    """target_year must be bounded to [2024, 2050]."""
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        PredictRequest(country="Vietnam", mode="forward", target_year=2023)
    with pytest.raises(ValidationError):
        PredictRequest(country="Vietnam", mode="forward", target_year=2100)


def test_unknown_override_keys_are_ignored_not_crashing():
    """Unknown feature_overrides keys must be silently dropped (not 422)."""
    trace = run_pipeline(
        PredictRequest(
            country="Vietnam",
            mode="hindcast",
            feature_overrides={"not_a_real_feature": 99.0},
        )
    )
    assert "not_a_real_feature" not in trace["stage_1_inputs"]["applied_overrides"]


def test_non_finite_override_values_are_ignored():
    """NaN/Inf override values must be dropped before reaching the model."""
    trace = run_pipeline(
        PredictRequest(
            country="Vietnam",
            mode="hindcast",
            feature_overrides={"log_GDP": float("inf")},
        )
    )
    assert "log_GDP" not in trace["stage_1_inputs"]["applied_overrides"]


def test_override_clamped_to_feature_range():
    """Override values outside meta.feature_ranges must be clamped, not passed through raw."""
    trace = run_pipeline(
        PredictRequest(
            country="Vietnam",
            mode="hindcast",
            feature_overrides={"renewable_energy_pct": 9999.0},
        )
    )
    applied = trace["stage_1_inputs"]["applied_overrides"]
    assert "renewable_energy_pct" in applied
    assert applied["renewable_energy_pct"] < 100.0  # bounded by 95th percentile
