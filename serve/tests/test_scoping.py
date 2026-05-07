"""Phase 1 scoping tests — ILMU + Supabase fully mocked.

Covers:
  - axis-value validation (clamping, bad enums, structural errors)
  - profile-merging math (single axis pin, full set_scoping)
  - completeness rule (all 5 axes pinned at confidence ≥ 0.7)
  - handle_scoping happy path: simulated 5-axis interview reaches complete=True
  - stateless mode (session_id=None) still answers without persistence
  - dispatch via handle_agent when screen=="scoping"
  - AgentRequest Literal extension
"""
from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

import pytest

from serve.agent import AgentRequest, handle_agent
from serve.scoping import (
    handle_scoping,
    is_profile_complete,
    merge_axis_into_profile,
    merge_full_into_profile,
    validate_axis_value,
    validate_full_scoping,
)


# --- AgentRequest Literal extension ---------------------------------------

def test_agent_request_accepts_scoping_screen():
    req = AgentRequest(message="hi", screen="scoping")
    assert req.screen == "scoping"
    assert req.session_id is None
    assert req.current_state == {}


def test_agent_request_session_id_optional():
    req = AgentRequest(message="hi", screen="scoping", session_id="abc-123")
    assert req.session_id == "abc-123"


def test_agent_request_rejects_unknown_screen():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        AgentRequest(message="hi", screen="something_else")


# --- validate_axis_value --------------------------------------------------

def test_validate_lob_clamps_and_drops_unknown():
    out = validate_axis_value("line_of_business", {
        "property_cat": 200, "agriculture": -5, "bogus": 99,
    })
    assert out == {"line_of_business": {"property_cat": 100.0, "agriculture": 0.0}}


def test_validate_lob_no_keys_raises():
    with pytest.raises(ValueError, match="no valid LOB"):
        validate_axis_value("line_of_business", {"bogus": 50})


def test_validate_geography_accepts_list_or_tags_dict():
    a = validate_axis_value("geography", {"tags": ["VN", "PH"]})
    b = validate_axis_value("geography", ["VN", "PH"])
    assert a == b == {"geography": ["VN", "PH"]}


def test_validate_geography_empty_raises():
    with pytest.raises(ValueError, match="empty"):
        validate_axis_value("geography", {"tags": ["", "  "]})


def test_validate_time_horizon_clamps():
    out = validate_axis_value("time_horizon", {"uw_years": 100, "life_years": 0})
    assert out["time_horizon"]["uw_years"] == 50
    assert out["time_horizon"]["life_years"] == 1


def test_validate_frameworks_drops_bad_enum():
    out = validate_axis_value("frameworks", ["TCFD", "BogusFramework", "ISSB_S2"])
    assert out == {"frameworks": ["TCFD", "ISSB_S2"]}


def test_validate_frameworks_all_bad_raises():
    with pytest.raises(ValueError, match="no valid enum"):
        validate_axis_value("frameworks", ["Bogus", "Foo"])


def test_validate_disclosures_accepts_canonical():
    out = validate_axis_value("disclosures", ["Internal_Only"])
    assert out == {"disclosures": ["Internal_Only"]}


def test_validate_unknown_axis_raises():
    with pytest.raises(ValueError, match="unknown axis"):
        validate_axis_value("not_an_axis", {})


# --- merge / completeness -------------------------------------------------

def test_merge_axis_into_empty_profile():
    p = merge_axis_into_profile({}, "geography", {"geography": ["VN"]}, 0.9)
    assert p["geography"] == ["VN"]
    assert p["confidence"]["geography"] == 0.9
    assert p["complete"] is False  # only 1 axis pinned


def test_merge_axis_clamps_confidence_to_unit_interval():
    p = merge_axis_into_profile({}, "geography", {"geography": ["VN"]}, 1.5)
    assert p["confidence"]["geography"] == 1.0
    p2 = merge_axis_into_profile({}, "geography", {"geography": ["VN"]}, -0.3)
    assert p2["confidence"]["geography"] == 0.0


def test_merge_full_marks_high_confidence():
    p = merge_full_into_profile({}, {
        "line_of_business": {"property_cat": 60.0, "agriculture": 40.0},
        "geography": ["VN"],
        "time_horizon": {"uw_years": 1, "life_years": 30},
        "frameworks": ["TCFD"],
        "disclosures": ["TCFD"],
    })
    assert p["complete"] is True
    for axis in ("line_of_business", "geography", "time_horizon", "frameworks", "disclosures"):
        assert p["confidence"][axis] >= 0.9


def test_is_profile_complete_requires_all_five():
    p = {
        "line_of_business": {"property_cat": 100.0},
        "geography": ["VN"],
        "time_horizon": {"uw_years": 1, "life_years": 30},
        "frameworks": ["TCFD"],
        "confidence": {
            "line_of_business": 0.9, "geography": 0.9,
            "time_horizon": 0.9, "frameworks": 0.9,
        },
    }
    assert is_profile_complete(p) is False  # disclosures missing
    p["disclosures"] = ["TCFD"]
    p["confidence"]["disclosures"] = 0.9
    assert is_profile_complete(p) is True


def test_is_profile_complete_rejects_low_confidence():
    p = {
        axis: ["x"] for axis in
        ("line_of_business", "geography", "time_horizon", "frameworks", "disclosures")
    }
    p["confidence"] = {a: 0.5 for a in p}
    assert is_profile_complete(p) is False


# --- validate_full_scoping ------------------------------------------------

def test_validate_full_drops_bad_enum_tags():
    out = validate_full_scoping({
        "line_of_business": {"property_cat": 80, "specialty": 20, "bogus": 5},
        "geography": ["VN", "PH"],
        "time_horizon": {"uw_years": 1, "life_years": 30},
        "frameworks": ["TCFD", "Bogus"],
        "disclosures": ["TCFD"],
    })
    assert "bogus" not in out["line_of_business"]
    assert out["frameworks"] == ["TCFD"]


# --- handle_scoping integration (ILMU + Supabase mocked) ------------------

def _fake_tool_call_response(name: str, args: dict, content: str = ""):
    """Build an OpenAI-shaped chat completion response with one tool call."""
    fn = SimpleNamespace(name=name, arguments=json.dumps(args))
    tc = SimpleNamespace(function=fn, id="call-1", type="function")
    msg = SimpleNamespace(content=content or None, tool_calls=[tc])
    choice = SimpleNamespace(message=msg, finish_reason="tool_calls")
    return SimpleNamespace(choices=[choice])


class _FakeOpenAIClient:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(
            completions=SimpleNamespace(create=self._create)
        )

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


def _make_req(message: str, session_id: str | None = None) -> AgentRequest:
    return AgentRequest(message=message, screen="scoping", session_id=session_id)


def test_handle_scoping_stateless_pins_one_axis():
    """No session_id, no Supabase — model still pins an axis and returns profile."""
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("set_scoping_axis", {
            "axis": "line_of_business",
            "value": {"property_cat": 70, "agriculture": 30},
            "confidence": 0.85,
        }),
    ])
    out = handle_scoping(
        _make_req("70% cat, 30% agri"),
        supabase=None,
        client=fake_client,
    )
    assert out["error"] is None
    assert out["tool_called"] == "set_scoping_axis"
    assert out["scoping_profile"]["line_of_business"] == {
        "property_cat": 70.0, "agriculture": 30.0,
    }
    assert out["scoping_profile"]["confidence"]["line_of_business"] == 0.85
    assert out["complete"] is False
    assert out["session_id"] is None


def test_handle_scoping_followup_when_vague():
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("ask_followup", {
            "question": "What share of premium is property cat versus specialty?",
            "axis": "line_of_business",
        }),
    ])
    out = handle_scoping(
        _make_req("we write a bit of everything"),
        supabase=None,
        client=fake_client,
    )
    assert out["tool_called"] == "ask_followup"
    assert "property cat" in out["narration"]
    assert out["complete"] is False


def test_handle_scoping_set_scoping_marks_complete():
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("set_scoping", {
            "line_of_business": {"property_cat": 60.0, "specialty": 40.0},
            "geography": ["VN", "PH"],
            "time_horizon": {"uw_years": 1, "life_years": 30},
            "frameworks": ["TCFD", "ISSB_S2"],
            "disclosures": ["TCFD"],
        }),
    ])
    out = handle_scoping(
        _make_req("here's everything in one go"),
        supabase=None,
        client=fake_client,
    )
    assert out["tool_called"] == "set_scoping"
    assert out["complete"] is True
    p = out["scoping_profile"]
    assert p["geography"] == ["VN", "PH"]
    assert p["frameworks"] == ["TCFD", "ISSB_S2"]


def test_handle_scoping_invalid_axis_payload_returns_error_not_crash():
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("set_scoping_axis", {
            "axis": "frameworks",
            "value": {"tags": ["NotAFramework"]},
            "confidence": 0.9,
        }),
    ])
    out = handle_scoping(
        _make_req("we use NotAFramework"),
        supabase=None,
        client=fake_client,
    )
    assert out["error"] is not None
    assert "no valid enum" in out["error"]
    assert out["complete"] is False


def test_handle_scoping_llm_failure_returns_error():
    class _Boom:
        def __init__(self):
            self.chat = SimpleNamespace(
                completions=SimpleNamespace(create=self._create)
            )
        def _create(self, **kw):
            raise RuntimeError("network down")
    out = handle_scoping(
        _make_req("hi"),
        supabase=None,
        client=_Boom(),
    )
    assert out["error"].startswith("llm_failed")
    assert out["complete"] is False


def test_handle_scoping_empty_message_short_circuits():
    # Pydantic forbids empty message at construction — bypass via direct mutation
    # to verify the handler's defence-in-depth check.
    req = AgentRequest(message="hi", screen="scoping")
    req.message = ""
    out = handle_scoping(
        req, supabase=None, client=_FakeOpenAIClient([]),
    )
    assert out["error"] == "empty_message"


# --- handle_agent dispatch ------------------------------------------------

def test_handle_agent_dispatches_scoping_screen():
    """handle_agent must route screen=='scoping' to _handle_scoping, NOT
    the cedent/stress two-stage path."""
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("ask_followup", {
            "question": "What's your LOB mix?",
            "axis": "line_of_business",
        }),
    ])
    with patch("serve.agent._get_client", return_value=fake_client):
        with patch("serve.supabase_client.get_client", return_value=None):
            resp = handle_agent(AgentRequest(
                message="we're a Vietnamese cedent",
                screen="scoping",
            ))
    assert resp.error is None
    assert resp.tool_called == "ask_followup"
    assert resp.scoping_profile is not None
    assert resp.complete is False


# --- Supabase persistence (mocked) ---------------------------------------

class _FakeSupabaseTable:
    def __init__(self, store: dict[str, list[dict]], table_name: str):
        self._store = store
        self._table = table_name
        self._action: str = ""
        self._payload: Any = None
        self._filters: list[tuple[str, Any]] = []
        self._order: str | None = None
        self._limit: int | None = None

    def select(self, *_args, **_kw):
        self._action = "select"
        return self

    def insert(self, payload):
        self._action = "insert"
        self._payload = payload
        return self

    def update(self, payload):
        self._action = "update"
        self._payload = payload
        return self

    def eq(self, col, val):
        self._filters.append((col, val))
        return self

    def order(self, col):
        self._order = col
        return self

    def limit(self, n):
        self._limit = n
        return self

    def execute(self):
        rows = self._store.setdefault(self._table, [])
        if self._action == "insert":
            payload = self._payload
            if isinstance(payload, dict):
                payload = [payload]
            for row in payload:
                row = dict(row)
                row.setdefault("id", f"id-{len(rows) + 1}")
                row.setdefault("created_at", float(len(rows)))
                rows.append(row)
            return SimpleNamespace(data=payload)
        if self._action == "update":
            for row in rows:
                if all(row.get(c) == v for c, v in self._filters):
                    row.update(self._payload)
            return SimpleNamespace(data=[])
        # select
        out = list(rows)
        for c, v in self._filters:
            out = [r for r in out if r.get(c) == v]
        if self._order:
            out.sort(key=lambda r: r.get(self._order, 0))
        if self._limit:
            out = out[: self._limit]
        return SimpleNamespace(data=out)


class _FakeSupabaseClient:
    def __init__(self):
        self.store: dict[str, list[dict]] = {}

    def table(self, name: str):
        return _FakeSupabaseTable(self.store, name)


def test_handle_scoping_persists_transcript_when_supabase_available():
    sb = _FakeSupabaseClient()
    sb.store["scoping_sessions"] = [{
        "id": "sess-1", "complete": False, "profile": {}, "user_id": "user-1",
    }]
    fake_client = _FakeOpenAIClient([
        _fake_tool_call_response("set_scoping_axis", {
            "axis": "geography",
            "value": {"tags": ["VN"]},
            "confidence": 0.9,
        }),
    ])
    req = AgentRequest(
        message="Vietnam-only book",
        screen="scoping",
        session_id="sess-1",
        user_id="user-1",
    )
    out = handle_scoping(
        req,
        supabase=sb,
        client=fake_client,
    )
    assert out["error"] is None
    assert out["session_id"] == "sess-1"
    msgs = sb.store["scoping_messages"]
    assert any(m["role"] == "user" for m in msgs)
    assert any(m["role"] == "assistant" for m in msgs)
    sess = sb.store["scoping_sessions"][0]
    assert sess["profile"]["geography"] == ["VN"]
