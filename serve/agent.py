"""PRISM agent endpoint — ILMU (YTL AI Labs) NL parser + result narrator.

User types free-form prose on the Cedent or Stress screen. Two-turn pattern:
  1. Forced tool-call extraction (T=0) → set_cedent_inputs / set_stress_inputs.
  2. JSON narration (T=0.2, ≤300 tok) over the precomputed numbers; templated
     fallback if the call raises.

The LLM never invents pipeline numbers. For Stress, the server replicates the
exact formula in app/src/screens/Stress.tsx (reads STRESS_2030 aggregate from
key_numbers_python.json) so narration matches the on-screen StatBig values.
For Cedent, no compute step — the React tier helpers in app/src/data/cedent.ts
re-derive the composite once the form state changes.

ILMU is OpenAI-compatible. Base URL: https://api.ilmu.ai/v1.
Cheapest model with full tool-calling + JSON mode = ilmu-nemo-nano.
"""
from __future__ import annotations

import json
import os
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from serve.pipeline import META

ILMU_MODEL = "ilmu-nemo-nano"
ILMU_BASE_URL = "https://api.ilmu.ai/v1"
EXTRACTION_MAX_TOKENS = 400
NARRATOR_MAX_TOKENS = 300
RATE_LIMIT_PER_MIN = 30

_ALLOWED_COUNTRIES = tuple(sorted(META.get("feature_panel_2024", {}).keys()))
_ALLOWED_SCENARIOS = tuple(META.get("ngfs_scenarios", {}).keys())
_SECTORS = (
    "Power Industry", "Industrial Combustion", "Industrial Processes",
    "Transport", "Agriculture", "Buildings", "Waste", "Fugitive Energy",
)

_REPO_ROOT = Path(__file__).resolve().parents[1]
_KN_PATH = _REPO_ROOT / "exhibits/results/key_numbers_python.json"
try:
    _KN = json.loads(_KN_PATH.read_text())
except FileNotFoundError:
    _KN = {}
_STRESS_AGG = {s["scenario"]: s for s in _KN.get("stress_test_2030_aggregate", [])}
_HEADLINE = _KN.get("headline", {})

# Lazy SDK import — server stays bootable when openai not yet installed.
_OPENAI_CLIENT: Any = None


def _get_client() -> Any:
    global _OPENAI_CLIENT
    if _OPENAI_CLIENT is None:
        from openai import OpenAI
        api_key = os.environ.get("ILMU_API_KEY")
        if not api_key:
            raise RuntimeError("ILMU_API_KEY missing — set in serve/.env")
        _OPENAI_CLIENT = OpenAI(api_key=api_key, base_url=ILMU_BASE_URL)
    return _OPENAI_CLIENT


# --- request / response models --------------------------------------------

class AgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    screen: Literal["cedent", "stress", "scoping"]
    current_state: dict[str, Any] = Field(default_factory=dict, max_length=20)
    session_id: str | None = Field(default=None, max_length=64)
    # Anon-auth uid from Supabase (browser-side signInAnonymously). Stamped
    # onto inserted rows so per-user RLS isolates each visitor's transcripts.
    # None when Supabase auth is unavailable — backend then degrades to
    # stateless mode (no persistence, still answers).
    user_id: str | None = Field(default=None, max_length=64)


class AgentResponse(BaseModel):
    updates: dict[str, Any] = Field(default_factory=dict)
    narration: str = ""
    model_output: dict[str, Any] | None = None
    tool_called: str | None = None
    error: str | None = None
    # Phase 1 only — partial or complete five-axis scoping profile.
    scoping_profile: dict[str, Any] | None = None
    complete: bool = False
    session_id: str | None = None


# --- tool schemas (OpenAI function-calling format) ------------------------

SET_CEDENT_TOOL = {
    "type": "function",
    "function": {
        "name": "set_cedent_inputs",
        "description": (
            "Update Cedent screen sliders for one Southeast-Asian reinsurance cedent. "
            "Provide ONLY the fields the user explicitly mentioned; omitted fields stay unchanged."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "country": {
                    "type": "string",
                    "description": "Cedent country of domicile.",
                    "enum": list(_ALLOWED_COUNTRIES),
                },
                "mix": {
                    "type": "object",
                    "description": (
                        "Sector → percentage of GWP book (0–100). Keys MUST be from the canonical "
                        "sector list. Partial updates supported — frontend re-normalises."
                    ),
                    "properties": {s: {"type": "number"} for s in _SECTORS},
                },
                "ndc_plan_filed": {
                    "type": "boolean",
                    "description": "True if cedent has filed a credible NDC-aligned transition plan.",
                },
                "energy_mix_pct": {
                    "type": "number",
                    "description": "Coal % + 0.5 × Gas % override (0–100). ≥50 forces sector tier ≥ C.",
                },
            },
        },
    },
}

SET_STRESS_TOOL = {
    "type": "function",
    "function": {
        "name": "set_stress_inputs",
        "description": (
            "Update Stress screen NGFS scenario, loss-ratio elasticity, or notional GWP."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "scenario": {
                    "type": "string",
                    "description": "NGFS Phase V scenario.",
                    "enum": list(_ALLOWED_SCENARIOS),
                },
                "elasticity": {
                    "type": "number",
                    "description": "Loss-ratio elasticity 0.30–1.20 (Sigma 1/2024 base = 0.70).",
                },
                "gwp_usdm": {
                    "type": "number",
                    "description": "Gross written premium in USD millions (default 1200).",
                },
            },
        },
    },
}


# --- validation -----------------------------------------------------------

def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def validate_updates(name: str, raw: dict[str, Any], screen: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if screen == "cedent" and name == "set_cedent_inputs":
        c = raw.get("country")
        if c:
            if c not in _ALLOWED_COUNTRIES:
                raise ValueError(f"unknown country '{c}'")
            out["country"] = c
        if isinstance(raw.get("mix"), dict):
            mix: dict[str, float] = {}
            for k, v in raw["mix"].items():
                if k in _SECTORS and isinstance(v, (int, float)):
                    mix[k] = _clamp(float(v), 0.0, 100.0)
            if mix:
                out["mix"] = mix
        if isinstance(raw.get("ndc_plan_filed"), bool):
            out["ndc_plan_filed"] = raw["ndc_plan_filed"]
        if isinstance(raw.get("energy_mix_pct"), (int, float)):
            out["energy_mix_pct"] = _clamp(float(raw["energy_mix_pct"]), 0.0, 100.0)
    elif screen == "stress" and name == "set_stress_inputs":
        s = raw.get("scenario")
        if s:
            if s not in _ALLOWED_SCENARIOS:
                raise ValueError(f"unknown scenario '{s}'")
            out["scenario"] = s
        if isinstance(raw.get("elasticity"), (int, float)):
            out["elasticity"] = _clamp(float(raw["elasticity"]), 0.3, 1.2)
        if isinstance(raw.get("gwp_usdm"), (int, float)):
            out["gwp_usdm"] = max(0.0, float(raw["gwp_usdm"]))
    else:
        raise ValueError(f"tool '{name}' not allowed for screen '{screen}'")
    return out


# --- stress recompute (mirrors app/src/screens/Stress.tsx exactly) ---------
# Frontend uses STRESS_2030 aggregate × user elasticity; we replicate so the
# narration cites the same numbers the on-screen StatBig renders.

def stress_compute(scenario: str, elasticity: float, gwp_usdm: float) -> dict[str, float]:
    base_lr = float(_HEADLINE.get("base_lr", 0.62))
    ref = _STRESS_AGG.get("Current Policies")
    sel = _STRESS_AGG.get(scenario)
    if not ref or not sel:
        return {}
    base_emis = float(ref.get("emissions", 0)) or 1.0
    pct_chg = (float(sel.get("emissions", 0)) - base_emis) / base_emis
    lr = base_lr * (1.0 + elasticity * pct_chg)
    loss_USDm = gwp_usdm * lr
    hothouse_loss = gwp_usdm * base_lr
    return {
        "lr": lr,
        "lr_pp_vs_base": (lr - base_lr) * 100.0,
        "loss_USDm": loss_USDm,
        "loss_swing_vs_hothouse_USDm": hothouse_loss - loss_USDm,
        "scenario": scenario,
        "elasticity": elasticity,
        "gwp_usdm": gwp_usdm,
    }


# --- rate limit + token budget (in-memory) --------------------------------
# Two layers, both keyed by user_id when present (falls back to IP for the
# rare unauthenticated path):
#   1. Request rate — N requests / 60s
#   2. Daily token budget — caps total LLM tokens (input + output) over 24h
# Both buckets evict expired entries lazily on each check. Process-local —
# resets on uvicorn restart, which is acceptable for the hackathon scope.

SCOPING_RATE_LIMIT_PER_MIN = 60
DAILY_TOKEN_BUDGET = 100_000  # per user / 24h
_DAY_SECONDS = 24 * 60 * 60

_BUCKET: dict[str, list[float]] = defaultdict(list)
_TOKEN_LOG: dict[str, list[tuple[float, int]]] = defaultdict(list)


def rate_limit_ok(
    key: str,
    screen: str | None = None,
) -> bool:
    """Check the per-key request rate. `key` is user_id when authenticated,
    IP otherwise. Scoping screen gets the higher 60/min cap; cedent/stress
    stay at 30/min."""
    cap = SCOPING_RATE_LIMIT_PER_MIN if screen == "scoping" else RATE_LIMIT_PER_MIN
    now = time.monotonic()
    hits = [t for t in _BUCKET[key] if now - t < 60.0]
    if len(hits) >= cap:
        _BUCKET[key] = hits
        return False
    hits.append(now)
    _BUCKET[key] = hits
    return True


def token_budget_ok(key: str) -> bool:
    """True iff the user has remaining daily token budget. Checked BEFORE the
    LLM call so a single oversize prompt doesn't exhaust the bucket on its own
    — the prompt itself counts via record_token_usage after the call."""
    now = time.monotonic()
    log = [(t, n) for (t, n) in _TOKEN_LOG[key] if now - t < _DAY_SECONDS]
    _TOKEN_LOG[key] = log
    used = sum(n for _, n in log)
    return used < DAILY_TOKEN_BUDGET


def record_token_usage(key: str, tokens: int) -> None:
    """Add a usage sample to the daily bucket. No-op for non-positive counts."""
    if tokens <= 0:
        return
    _TOKEN_LOG[key].append((time.monotonic(), int(tokens)))


def remaining_tokens(key: str) -> int:
    """Inspector helper — used by /healthz-style telemetry."""
    now = time.monotonic()
    log = [(t, n) for (t, n) in _TOKEN_LOG[key] if now - t < _DAY_SECONDS]
    _TOKEN_LOG[key] = log
    used = sum(n for _, n in log)
    return max(0, DAILY_TOKEN_BUDGET - used)


# --- prompts --------------------------------------------------------------

def _extraction_prompt(screen: str, current_state: dict[str, Any]) -> str:
    if screen == "cedent":
        return (
            "You are an underwriting assistant for a Hannover Re cedent screening tool. "
            "The user describes a Southeast-Asian reinsurance cedent in natural language. "
            "Call set_cedent_inputs with ONLY the fields they explicitly mentioned. Do not infer values. "
            f"Allowed countries: {', '.join(_ALLOWED_COUNTRIES)}. "
            f"Allowed sector keys for mix: {', '.join(_SECTORS)}. "
            f"Current state: {json.dumps(current_state)}."
        )
    return (
        "You are a stress-test assistant for a Hannover Re reinsurance portfolio. "
        "The user describes an NGFS scenario stress in natural language. "
        "Call set_stress_inputs with ONLY the fields they explicitly mentioned. Do not infer values. "
        f"Allowed NGFS scenarios: {', '.join(_ALLOWED_SCENARIOS)}. "
        "Elasticity range 0.30–1.20. "
        f"Current state: {json.dumps(current_state)}."
    )


def _narration_prompt(screen: str, message: str, updates: dict, model_output: dict | None) -> str:
    payload = {
        "user_request": message,
        "applied_updates": updates,
        "model_output": model_output,
        "screen": screen,
    }
    return (
        "Write a 2–3 sentence narration of how the applied updates change the underwriting view. "
        "Use ONLY numbers from the model_output JSON block; do NOT introduce numbers not present. "
        "Round to 1 decimal place. Speak in the second person to a reinsurance underwriter. "
        "Be concise and concrete. Output JSON {\"narration\": str}.\n\n"
        f"PAYLOAD:\n{json.dumps(payload, default=float, indent=2)}"
    )


# --- handler --------------------------------------------------------------

def _extract(req: AgentRequest) -> tuple[str, dict[str, Any], int]:
    client = _get_client()
    tool = SET_CEDENT_TOOL if req.screen == "cedent" else SET_STRESS_TOOL
    response = client.chat.completions.create(
        model=ILMU_MODEL,
        messages=[
            {"role": "system", "content": _extraction_prompt(req.screen, req.current_state)},
            {"role": "user", "content": req.message},
        ],
        tools=[tool],
        # ILMU nemo-nano does not honor tool_choice="required" reliably — it
        # thrashes to max_tokens with no tool_calls. Use "auto" + a system
        # prompt that hard-forces the call.
        tool_choice="auto",
        temperature=0.0,
        max_tokens=EXTRACTION_MAX_TOKENS,
    )
    tokens = int(getattr(getattr(response, "usage", None), "total_tokens", 0) or 0)
    msg = response.choices[0].message
    tool_calls = getattr(msg, "tool_calls", None) or []
    for tc in tool_calls:
        fn = getattr(tc, "function", None)
        if fn and getattr(fn, "name", None):
            args_raw = getattr(fn, "arguments", "") or "{}"
            try:
                args = json.loads(args_raw) if isinstance(args_raw, str) else dict(args_raw)
            except (TypeError, json.JSONDecodeError):
                args = {}
            return fn.name, args, tokens
    raise ValueError("no function call returned")


def _narrate_llm(prompt: str) -> tuple[str, int]:
    client = _get_client()
    response = client.chat.completions.create(
        model=ILMU_MODEL,
        messages=[
            {"role": "system", "content": (
                "You write tight underwriter prose. Numbers MUST come from the payload. "
                "Output JSON {\"narration\": str}."
            )},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=NARRATOR_MAX_TOKENS,
    )
    tokens = int(getattr(getattr(response, "usage", None), "total_tokens", 0) or 0)
    text = (response.choices[0].message.content or "").strip()
    parsed = json.loads(text)
    return str(parsed.get("narration") or "").strip(), tokens


def _narrate_template(updates: dict, model_output: dict | None, screen: str) -> str:
    if screen == "stress" and model_output:
        lr = float(model_output.get("lr", 0)) * 100
        loss = float(model_output.get("loss_USDm", 0))
        scenario = model_output.get("scenario") or updates.get("scenario") or "the chosen scenario"
        eps = float(model_output.get("elasticity", updates.get("elasticity", 0.7)))
        return (
            f"Under {scenario} at ε = {eps:.2f}, your loss ratio resolves to {lr:.1f}% "
            f"on a USD {loss:.0f} m expected loss. Re-priced relative to the Hot House baseline."
        )
    if screen == "cedent":
        keys = ", ".join(updates.keys()) or "no changes"
        return f"Applied {keys}. Composite tier and premium loading recompute on the form."
    return "Updates applied."


def _handle_scoping(req: AgentRequest) -> AgentResponse:
    """Phase 1 dispatch — keeps the cedent/stress two-stage path untouched."""
    from serve.scoping import handle_scoping
    from serve.supabase_client import get_client as get_supabase

    try:
        client = _get_client()
    except Exception as e:
        return AgentResponse(
            error=f"llm_init_failed: {str(e)[:160]}",
            session_id=req.session_id,
        )
    supabase = get_supabase()
    try:
        result = handle_scoping(req, supabase, client)
    except Exception as e:
        msg = str(e)[:200] or type(e).__name__
        return AgentResponse(
            error=f"scoping_failed: {msg}",
            session_id=req.session_id,
        )
    return AgentResponse(
        updates=result.get("updates") or {},
        narration=result.get("narration") or "",
        tool_called=result.get("tool_called"),
        error=result.get("error"),
        scoping_profile=result.get("scoping_profile"),
        complete=bool(result.get("complete", False)),
        session_id=result.get("session_id"),
    )


def handle_agent(req: AgentRequest) -> AgentResponse:
    if req.screen == "scoping":
        return _handle_scoping(req)
    bucket_key = req.user_id or "anon"
    try:
        tool_name, raw_args, extract_tokens = _extract(req)
        record_token_usage(bucket_key, extract_tokens)
    except Exception as e:
        msg = str(e)[:200] or type(e).__name__
        return AgentResponse(error=f"parse_failed: {msg}")

    try:
        updates = validate_updates(tool_name, raw_args, req.screen)
    except ValueError as e:
        return AgentResponse(tool_called=tool_name, error=str(e))

    model_output: dict[str, Any] | None = None
    if req.screen == "stress" and updates:
        merged = {**req.current_state, **updates}
        model_output = stress_compute(
            scenario=str(merged.get("scenario", "Current Policies")),
            elasticity=float(merged.get("elasticity", 0.7)),
            gwp_usdm=float(merged.get("gwp_usdm", 1200.0)),
        ) or None

    try:
        narration, narrate_tokens = _narrate_llm(
            _narration_prompt(req.screen, req.message, updates, model_output)
        )
        record_token_usage(bucket_key, narrate_tokens)
        if not narration:
            narration = _narrate_template(updates, model_output, req.screen)
    except Exception:
        narration = _narrate_template(updates, model_output, req.screen)

    return AgentResponse(
        updates=updates,
        narration=narration,
        model_output=model_output,
        tool_called=tool_name,
    )
