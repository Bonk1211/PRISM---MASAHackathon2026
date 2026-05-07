"""Phase 1 scoping consultant chat — ILMU (YTL AI Labs) backed.

Multi-turn variant of the agent.py two-stage pattern. Where cedent/stress are
single-shot ("user types one prompt → tool call → narration"), scoping is a
sustained interview: the LLM plays a senior climate-risk consultant who
incrementally pins down five axes of a Hannover Re cedent's exposure.

State model: ILMU is stateless. We hold the multi-turn transcript in
Supabase (`scoping_messages` keyed by session_id) and replay the full thread
on every request so the model sees what's already been asked. When session_id
is None (Supabase outage or first-load before sync), we degrade to a single-turn
stateless answer — the frontend's localStorage mirror keeps the UX going.

The five axes, in order:
    1. line_of_business — % mix across {property_cat, agriculture, life, casualty, specialty}
    2. geography — list of country/region tags (free-form short labels)
    3. time_horizon — {uw_years, life_years} — annual renewal vs. multi-year obligation
    4. frameworks — disclosure / capital frameworks the cedent reports under
    5. disclosures — what their public outputs look like

Tools (forced via tool_choice="required"):
    set_scoping_axis(axis, value, confidence)  — granular pin of a single axis
    set_scoping(...full)                        — emitted only when all 5 filled
    ask_followup(question, axis)               — explicit "still probing" marker

System prompt is engineered long on purpose so future prompt-cache support on
the ILMU side can amortise it across the ~20 LLM calls a five-axis interview
generates.
"""
from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field

# --- enums ----------------------------------------------------------------
LOB = Literal["property_cat", "agriculture", "life", "casualty", "specialty"]
Framework = Literal[
    "TCFD", "ISSB_S2", "Solvency_II_ORSA", "NAIC", "Internal_Capital", "Other"
]
Disclosure = Literal["TCFD", "ISSB_S2", "Regulatory_Stress_Test", "Internal_Only"]

_LOB_VALUES: tuple[str, ...] = (
    "property_cat", "agriculture", "life", "casualty", "specialty",
)
_FRAMEWORK_VALUES: tuple[str, ...] = (
    "TCFD", "ISSB_S2", "Solvency_II_ORSA", "NAIC", "Internal_Capital", "Other",
)
_DISCLOSURE_VALUES: tuple[str, ...] = (
    "TCFD", "ISSB_S2", "Regulatory_Stress_Test", "Internal_Only",
)

_AXES: tuple[str, ...] = (
    "line_of_business", "geography", "time_horizon", "frameworks", "disclosures",
)


# --- profile / state shapes ----------------------------------------------

class TimeHorizon(BaseModel):
    uw_years: int = Field(default=1, ge=1, le=50)
    life_years: int = Field(default=30, ge=1, le=50)


class ScopingProfile(BaseModel):
    """Five-axis interview output. All fields optional during the interview;
    `complete=True` only when the consultant has pinned every axis at
    confidence >= 0.7."""
    line_of_business: dict[str, float] = Field(
        default_factory=dict,
        description="LOB → percentage of book (0–100). Keys must be LOB enum values.",
    )
    geography: list[str] = Field(
        default_factory=list, max_length=24,
        description="Country / region tags. Free-form short labels, e.g. 'VN', 'PH', 'SEA'.",
    )
    time_horizon: TimeHorizon = Field(default_factory=TimeHorizon)
    frameworks: list[str] = Field(default_factory=list, max_length=8)
    disclosures: list[str] = Field(default_factory=list, max_length=8)
    confidence: dict[str, float] = Field(
        default_factory=dict,
        description="Per-axis 0–1 confidence captured by the consultant.",
    )
    complete: bool = False


# --- tool schemas (OpenAI function-calling format) ------------------------

SET_SCOPING_AXIS_TOOL = {
    "type": "function",
    "function": {
        "name": "set_scoping_axis",
        "description": (
            "Pin one axis of the cedent scoping profile after the user's last reply "
            "is informative enough. Call once per axis. Use confidence >= 0.7 only "
            "if the user has been concrete — vague hedges should be ~0.3–0.5."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "axis": {
                    "type": "string",
                    "description": "Which scoping axis is being pinned.",
                    "enum": list(_AXES),
                },
                "value": {
                    "type": "object",
                    "description": (
                        "Axis-specific payload. Shapes: "
                        "line_of_business → {property_cat:%, agriculture:%, life:%, casualty:%, specialty:%}; "
                        "geography → {tags:[...]}; "
                        "time_horizon → {uw_years:int, life_years:int}; "
                        "frameworks → {tags:[TCFD|ISSB_S2|Solvency_II_ORSA|NAIC|Internal_Capital|Other]}; "
                        "disclosures → {tags:[TCFD|ISSB_S2|Regulatory_Stress_Test|Internal_Only]}."
                    ),
                },
                "confidence": {
                    "type": "number",
                    "description": "0–1 — how confident the consultant is the answer is settled.",
                },
            },
            "required": ["axis", "value", "confidence"],
        },
    },
}

SET_SCOPING_TOOL = {
    "type": "function",
    "function": {
        "name": "set_scoping",
        "description": (
            "Emit ONLY when all five axes are settled (each pinned at confidence >= 0.7). "
            "This finalises the scoping profile and ends the interview."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "line_of_business": {
                    "type": "object",
                    "description": "Mix across the canonical LOB enum, percentages summing to ~100.",
                    "properties": {k: {"type": "number"} for k in _LOB_VALUES},
                },
                "geography": {
                    "type": "array", "items": {"type": "string"},
                    "description": "Country / region tags.",
                },
                "time_horizon": {
                    "type": "object",
                    "properties": {
                        "uw_years": {"type": "integer"},
                        "life_years": {"type": "integer"},
                    },
                },
                "frameworks": {
                    "type": "array",
                    "items": {"type": "string", "enum": list(_FRAMEWORK_VALUES)},
                },
                "disclosures": {
                    "type": "array",
                    "items": {"type": "string", "enum": list(_DISCLOSURE_VALUES)},
                },
            },
            "required": [
                "line_of_business", "geography", "time_horizon", "frameworks", "disclosures",
            ],
        },
    },
}

ASK_FOLLOWUP_TOOL = {
    "type": "function",
    "function": {
        "name": "ask_followup",
        "description": (
            "Use when the user's last reply is too vague to pin an axis. The consultant "
            "asks one focused follow-up question. The frontend renders the question to "
            "the user; the interview state is unchanged."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Single concrete question, ≤180 chars, no preamble.",
                },
                "axis": {
                    "type": "string",
                    "description": "Which axis the question is probing.",
                    "enum": list(_AXES),
                },
            },
            "required": ["question", "axis"],
        },
    },
}


# --- system prompt --------------------------------------------------------
#
# Tuned for ilmu-nemo-nano. Constraints learned the hard way:
#   - Stay under ~800 chars; longer prompts make the model thrash past
#     max_tokens without emitting any tool call.
#   - Always force a tool call. Plain-text replies are fallback-handled but
#     break the wizard flow; the prompt repeats this rule at top + bottom.
#   - Shape examples must use the EXACT enum casing the validator accepts
#     ("property_cat", "TCFD", "ISSB_S2"). Prose hints like "TCFD only" fail.

SYSTEM_PROMPT = """You are ILMU, a senior climate-risk consultant at Hannover Re APAC.
Mission: a 5-axis cedent intake. ONE axis per turn, in fixed order:
line_of_business → geography → time_horizon → frameworks → disclosures.

DECISION RULE
- Concrete answer with numbers / enum tags → set_scoping_axis @ confidence 0.9.
- Anything else (greeting, single keyword, hedged, off-topic) → ask_followup with
  ONE crisp question that ECHOES the user's keyword and demands the missing
  detail. ≤ 25 words. Always cite 1–2 example values.

EXAMPLES (do not deviate)
- user: "70% property cat, 20% agriculture, 10% specialty"
  → set_scoping_axis(line_of_business, {"property_cat":70,"agriculture":20,"specialty":10}, 0.9)
- user: "property"
  → ask_followup("Got property cat — what share of the book? e.g. 70 %, 90 %.", "line_of_business")
- user: "hi" / "whats up" / ""
  → ask_followup("Let's start with the book mix — what % is property cat, agriculture, life, casualty, specialty?", "line_of_business")
- user: "vietnam"
  → ask_followup("Got Vietnam — any other markets? e.g. Philippines, Indonesia.", "geography")
- user: "tcfd"
  → ask_followup("TCFD noted — anything else? e.g. ISSB_S2, Solvency_II_ORSA.", "frameworks")

PAYLOAD SHAPES (exact keys / enum casing)
- line_of_business → {"property_cat":70,"agriculture":20,"specialty":10}  (sums ≈100)
- geography        → {"tags":["Vietnam","Philippines","Indonesia"]}
- time_horizon     → {"uw_years":1,"life_years":30}
- frameworks       → {"tags":["TCFD","ISSB_S2"]}  enum: TCFD ISSB_S2 Solvency_II_ORSA NAIC Internal_Capital Other
- disclosures      → {"tags":["TCFD","ISSB_S2"]}  enum: TCFD ISSB_S2 Regulatory_Stress_Test Internal_Only

STYLE
- Warm, terse, plain English. ≤ 2 sentences of prose.
- Never re-list pinned axes — the server echoes captures back.
- Never repeat the same primer twice. If the user gave a partial answer, build
  on it ("Got X — what's the percentage?") rather than restarting.
- ALWAYS emit exactly ONE tool call. Never reply with prose only."""


# --- validation -----------------------------------------------------------

def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def validate_axis_value(axis: str, value: dict[str, Any]) -> dict[str, Any]:
    """Coerce / clamp a single-axis pin payload. Raises ValueError on
    structural problems (unknown axis, unknown enum tag), silently drops
    unrecognised dict keys to keep the interview resilient to model drift."""
    if axis == "line_of_business":
        mix: dict[str, float] = {}
        for k, v in (value or {}).items():
            if k in _LOB_VALUES and isinstance(v, (int, float)):
                mix[k] = _clamp(float(v), 0.0, 100.0)
        if not mix:
            raise ValueError("line_of_business: no valid LOB keys")
        return {"line_of_business": mix}

    if axis == "geography":
        tags = value.get("tags") if isinstance(value, dict) else value
        if isinstance(tags, str):
            tags = [tags]
        if not isinstance(tags, list):
            raise ValueError("geography: expected tags list")
        clean = [str(t).strip()[:48] for t in tags if str(t).strip()]
        if not clean:
            raise ValueError("geography: empty after cleanup")
        return {"geography": clean[:24]}

    if axis == "time_horizon":
        uw = int(value.get("uw_years", 1))
        life = int(value.get("life_years", 30))
        return {
            "time_horizon": {
                "uw_years": int(_clamp(uw, 1, 50)),
                "life_years": int(_clamp(life, 1, 50)),
            }
        }

    if axis == "frameworks":
        tags = value.get("tags") if isinstance(value, dict) else value
        if isinstance(tags, str):
            tags = [tags]
        if not isinstance(tags, list):
            raise ValueError("frameworks: expected tags list")
        clean = [t for t in tags if t in _FRAMEWORK_VALUES]
        if not clean:
            raise ValueError("frameworks: no valid enum tags")
        return {"frameworks": clean[:8]}

    if axis == "disclosures":
        tags = value.get("tags") if isinstance(value, dict) else value
        if isinstance(tags, str):
            tags = [tags]
        if not isinstance(tags, list):
            raise ValueError("disclosures: expected tags list")
        clean = [t for t in tags if t in _DISCLOSURE_VALUES]
        if not clean:
            raise ValueError("disclosures: no valid enum tags")
        return {"disclosures": clean[:8]}

    raise ValueError(f"unknown axis '{axis}'")


def validate_full_scoping(raw: dict[str, Any]) -> dict[str, Any]:
    """Coerce a set_scoping payload (final consolidated). Drops bad enum tags
    silently — the consultant has already verified, this is just defensive."""
    out: dict[str, Any] = {}
    lob = raw.get("line_of_business") or {}
    if isinstance(lob, dict):
        clean_lob = {
            k: _clamp(float(v), 0.0, 100.0)
            for k, v in lob.items()
            if k in _LOB_VALUES and isinstance(v, (int, float))
        }
        if clean_lob:
            out["line_of_business"] = clean_lob

    geo = raw.get("geography")
    if isinstance(geo, list):
        out["geography"] = [str(g).strip()[:48] for g in geo if str(g).strip()][:24]

    th = raw.get("time_horizon") or {}
    if isinstance(th, dict):
        out["time_horizon"] = {
            "uw_years": int(_clamp(int(th.get("uw_years", 1)), 1, 50)),
            "life_years": int(_clamp(int(th.get("life_years", 30)), 1, 50)),
        }

    fws = raw.get("frameworks") or []
    if isinstance(fws, list):
        out["frameworks"] = [t for t in fws if t in _FRAMEWORK_VALUES][:8]

    dscs = raw.get("disclosures") or []
    if isinstance(dscs, list):
        out["disclosures"] = [t for t in dscs if t in _DISCLOSURE_VALUES][:8]

    return out


# --- transcript / persistence --------------------------------------------

def load_transcript(supabase: Any, session_id: str) -> list[dict[str, Any]]:
    """Return ordered transcript rows for the session. Empty list on any
    Supabase failure — the caller proceeds in stateless mode."""
    if supabase is None or not session_id:
        return []
    try:
        resp = (
            supabase.table("scoping_messages")
            .select("role, content, tool_name, tool_args, created_at")
            .eq("session_id", session_id)
            .order("created_at")
            .limit(200)
            .execute()
        )
        return list(resp.data or [])
    except Exception:
        return []


def load_session(supabase: Any, session_id: str) -> dict[str, Any] | None:
    if supabase is None or not session_id:
        return None
    try:
        resp = (
            supabase.table("scoping_sessions")
            .select("id, complete, profile, client_label")
            .eq("id", session_id)
            .limit(1)
            .execute()
        )
        rows = list(resp.data or [])
        return rows[0] if rows else None
    except Exception:
        return None


def ensure_session(
    supabase: Any,
    session_id: str | None,
    user_id: str | None = None,
) -> str | None:
    """Insert a row in scoping_sessions if session_id is given but not yet
    present. Stamps user_id for per-user RLS ownership. Returns the
    session_id (caller-provided or new). None if Supabase unavailable, the
    insert failed, or no user_id was provided (RLS would reject)."""
    if supabase is None:
        return None
    # Anonymous-auth uid is required so the row is owned. Without it the
    # session would be orphaned and unreadable from the browser.
    if not user_id:
        return None
    try:
        if session_id:
            existing = load_session(supabase, session_id)
            if existing:
                return session_id
            supabase.table("scoping_sessions").insert(
                {
                    "id": session_id,
                    "user_id": user_id,
                    "complete": False,
                    "profile": {},
                }
            ).execute()
            return session_id
        resp = (
            supabase.table("scoping_sessions")
            .insert({"user_id": user_id, "complete": False, "profile": {}})
            .execute()
        )
        rows = list(resp.data or [])
        if rows and rows[0].get("id"):
            return str(rows[0]["id"])
    except Exception:
        return None
    return None


def append_message(
    supabase: Any,
    session_id: str | None,
    role: str,
    content: str | None,
    tool_name: str | None = None,
    tool_args: dict | None = None,
) -> None:
    if supabase is None or not session_id:
        return
    try:
        supabase.table("scoping_messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
            "tool_name": tool_name,
            "tool_args": tool_args,
        }).execute()
    except Exception:
        return


def upsert_profile(
    supabase: Any,
    session_id: str | None,
    profile: dict[str, Any],
    complete: bool,
) -> None:
    if supabase is None or not session_id:
        return
    try:
        supabase.table("scoping_sessions").update({
            "profile": profile,
            "complete": complete,
        }).eq("id", session_id).execute()
    except Exception:
        return


# --- profile merging ------------------------------------------------------

def merge_axis_into_profile(
    current: dict[str, Any],
    axis: str,
    value_payload: dict[str, Any],
    confidence: float,
) -> dict[str, Any]:
    """Pure: returns a new profile dict with one axis updated and confidence
    map merged. Keeps existing axes untouched."""
    out = dict(current or {})
    out.update(value_payload)
    confidences = dict(out.get("confidence") or {})
    confidences[axis] = float(_clamp(confidence, 0.0, 1.0))
    out["confidence"] = confidences
    out["complete"] = is_profile_complete(out)
    return out


def merge_full_into_profile(
    current: dict[str, Any], full: dict[str, Any]
) -> dict[str, Any]:
    out = dict(current or {})
    out.update(full)
    confidences = dict(out.get("confidence") or {})
    for axis in _AXES:
        if axis in full:
            confidences[axis] = max(float(confidences.get(axis, 0.0)), 0.9)
    out["confidence"] = confidences
    out["complete"] = is_profile_complete(out)
    return out


def is_profile_complete(profile: dict[str, Any]) -> bool:
    """All five axes must be present AND all per-axis confidences >= 0.7."""
    confidences = profile.get("confidence") or {}
    for axis in _AXES:
        if axis not in profile:
            return False
        if float(confidences.get(axis, 0.0)) < 0.7:
            return False
    return True


# --- per-axis explanation builder ----------------------------------------
# When the model emits a tool call without prose narration (frequent on
# nemo-nano which prefers terse tool-only responses), we synthesize a brief
# "captured + why + next question" reply so the user understands what just
# happened and what's being asked next. Templated to keep server-side and
# avoid an extra LLM round-trip.

# Server-side narration helpers. Not seen by the LLM — used to write the
# "Captured X. Next: Y?" assistant message after a successful tool call.
_NEXT_AXIS_QUESTION: dict[str, str] = {
    "line_of_business": "What's the book mix by line — e.g. 70 % property cat, 20 % agriculture, 10 % specialty?",
    "geography":        "Which markets is the book written in — Vietnam, Philippines, Indonesia, …?",
    "time_horizon":     "What horizons matter — typical underwriting year and the liability tail?",
    "frameworks":       "Which capital / disclosure frameworks apply — TCFD, ISSB_S2, Solvency_II_ORSA, NAIC?",
    "disclosures":      "What's actually published — TCFD, ISSB_S2, regulatory stress test, or internal only?",
}

# Partial-answer probes — fired only when the model returned no tool and the
# user's last message contains a recognised keyword for the current axis. These
# questions ALWAYS differ from the generic axis primer above, so the chat
# never looks like it's looping the same prompt.
_PARTIAL_FOLLOWUP_LOB: tuple[tuple[tuple[str, ...], str], ...] = (
    (("property", "cat"),
     "Got property cat — what share of the book? e.g. 70 %, 90 %, or a split with another line."),
    (("agri",),
     "Got agriculture — what % of the book? Pair it with other lines (e.g. 30 % agri, 60 % property cat, 10 % specialty)."),
    (("life",),
     "Got life — what % of the book? Pair it with non-life lines (e.g. 60 % life, 30 % casualty, 10 % specialty)."),
    (("casualty", "liability"),
     "Got casualty — what % of the book? Pair it with the other lines (property cat, agriculture, life, specialty)."),
    (("specialty",),
     "Got specialty — what % of the book? Pair it with the other lines (property cat, agriculture, life, casualty)."),
)

_PARTIAL_FOLLOWUP_GEO = (
    "I need country tags — pick a few SEA markets (Vietnam, Philippines, Indonesia, Thailand, Malaysia, Singapore)."
)

_PARTIAL_FOLLOWUP_TIME = (
    "Give me two integers — underwriting year and liability tail. e.g. '1-year underwriting, 30-year tail'."
)

_PARTIAL_FOLLOWUP_FW = (
    "Pick from the canonical enum: TCFD, ISSB_S2, Solvency_II_ORSA, NAIC, Internal_Capital, Other."
)

_PARTIAL_FOLLOWUP_DISC = (
    "Pick from the canonical enum: TCFD, ISSB_S2, Regulatory_Stress_Test, Internal_Only."
)


def _smart_fallback_question(user_message: str, next_axis: str) -> str | None:
    """Return a context-aware probe based on tokens found in the user reply.

    Used only by the no-tool fallback path. Returns None when the message
    has no recognisable axis keyword — the caller then drops to the generic
    next-axis primer.
    """
    msg = user_message.lower().strip()
    if not msg:
        return None
    if next_axis == "line_of_business":
        for tokens, question in _PARTIAL_FOLLOWUP_LOB:
            if any(tok in msg for tok in tokens):
                return question
        # Greeting / off-topic short messages → nudge with one example.
        if len(msg) <= 12:
            return (
                "Tell me the book mix — pick the lines (property cat / agriculture / life / casualty / specialty) "
                "and rough percentages. e.g. '70 % property cat, 20 % agriculture, 10 % specialty'."
            )
    if next_axis == "geography":
        return _PARTIAL_FOLLOWUP_GEO
    if next_axis == "time_horizon":
        return _PARTIAL_FOLLOWUP_TIME
    if next_axis == "frameworks":
        return _PARTIAL_FOLLOWUP_FW
    if next_axis == "disclosures":
        return _PARTIAL_FOLLOWUP_DISC
    return None


def _explain_pin(
    axis: str,
    cleaned: dict[str, Any],
    profile_after: dict[str, Any],
) -> str:
    """Echo the captured value + one-line context + next-axis question.

    Pure function — no LLM call. Keeps the demo tight and predictable.
    """
    # Format the captured value nicely.
    if axis == "line_of_business":
        mix = cleaned.get("line_of_business") or {}
        parts = [f"{int(round(v))}% {k.replace('_', ' ')}" for k, v in mix.items() if v > 0]
        captured = ", ".join(parts) or "your line of business"
        why = (
            "property cat dominates → primary exposure is acute physical risk (windstorm, flood, EQ)"
            if mix.get("property_cat", 0) >= 50
            else "casualty/life exposure shifts the calibration toward transition + liability risk"
            if (mix.get("life", 0) + mix.get("casualty", 0)) >= 50
            else "diversified — climate exposure spans physical and transition channels"
        )
    elif axis == "geography":
        geo = cleaned.get("geography") or []
        captured = ", ".join(geo) if geo else "your geography"
        why = (
            "all in PRISM's SEA calibration window — model accuracy strongest here"
            if all(any(s in g for s in ("Viet", "Philip", "Indo", "Thai", "Malay", "Singap", "Cambo", "Lao", "Myan", "Brun", "VN", "PH", "ID", "TH", "MY", "SG", "KH", "LA", "MM", "BN")) for g in geo)
            else "noting any non-SEA exposure — model calibration may be weaker outside that footprint"
        )
    elif axis == "time_horizon":
        th = cleaned.get("time_horizon") or {}
        uw = th.get("uw_years", 1)
        life = th.get("life_years", 30)
        captured = f"{uw}-year underwriting / {life}-year liability tail"
        why = (
            "annual UW for cat treaties; 30-year horizon aligns with Solvency II transition-scenario propagation"
            if uw <= 1 and life >= 25
            else "multi-year UW and shorter tail — pricing locks in multi-period climate paths"
        )
    elif axis == "frameworks":
        fws = cleaned.get("frameworks") or []
        captured = ", ".join(fws) if fws else "your frameworks"
        why_parts = []
        if "TCFD" in fws:
            why_parts.append("TCFD = legacy climate disclosure")
        if "ISSB_S2" in fws:
            why_parts.append("ISSB_S2 = the active TCFD successor")
        if "Solvency_II_ORSA" in fws:
            why_parts.append("Solvency II ORSA = scenario-driven capital requirement")
        if "NAIC" in fws:
            why_parts.append("NAIC = US insurance commissioner regime")
        if "Internal_Capital" in fws:
            why_parts.append("internal capital = proprietary model")
        why = "; ".join(why_parts) or "noted"
    elif axis == "disclosures":
        ds = cleaned.get("disclosures") or []
        captured = ", ".join(ds) if ds else "your disclosures"
        why = (
            "public-disclosing cedent → Phase 6 deliverable will follow TCFD/ISSB template"
            if any(d in ds for d in ("TCFD", "ISSB_S2"))
            else "regulator-only disclosure → Phase 6 leans on internal capital memo format"
            if "Regulatory_Stress_Test" in ds
            else "Internal_Only → minimal public surface; Phase 6 emphasises private board memo"
        )
    else:
        captured = axis.replace("_", " ")
        why = ""

    # Next-axis question.
    next_axis = next((a for a in _AXES if a not in profile_after), None)
    if next_axis is None:
        tail = f" {why}." if why else ""
        return (
            f"Got it — {captured}.{tail} "
            "All five axes pinned. I'll propose the risk taxonomy in the next bubble."
        )
    next_q = _NEXT_AXIS_QUESTION.get(next_axis, f"What about {next_axis.replace('_', ' ')}?")
    tail = f" {why}." if why else ""
    return f"Got it — {captured}.{tail} {next_q}"


# --- ILMU call ------------------------------------------------------------

def _transcript_to_messages(transcript: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Convert stored transcript rows into OpenAI-compatible messages.
    Tool calls / results are flattened into prose because we re-inject the
    profile via the system prompt anyway — no need for full function-call
    fidelity in replay."""
    messages: list[dict[str, Any]] = []
    for row in transcript:
        role = row.get("role") or "user"
        text = (row.get("content") or "").strip()
        if not text and row.get("tool_name"):
            args = row.get("tool_args") or {}
            text = f"[tool {row['tool_name']} called with {json.dumps(args, default=str)}]"
        if not text:
            continue
        # Map our 'tool' role to 'assistant' so the SDK accepts the messages.
        out_role = "user" if role == "user" else "assistant"
        messages.append({"role": out_role, "content": text})
    return messages


def _profile_for_prompt(profile: dict[str, Any]) -> str:
    """Compact summary of pinned axes for the system prompt suffix."""
    if not profile:
        return "(no axes pinned yet)"
    confidences = profile.get("confidence") or {}
    lines = []
    for axis in _AXES:
        if axis in profile:
            conf = float(confidences.get(axis, 0.0))
            lines.append(f"  - {axis}: {json.dumps(profile[axis], default=str)} [confidence={conf:.2f}]")
        else:
            lines.append(f"  - {axis}: <unset>")
    return "\n".join(lines)


def call_consultant(
    client: Any,
    user_message: str,
    transcript: list[dict[str, Any]],
    profile: dict[str, Any],
    model: str = "ilmu-nemo-nano",
) -> tuple[str | None, dict[str, Any], str, int]:
    """One ILMU turn. Returns (tool_name, tool_args, narration, tokens).

    `narration` is filled only when the model emits prose alongside the tool
    call. `tokens` is total_tokens from the response usage object — used by
    the per-user daily token budget bucket.
    """
    # Keep messages SHORT — nemo-nano thrashes past max_tokens when the
    # context grows. Skip transcript replay; the pinned-axes summary in the
    # system message is sufficient memory because the model's only job is to
    # decide whether the latest user message pins an axis.
    pinned_summary = ", ".join(a for a in _AXES if a in profile) or "none"
    next_axis = next((a for a in _AXES if a not in profile), "disclosures")
    system_with_state = (
        f"{SYSTEM_PROMPT} Already pinned: {pinned_summary}. "
        f"Next axis to probe: {next_axis}."
    )
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_with_state},
        {"role": "user", "content": user_message},
    ]

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        # set_scoping omitted — server auto-marks complete=True via
        # is_profile_complete() once all five axes pin. Two tools keeps
        # nemo-nano's tool selection reliable; with three tools it thrashes
        # past max_tokens without emitting any call.
        tools=[SET_SCOPING_AXIS_TOOL, ASK_FOLLOWUP_TOOL],
        # ILMU nemo-nano does not honor tool_choice="required" reliably.
        # The system prompt hard-forces the tool call instead.
        tool_choice="auto",
        temperature=0.0,
        max_tokens=600,
    )

    tokens = int(getattr(getattr(response, "usage", None), "total_tokens", 0) or 0)
    msg = response.choices[0].message
    narration = (getattr(msg, "content", None) or "").strip()
    tool_calls = getattr(msg, "tool_calls", None) or []
    tool_name: str | None = None
    tool_args: dict[str, Any] = {}
    for tc in tool_calls:
        fn = getattr(tc, "function", None)
        if fn and getattr(fn, "name", None):
            args_raw = getattr(fn, "arguments", "") or "{}"
            try:
                tool_args = json.loads(args_raw) if isinstance(args_raw, str) else dict(args_raw)
            except (TypeError, json.JSONDecodeError):
                tool_args = {}
            tool_name = fn.name
            break
    return tool_name, tool_args, narration, tokens


# --- handler --------------------------------------------------------------

def handle_scoping(
    req: Any,  # AgentRequest — Any-typed to avoid circular import with agent.py
    supabase: Any,
    client: Any,
) -> dict[str, Any]:
    """Run one scoping turn.

    Args injected (not module-level imports) so the test harness can stub
    out the ILMU client and Supabase without monkeypatching globals.

    Returns a dict suitable for AgentResponse(**...) — keys: updates,
    narration, scoping_profile, complete, tool_called, error, session_id.
    """
    user_message = (req.message or "").strip()
    if not user_message:
        return {
            "error": "empty_message",
            "narration": "",
            "tool_called": None,
            "scoping_profile": {},
            "complete": False,
            "session_id": req.session_id,
        }

    # Persistence is best-effort. session_id may be None (fallback mode).
    # user_id required for per-user RLS — without it ensure_session returns
    # None and the turn runs stateless (no Supabase writes).
    user_id = getattr(req, "user_id", None)
    sid = ensure_session(supabase, req.session_id, user_id)
    transcript = load_transcript(supabase, sid) if sid else []
    session_row = load_session(supabase, sid) if sid else None
    profile: dict[str, Any] = (session_row or {}).get("profile") or {}

    # Persist user turn before the LLM call so even an LLM error leaves a
    # complete transcript on disk.
    append_message(supabase, sid, "user", user_message)

    try:
        tool_name, tool_args, narration, llm_tokens = call_consultant(
            client, user_message, transcript, profile,
        )
        # Record token usage against the user budget. Best-effort; failure
        # to import (e.g., circular) just skips telemetry.
        try:
            from backend.agent import record_token_usage
            record_token_usage(user_id or "anon", llm_tokens)
        except Exception:
            pass
    except Exception as exc:
        msg = str(exc)[:200] or type(exc).__name__
        return {
            "error": f"llm_failed: {msg}",
            "narration": "",
            "tool_called": None,
            "scoping_profile": profile,
            "complete": bool(profile.get("complete", False)),
            "session_id": sid,
        }

    if not tool_name:
        # ILMU nemo-nano with tool_choice="auto" sometimes emits prose
        # without calling a tool, or returns nothing. Either way, never
        # dead-end the interview. Picking a fallback question, in priority:
        #   1. Model narration (if it gave any prose).
        #   2. Smart partial-answer probe — keyed off the user's last message.
        #   3. Generic axis primer.
        # Step 2 is what stops "user typed 'property' → bot re-asks the same
        # opening primer" loops.
        next_axis = next((a for a in _AXES if a not in profile), "line_of_business")
        smart = _smart_fallback_question(user_message, next_axis)
        primer = _NEXT_AXIS_QUESTION.get(next_axis, "")
        if narration.strip():
            fallback_question = narration.strip()[:240]
        elif smart:
            fallback_question = smart
        else:
            fallback_question = (
                primer or f"Tell me about your {next_axis.replace('_', ' ')} — a concrete answer helps me pin this axis."
            )
        tool_name = "ask_followup"
        tool_args = {"question": fallback_question, "axis": next_axis}
        updates = {"axis": next_axis, "question": fallback_question}
        append_message(
            supabase, sid, "assistant", fallback_question,
            tool_name=tool_name, tool_args=tool_args,
        )
        return {
            "updates": updates,
            "narration": fallback_question,
            "tool_called": tool_name,
            "scoping_profile": profile,
            "complete": bool(profile.get("complete", False)),
            "session_id": sid,
            "error": None,
        }

    updates: dict[str, Any] = {}
    user_facing = narration

    try:
        if tool_name == "set_scoping_axis":
            axis = str(tool_args.get("axis", ""))
            value = tool_args.get("value") or {}
            confidence = float(tool_args.get("confidence", 0.0))
            cleaned = validate_axis_value(axis, value if isinstance(value, dict) else {"tags": value})
            profile = merge_axis_into_profile(profile, axis, cleaned, confidence)
            updates = {**cleaned, "axis": axis, "confidence": confidence}
            if not user_facing:
                user_facing = _explain_pin(axis, cleaned, profile)
        elif tool_name == "set_scoping":
            cleaned_full = validate_full_scoping(tool_args)
            profile = merge_full_into_profile(profile, cleaned_full)
            updates = cleaned_full
            if not user_facing:
                user_facing = "Scoping complete — five axes pinned."
        elif tool_name == "ask_followup":
            question = str(tool_args.get("question") or "").strip()[:240]
            axis = str(tool_args.get("axis") or "")
            updates = {"axis": axis, "question": question}
            user_facing = question or user_facing
        else:
            return {
                "error": f"unknown_tool: {tool_name}",
                "narration": narration,
                "tool_called": tool_name,
                "scoping_profile": profile,
                "complete": bool(profile.get("complete", False)),
                "session_id": sid,
            }
    except ValueError as ve:
        append_message(
            supabase, sid, "tool", str(ve),
            tool_name=tool_name, tool_args=tool_args,
        )
        return {
            "error": str(ve),
            "narration": narration,
            "tool_called": tool_name,
            "scoping_profile": profile,
            "complete": bool(profile.get("complete", False)),
            "session_id": sid,
        }

    append_message(
        supabase, sid, "assistant", user_facing,
        tool_name=tool_name, tool_args=tool_args,
    )
    upsert_profile(supabase, sid, profile, bool(profile.get("complete", False)))

    return {
        "updates": updates,
        "narration": user_facing,
        "tool_called": tool_name,
        "scoping_profile": profile,
        "complete": bool(profile.get("complete", False)),
        "session_id": sid,
        "error": None,
    }
