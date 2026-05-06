"""Apply Phase 1 scoping migration to Supabase.

Reads serve/.env for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, then runs
serve/migrations/001_scoping.sql against the project's Postgres instance.

Usage:
    python serve/migrations/apply.py

Requires:
    pip install supabase psycopg2-binary python-dotenv

Falls back gracefully: if psycopg2 is unavailable, prints the SQL block and
the dashboard URL the user can paste into instead.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SQL_PATH = Path(__file__).with_name("001_scoping.sql")


def load_env() -> dict[str, str]:
    env_path = ROOT / "serve" / ".env"
    if not env_path.exists():
        return {}
    out: dict[str, str] = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def project_ref(url: str) -> str:
    # https://<ref>.supabase.co  →  <ref>
    return url.split("//", 1)[-1].split(".", 1)[0]


def main() -> int:
    env = {**os.environ, **load_env()}
    url = env.get("SUPABASE_URL", "").rstrip("/")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    sql = SQL_PATH.read_text()

    if not url or not service_key:
        print(
            "[apply.py] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in serve/.env.\n"
            "Fallback: paste the SQL below into\n"
            f"  https://supabase.com/dashboard/project/{project_ref(url) or '<ref>'}/sql/new\n\n"
            f"--- {SQL_PATH.name} ---\n{sql}",
            file=sys.stderr,
        )
        return 2

    try:
        import psycopg2
    except ImportError:
        print(
            "[apply.py] psycopg2 not installed. Either:\n"
            "  pip install psycopg2-binary\n"
            "or paste the SQL into the Supabase Dashboard SQL editor:\n"
            f"  https://supabase.com/dashboard/project/{project_ref(url)}/sql/new",
            file=sys.stderr,
        )
        return 3

    ref = project_ref(url)
    # Supabase pooled connection string (region-agnostic, uses postgres user).
    # User must set SUPABASE_DB_PASSWORD in env if direct postgres access desired.
    db_password = env.get("SUPABASE_DB_PASSWORD")
    if not db_password:
        print(
            "[apply.py] SUPABASE_DB_PASSWORD not set. The service-role JWT cannot run\n"
            "DDL via the REST API. Either:\n"
            "  1) Add SUPABASE_DB_PASSWORD=<db-password> to serve/.env, or\n"
            f"  2) Paste {SQL_PATH.name} into\n"
            f"     https://supabase.com/dashboard/project/{ref}/sql/new",
            file=sys.stderr,
        )
        return 4

    dsn = (
        f"postgresql://postgres.{ref}:{db_password}"
        f"@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
    )
    try:
        with psycopg2.connect(dsn) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        print(f"[apply.py] DB error: {exc}", file=sys.stderr)
        print(
            "Fallback: paste 001_scoping.sql into\n"
            f"  https://supabase.com/dashboard/project/{ref}/sql/new",
            file=sys.stderr,
        )
        return 1

    print("[apply.py] Migration applied: scoping_sessions + scoping_messages ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
