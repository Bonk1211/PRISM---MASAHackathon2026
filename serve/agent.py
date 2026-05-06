"""R-Ignite agent endpoint — Gemini Flash NL parser + result narrator.

User types free-form prose on the Cedent or Stress screen. Two-turn pattern:
  1. Forced tool-call extraction (T=0) → set_cedent_inputs / set_stress_inputs.
  2. JSON narration (T=0.2, ≤300 tok) over the precomputed numbers; templated
     fallback if the call raises.

The LLM never invents pipeline numbers. For Stress, the server replicates the
exact formula in app/src/screens/Stress.tsx (reads STRESS_2030 aggregate from
key_numbers_python.json) so narration matches the on-screen StatBig values.
For Cedent, no compute step — the React tier helpers in app/src/data/cedent.ts
re-derive the composite once the form state changes.
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

GEMINI_MODEL = "gemini-2.5-flash"
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

# Lazy SDK import — server stays bootable when google-genai not yet installed.
_GENAI_CLIENT: Any = None
_GENAI_TYPES: Any = None


def _get_client() -> tuple[Any, Any]:
    global _GENAI_CLIENT, _GENAI_TYPES
    if _GENAI_CLIENT is None:
        from google import genai
        from google.genai import types
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY missing — set in serve/.env")
        _GENAI_CLIENT = genai.Client(api_key=api_key)
        _GENAI_TYPES = types
    return _GENAI_CLIENT, _GENAI_TYPES


# --- request / response models --------------------------------------------

class AgentRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    screen: Literal["cedent", "stress"]
    current_state: dict[str, Any] = Field(default_factory=dict, max_length=20)


class AgentResponse(BaseModel):
    updates: dict[str, Any] = Field(default_factory=dict)
    narration: str = ""
    model_output: dict[str, Any] | None = None
    tool_called: str | None = None
    error: str | None = None


# --- tool schemas (dict-style; google-genai accepts either Schema or dict) ---

SET_CEDENT = {
    "name": "set_cedent_inputs",
    "description": (
        "Update Cedent screen sliders for one Southeast-Asian reinsurance cedent. "
        "Provide ONLY the fields the user explicitly mentioned; omitted fields stay unchanged."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "country": {
                "type": "STRING",
                "description": "Cedent country of domicile.",
                "enum": list(_ALLOWED_COUNTRIES),
            },
            "mix": {
                "type": "OBJECT",
                "description": (
                    "Sector → percentage of GWP book (0–100). Keys MUST be from the canonical "
                    "sector list. Partial updates supported — frontend re-normalises."
                ),
                "properties": {s: {"type": "NUMBER"} for s in _SECTORS},
            },
            "ndc_plan_filed": {
                "type": "BOOLEAN",
                "description": "True if cedent has filed a credible NDC-aligned transition plan.",
            },
            "energy_mix_pct": {
                "type": "NUMBER",
                "description": "Coal % + 0.5 × Gas % override (0–100). ≥50 forces sector tier ≥ C.",
            },
        },
    },
}

SET_STRESS = {
    "name": "set_stress_inputs",
    "description": (
        "Update Stress screen NGFS scenario, loss-ratio elasticity, or notional GWP."
    ),
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "scenario": {
                "type": "STRING",
                "description": "NGFS Phase V scenario.",
                "enum": list(_ALLOWED_SCENARIOS),
            },
            "elasticity": {
                "type": "NUMBER",
                "description": "Loss-ratio elasticity 0.30–1.20 (Sigma 1/2024 base = 0.70).",
            },
            "gwp_usdm": {
                "type": "NUMBER",
                "description": "Gross written premium in USD millions (default 1200).",
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


# --- rate limit (per-IP, in-memory) ---------------------------------------

_BUCKET: dict[str, list[float]] = defaultdict(list)


def rate_limit_ok(ip: str) -> bool:
    now = time.monotonic()
    hits = [t for t in _BUCKET[ip] if now - t < 60.0]
    if len(hits) >= RATE_LIMIT_PER_MIN:
        _BUCKET[ip] = hits
        return False
    hits.append(now)
    _BUCKET[ip] = hits
    return True


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

def _extract(req: AgentRequest) -> tuple[str, dict[str, Any]]:
    client, types = _get_client()
    schema = SET_CEDENT if req.screen == "cedent" else SET_STRESS
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=req.message,
        config=types.GenerateContentConfig(
            system_instruction=_extraction_prompt(req.screen, req.current_state),
            tools=[types.Tool(function_declarations=[schema])],
            tool_config=types.ToolConfig(
                function_calling_config=types.FunctionCallingConfig(mode="ANY"),
            ),
            temperature=0.0,
            max_output_tokens=EXTRACTION_MAX_TOKENS,
        ),
    )
    cand = response.candidates[0] if getattr(response, "candidates", None) else None
    parts = (cand.content.parts if cand and cand.content else []) or []
    for p in parts:
        fc = getattr(p, "function_call", None)
        if fc and getattr(fc, "name", None):
            args = dict(fc.args) if fc.args else {}
            return fc.name, args
    raise ValueError("no function call returned")


def _narrate_llm(prompt: str) -> str:
    client, types = _get_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You write tight underwriter prose. Numbers MUST come from the payload. "
                "Output JSON {\"narration\": str}."
            ),
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=NARRATOR_MAX_TOKENS,
        ),
    )
    text = (getattr(response, "text", "") or "").strip()
    parsed = json.loads(text)
    return str(parsed.get("narration") or "").strip()


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


def handle_agent(req: AgentRequest) -> AgentResponse:
    try:
        tool_name, raw_args = _extract(req)
    except Exception as e:
        return AgentResponse(error=f"parse_failed:{type(e).__name__}")

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
        narration = _narrate_llm(_narration_prompt(req.screen, req.message, updates, model_output))
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
