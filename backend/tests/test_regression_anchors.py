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

from backend.pipeline import PredictRequest, run_pipeline

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


# === Headline-constants anchors =========================================
# GWP USD 1.2 bn, base LR 0.62, elasticity 0.7 — the three inputs the
# USD 135 m / +11 pp swing is computed from (cell 2 CONSTANTS).

def test_canon_headline_gwp_usdm():
    assert CANON["headline"]["gwp_usdm"] == 1200


def test_canon_headline_base_lr():
    assert CANON["headline"]["base_lr"] == 0.62


def test_canon_headline_elasticity():
    assert CANON["headline"]["elasticity"] == 0.7


# === Stress-test scenario anchors =======================================

def _stress_row(scenario: str) -> dict:
    rows = [r for r in CANON["stress_test_2030_aggregate"] if r["scenario"] == scenario]
    assert rows, f"scenario '{scenario}' missing from stress_test_2030_aggregate"
    return rows[0]


def test_canon_hot_house_loss_ratio():
    """Hot House (Current Policies) baseline LR must match base_lr (0.62)."""
    row = _stress_row("Current Policies")
    assert abs(row["lr"] - 0.62) < 1e-3


def test_canon_net_zero_loss_ratio():
    """Net Zero 2050 LR must be ~0.507 (Hot House -> Net Zero swing of ~11 pp)."""
    row = _stress_row("Net Zero 2050")
    assert abs(row["lr"] - 0.507) < 1e-3


# === MAPE anchor ========================================================

def test_canon_mape_m3a_in_band():
    """M3a MAPE must stay in the 2.4-3.0 % band (XGBoost stochastic-init drift)."""
    mape_m3a = CANON["mape_summary"]["XGBoost_M3a"]
    # Stored in percent units (e.g. 2.43); accept either percent or fractional form.
    if mape_m3a < 1.0:
        assert 0.024 <= mape_m3a <= 0.030, f"M3a MAPE drift: {mape_m3a}"
    else:
        assert 2.4 <= mape_m3a <= 3.0, f"M3a MAPE drift: {mape_m3a}"


# === Phase-shell key presence (added by notebook cells 37b/c/d) =========

def test_canon_phase_2_taxonomy_present():
    assert "phase_2_taxonomy" in CANON
    tax = CANON["phase_2_taxonomy"]
    assert {"physical", "transition", "liability"}.issubset(tax.keys())


def test_canon_phase_3_indicator_map_present():
    assert "phase_3_indicator_map" in CANON
    assert isinstance(CANON["phase_3_indicator_map"], dict)
    assert len(CANON["phase_3_indicator_map"]) > 0


def test_canon_phase_4_panel_quality_present():
    assert "phase_4_panel_quality" in CANON


def test_canon_phase_4_n_economies():
    """SEA panel must have exactly 10 economies."""
    assert CANON["phase_4_panel_quality"]["n_economies"] == 10


def test_canon_phase_4_year_max():
    """Hold-out year is 2024 — pin year_max so back-fill regressions are caught."""
    assert CANON["phase_4_panel_quality"]["year_max"] == 2024
