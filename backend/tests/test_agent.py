"""Agent endpoint tests — ILMU calls fully mocked.

Validates: tool-arg validation, clamp/reject paths, stress recompute mirrors
Stress.tsx, narrator template fallback when LLM raises.
"""
from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from backend.agent import (
    AgentRequest,
    handle_agent,
    rate_limit_ok,
    stress_compute,
    validate_updates,
)


# --- validate_updates -------------------------------------------------------

def test_validate_cedent_country_ok():
    out = validate_updates("set_cedent_inputs", {"country": "Vietnam"}, "cedent")
    assert out == {"country": "Vietnam"}


def test_validate_cedent_country_unknown_raises():
    with pytest.raises(ValueError, match="unknown country"):
        validate_updates("set_cedent_inputs", {"country": "France"}, "cedent")


def test_validate_cedent_mix_clamps_and_drops_unknown_keys():
    out = validate_updates(
        "set_cedent_inputs",
        {"mix": {"Power Industry": 250, "Bogus": 10, "Transport": -5}},
        "cedent",
    )
    assert out["mix"] == {"Power Industry": 100.0, "Transport": 0.0}


def test_validate_stress_elasticity_clamped():
    out = validate_updates("set_stress_inputs", {"elasticity": 5.0}, "stress")
    assert out["elasticity"] == 1.2
    out2 = validate_updates("set_stress_inputs", {"elasticity": 0.05}, "stress")
    assert out2["elasticity"] == 0.3


def test_validate_stress_scenario_unknown_raises():
    with pytest.raises(ValueError, match="unknown scenario"):
        validate_updates("set_stress_inputs", {"scenario": "Apocalypse"}, "stress")


def test_validate_wrong_tool_for_screen_raises():
    with pytest.raises(ValueError, match="not allowed"):
        validate_updates("set_stress_inputs", {"scenario": "Net Zero 2050"}, "cedent")


# --- stress_compute mirrors Stress.tsx --------------------------------------

def test_stress_compute_current_policies_at_base():
    out = stress_compute(scenario="Current Policies", elasticity=0.7, gwp_usdm=1200.0)
    # Hot House baseline → pct_chg = 0 → lr = base_lr → no swing.
    assert abs(out["lr"] - 0.62) < 1e-6
    assert abs(out["loss_USDm"] - 1200 * 0.62) < 1e-3
    assert abs(out["loss_swing_vs_hothouse_USDm"]) < 1e-3


def test_stress_compute_net_zero_swing_negative():
    out = stress_compute(scenario="Net Zero 2050", elasticity=0.7, gwp_usdm=1200.0)
    assert out["lr"] < 0.62
    assert out["loss_swing_vs_hothouse_USDm"] > 0  # Hot House loss > Net Zero loss


def test_stress_compute_unknown_scenario_returns_empty():
    assert stress_compute(scenario="Apocalypse", elasticity=0.7, gwp_usdm=1200.0) == {}


# --- handle_agent integration (ILMU fully mocked) ---------------------------

def _fake_tool_call_response(name: str, args: dict):
    """OpenAI-shaped chat completion with one tool call."""
    fn = SimpleNamespace(name=name, arguments=json.dumps(args))
    tc = SimpleNamespace(function=fn, id="call-1", type="function")
    msg = SimpleNamespace(content=None, tool_calls=[tc])
    choice = SimpleNamespace(message=msg, finish_reason="tool_calls")
    return SimpleNamespace(choices=[choice])


def _fake_text_response(text: str):
    """OpenAI-shaped chat completion with plain text content (no tool call)."""
    msg = SimpleNamespace(content=text, tool_calls=None)
    choice = SimpleNamespace(message=msg, finish_reason="stop")
    return SimpleNamespace(choices=[choice])


class _FakeClient:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create)
        )

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


def _patch_get_client(responses):
    fake = _FakeClient(responses)
    return patch("backend.agent._get_client", return_value=fake), fake


def test_handle_agent_stress_happy_path():
    responses = [
        _fake_tool_call_response(
            "set_stress_inputs", {"scenario": "Net Zero 2050", "elasticity": 0.9}
        ),
        _fake_text_response('{"narration": "LR resolves to 50.7% on USD 608m."}'),
    ]
    p, _ = _patch_get_client(responses)
    with p:
        resp = handle_agent(AgentRequest(
            message="Net Zero 2050 at elasticity 0.9",
            screen="stress",
            current_state={"scenario": "Current Policies", "elasticity": 0.7, "gwp_usdm": 1200},
        ))
    assert resp.error is None
    assert resp.updates == {"scenario": "Net Zero 2050", "elasticity": 0.9}
    assert resp.tool_called == "set_stress_inputs"
    assert resp.model_output is not None
    assert resp.model_output["scenario"] == "Net Zero 2050"
    assert resp.narration.startswith("LR resolves")


def test_handle_agent_template_fallback_when_narrator_raises():
    responses = [
        _fake_tool_call_response(
            "set_stress_inputs", {"scenario": "Net Zero 2050", "elasticity": 0.9}
        ),
        _fake_text_response("not valid json"),
    ]
    p, _ = _patch_get_client(responses)
    with p:
        resp = handle_agent(AgentRequest(
            message="Net Zero at 0.9",
            screen="stress",
            current_state={"scenario": "Current Policies", "elasticity": 0.7, "gwp_usdm": 1200},
        ))
    assert resp.narration.startswith("Under Net Zero 2050")
    assert "ε = 0.90" in resp.narration


def test_handle_agent_invalid_country_returns_error():
    responses = [_fake_tool_call_response("set_cedent_inputs", {"country": "France"})]
    p, _ = _patch_get_client(responses)
    with p:
        resp = handle_agent(AgentRequest(
            message="French cedent",
            screen="cedent",
            current_state={},
        ))
    assert resp.error and "unknown country" in resp.error
    assert resp.updates == {}


def test_handle_agent_no_tool_call_returns_parse_error():
    # Empty choices → _extract raises → handle_agent returns parse_failed.
    responses = [SimpleNamespace(choices=[
        SimpleNamespace(message=SimpleNamespace(content="hi", tool_calls=None), finish_reason="stop")
    ])]
    p, _ = _patch_get_client(responses)
    with p:
        resp = handle_agent(AgentRequest(
            message="hello", screen="stress", current_state={},
        ))
    assert resp.error and resp.error.startswith("parse_failed")


# --- rate limit ------------------------------------------------------------

def test_rate_limit_blocks_after_threshold():
    ip = "10.0.0.99"
    for _ in range(30):
        assert rate_limit_ok(ip)
    assert not rate_limit_ok(ip)
