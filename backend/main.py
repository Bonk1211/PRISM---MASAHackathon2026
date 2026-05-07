"""PRISM Pipeline FastAPI service.

Run locally:
    cd backend && uv sync
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

Expose via ngrok for the live demo:
    ngrok http 8000
"""
from __future__ import annotations

from pathlib import Path

# Load backend/.env before any module reads os.environ. uvicorn does not auto-load
# .env files, so ILMU_API_KEY / SUPABASE_* would be missing without this.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from backend.agent import (
    AgentRequest,
    AgentResponse,
    handle_agent,
    rate_limit_ok,
    remaining_tokens,
    token_budget_ok,
)
from backend.pipeline import META, PredictRequest, run_pipeline

app = FastAPI(title="PRISM Pipeline", version="1.0")

import os

# CORS: lock to local dev origins by default. Override for ngrok demos via
# CORS_ALLOW_ORIGINS env var (comma-separated). Wildcard kept available but not
# the default so the endpoint isn't a drive-by target during a public tunnel.
_default_origins = "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173"
_origins = os.environ.get("CORS_ALLOW_ORIGINS", _default_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    # Restrict to the headers the PWA actually sends — stricter than `*`.
    allow_headers=["content-type", "authorization"],
)


_INDEX_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PRISM Pipeline · API</title>
  <style>
    body {{ font-family: -apple-system, system-ui, sans-serif; background: #F4EFE3; color: #0A1A2A;
           max-width: 640px; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.55; }}
    h1 {{ font-family: Georgia, serif; font-style: italic; font-weight: 400; font-size: 2.4rem; margin: 0 0 .25rem; }}
    .eyebrow {{ font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #52504A; }}
    code {{ font-family: ui-monospace, Menlo, monospace; background: rgba(10,26,42,0.06); padding: 1px 5px; border-radius: 2px; }}
    a {{ color: #0E7C86; }}
    .row {{ display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 8px 0;
           border-bottom: 1px solid rgba(10,26,42,0.14); }}
    .meth {{ font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: #8B2E1F; }}
    .muted {{ color: #52504A; font-size: 12px; }}
  </style>
</head>
<body>
  <p class="eyebrow">PRISM · MASA Hackathon 2026</p>
  <h1>Pipeline <em>API</em></h1>
  <p class="muted">FastAPI service · serves M3a / M3b XGBoost models exported from analysis.ipynb cell 42.</p>
  <p class="muted">Base URL: <code>{base_url}</code></p>

  <h2 class="eyebrow" style="margin-top:2rem">Endpoints</h2>
  <div class="row"><span class="meth">GET</span><a href="/healthz">/healthz</a></div>
  <div class="row"><span class="meth">GET</span><a href="/meta">/meta</a> &nbsp;<span class="muted">slider bounds, country list, scenarios</span></div>
  <div class="row"><span class="meth">POST</span><code>/predict</code> &nbsp;<span class="muted">5-stage pipeline trace</span></div>
  <div class="row"><span class="meth">GET</span><a href="/docs">/docs</a> &nbsp;<span class="muted">Swagger UI · interactive testing</span></div>
  <div class="row"><span class="meth">GET</span><a href="/redoc">/redoc</a> &nbsp;<span class="muted">ReDoc reference</span></div>

  <h2 class="eyebrow" style="margin-top:2rem">Try it</h2>
  <pre style="background:#0A1A2A;color:#FAF7EE;padding:14px;font-size:11px;overflow:auto"><code>curl -X POST {base_url}predict \\
  -H 'content-type: application/json' \\
  -d '{{"country":"Vietnam","mode":"hindcast"}}'</code></pre>
</body>
</html>"""


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def index(request: Request) -> str:
    # Compute the base URL from the actual incoming request — works behind ngrok,
    # reverse proxies, and the local Make demo without hardcoding localhost.
    return _INDEX_TEMPLATE.format(base_url=str(request.base_url))


@app.get("/healthz")
def health() -> dict:
    return {"ok": True, "version": "1.0", "seed": META.get("random_state")}


@app.get("/meta")
def meta() -> dict:
    """Slider bounds, country list, scenarios, and base-year feature panels."""
    return META


@app.post("/predict")
def predict(req: PredictRequest) -> dict:
    return run_pipeline(req)


@app.post("/agent", response_model=AgentResponse)
def agent(req: AgentRequest, request: Request) -> AgentResponse:
    # Prefer the authenticated user_id (stable across networks) over IP.
    # Falls back to IP for unauthenticated callers.
    ip = request.client.host if request.client else "unknown"
    bucket_key = req.user_id or ip
    # Two-layer abuse guard:
    #   1. Per-user request rate (60/min scoping, 30/min cedent/stress)
    #   2. Per-user daily token budget (100k tokens / 24h)
    if not rate_limit_ok(bucket_key, req.screen):
        raise HTTPException(status_code=429, detail="rate_limited")
    if not token_budget_ok(bucket_key):
        raise HTTPException(status_code=429, detail="token_budget_exhausted")
    return handle_agent(req)


@app.get("/usage", include_in_schema=False)
def usage(request: Request, user_id: str | None = None) -> dict:
    """Lightweight telemetry — daily token budget remaining for the calling
    user (or IP fallback). Used by the frontend to surface a usage chip."""
    ip = request.client.host if request.client else "unknown"
    key = user_id or ip
    return {
        "key": key,
        "tokens_remaining": remaining_tokens(key),
        "daily_budget": 100_000,
    }
