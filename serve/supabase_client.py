"""Supabase client singleton for Phase 1 scoping persistence.

Lazy-initialised from SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars. The
service-role key is required server-side because RLS is permissive-anon for
the hackathon but we still want server writes to bypass any future tightening.

Tolerates missing config: get_client() returns None when env vars are unset,
which signals callers (handle_scoping) to run in stateless mode (no transcript
persistence, no profile rehydrate) — mirrors the Supabase outage fallback in
the plan.
"""
from __future__ import annotations

import os
from typing import Any

_CLIENT: Any = None
_INIT_TRIED = False


def get_client() -> Any | None:
    """Return a cached supabase-py Client, or None if env not configured.

    Mutable global cache is a small concession to the existing _get_client
    pattern in agent.py — keeps the boot path lean and avoids re-importing
    supabase on every request.
    """
    global _CLIENT, _INIT_TRIED
    if _CLIENT is not None:
        return _CLIENT
    if _INIT_TRIED:
        return None
    _INIT_TRIED = True

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        return None

    try:
        from supabase import create_client
    except ImportError:
        return None

    try:
        _CLIENT = create_client(url, key)
    except Exception:
        _CLIENT = None
    return _CLIENT


def reset_for_tests() -> None:
    """Clear the singleton — only used by pytest fixtures."""
    global _CLIENT, _INIT_TRIED
    _CLIENT = None
    _INIT_TRIED = False
