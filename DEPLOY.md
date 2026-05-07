# DEPLOY.md — PRISM Live Deployment Plan

Deployment plan for PRISM (Portfolio Risk via Identified Scenario Modeling) so MASA Hackathon 2026 judges can reach the live demo from any browser.

**Architecture being deployed**

```
[Judge browser]
      │ HTTPS
      ▼
┌──────────────────────────────┐         ┌────────────────────────┐
│ Render Static Site           │  HTTPS  │ Render Web Service     │
│ "prism-frontend"             │ ──────▶ │ "prism-backend"        │
│   Vite 7 build of frontend/  │  CORS   │   Dockerfile, FastAPI  │
│   dist/  →  global CDN       │         │   M3a/M3b XGBoost      │
└──────────────────────────────┘         │   /predict /agent /scoping
                                          └────────────┬───────────┘
                                                       │
                                                       ▼
                                          ┌────────────────────────┐
                                          │ Supabase (managed)     │
                                          │  ncpvewfibvjyppoqrcbk  │
                                          │  scoping_sessions      │
                                          │  scoping_messages      │
                                          │  token_usage           │
                                          │  anonymous auth        │
                                          └────────────────────────┘
                                                       ▲
                                                       │ direct (anon key)
                                                       │
                                          [browser ────┘ for auth + sync]

Plus: ILMU LLM (api.ilmu.ai/v1) called server-side from backend.
```

**Recommended platform**: **Render** for both services (Docker web service + static site). Single dashboard, free tier viable for a demo, automatic HTTPS, GitHub auto-deploy. Railway is a drop-in alternative if Render quotas hit; Fly.io is the upgrade path if cold-starts hurt.

**Domains**
- Backend: `https://prism-backend.onrender.com`
- Frontend: `https://prism-frontend.onrender.com`
- (Replace with real URLs once Render assigns them; both go in README + submission portal.)

**Deadline reality check** — Preliminary submission 7 May 2026 23:59 GMT+8. Grand Final 6 June 2026. Build the deployment pipeline once, redeploy on every notebook re-execution.

---

## 0. Pre-deployment hardening (DO NOT SKIP)

These are blockers that will silently break a deploy if left to the last minute. Address all four before pushing.

### 0.1 Model artefacts must ship inside the backend image

`backend/.gitignore` currently blocks `models/*.json`. The Dockerfile uses `COPY . .`, so models are not in the build context — the API will boot, fail to load M3a/M3b, and `/predict` will 500.

**Pick one fix**:
- **Option A (recommended for hackathon)**: commit the artefacts. They are 5.9 MB total, well under the 100 MB rule, and judges expect a runnable repo.
  ```bash
  # In backend/.gitignore, change:
  #   models/*.json
  # to:
  #   # models/*.json  ← commented out for deploy
  git add backend/models/m3a.json backend/models/m3b.json backend/models/meta.json
  git commit -m "deploy: ship trained M3a/M3b artefacts for live inference"
  ```
- **Option B (cleaner)**: keep models gitignored on `main`, maintain a `deploy` branch where they are committed, and point Render at that branch.
- **Option C (CI build)**: GitHub Actions runs `make models` on push to a tag, uploads the JSON to a GitHub Release, and the Dockerfile fetches them at build time. Highest engineering cost; only worth it post-Final.

### 0.2 Backend Dockerfile needs libomp

`python:3.12-slim` does not bundle the OpenMP runtime that XGBoost dynamically links. The current `backend/Dockerfile` will fail at `import xgboost` on first request.

Patch:

```dockerfile
FROM python:3.12-slim

# XGBoost dynamically links libgomp.so.1 (the Linux equivalent of macOS libomp).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV PORT=8000
EXPOSE 8000

# Render injects $PORT — bind to it instead of hard-coding 8000.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Two changes from the current Dockerfile:
1. `apt-get install libgomp1` — fixes XGBoost.
2. `${PORT:-8000}` shell expansion — Render assigns `$PORT` dynamically; hard-coding 8000 means the health check fails.

### 0.3 Backend must read `$PORT` not 8000

Same root cause. Confirm `backend/main.py` does not assert port 8000 anywhere. Render, Railway, Fly all inject `$PORT`. The Dockerfile patch above handles it; no Python change needed.

### 0.4 Supabase project configured for production

Run these against the existing project (`ncpvewfibvjyppoqrcbk`) in the Supabase dashboard:

1. **Apply migration** — paste `backend/migrations/001_scoping.sql` into SQL Editor → Run. Confirms `scoping_sessions`, `scoping_messages`, `token_usage` tables exist.
2. **Enable anonymous sign-ins** — Auth → Providers → toggle **Anonymous** ON. Without this, `AuthGuard` blocks every route.
3. **Tighten RLS before public push** — see Security Audit ME-009. The current policy permits anonymous full read/write. For a sacrificial demo project this is acceptable; document it as known and rotate the project ref post-Final.
4. **Verify the URL allow-list** — Auth → URL Configuration → add the deployed frontend URL to "Site URL" and "Redirect URLs".

---

## 1. Step-by-step: Render deployment

### 1.1 Backend — Web Service (Docker)

1. **Sign in** → render.com → Connect GitHub → select the PRISM repo.
2. **New + → Web Service**.
3. Settings:
   - Name: `prism-backend`
   - Region: Singapore (closest to SEA judges) — or Oregon if Singapore unavailable.
   - Branch: `main` (or `deploy` if using Option 0.1-B).
   - Runtime: **Docker**.
   - Dockerfile path: `backend/Dockerfile`.
   - Docker context: `backend/`.
   - Health check path: `/healthz`.
   - Plan: **Starter $7/mo** (always-on; required if cold starts hurt the demo) OR **Free** (spins down after 15 min idle, 30–60 s cold start).
4. **Environment variables** (Render Dashboard → Environment):
   ```
   ILMU_API_KEY              = <from console.ilmu.ai>
   SUPABASE_URL              = https://ncpvewfibvjyppoqrcbk.supabase.co
   SUPABASE_ANON_KEY         = <from Supabase dashboard → Settings → API>
   SUPABASE_SERVICE_ROLE_KEY = <same place; service-role JWT>
   CORS_ALLOW_ORIGINS        = https://prism-frontend.onrender.com
   PYTHONUNBUFFERED          = 1
   ```
   Mark `ILMU_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as **secret** so they never appear in build logs.
5. **Deploy**. Watch the build log for `import xgboost` success and `Uvicorn running on http://0.0.0.0:$PORT`.
6. **Verify**:
   ```bash
   curl https://prism-backend.onrender.com/healthz
   # → {"ok":true,"version":"1.0","seed":2026}
   curl -X POST https://prism-backend.onrender.com/predict \
        -H 'content-type: application/json' \
        -d '{"country":"Vietnam","mode":"hindcast"}' | jq .stage_3_xgb.err_pct
   # → -4.05  (matches canon JSON within tolerance)
   ```

### 1.2 Frontend — Static Site

1. **New + → Static Site** (same Render account).
2. Settings:
   - Name: `prism-frontend`
   - Branch: `main`.
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
3. **Environment variables** (build-time — Vite reads at build, not runtime):
   ```
   VITE_PIPELINE_API     = https://prism-backend.onrender.com
   VITE_SUPABASE_URL     = https://ncpvewfibvjyppoqrcbk.supabase.co
   VITE_SUPABASE_ANON_KEY = <Supabase anon key — same as backend>
   ```
4. **Headers / Redirects** — Render's static site serves SPAs out-of-box. Add a `_redirects` file or a header rule only if you switch from HashRouter to BrowserRouter. PRISM uses HashRouter (`#/phase1`, `#/appendix/pipeline`), so no rewrite is needed.
5. **Deploy**. First build runs `npm install` + `npm run sync-data` (predev/prebuild hook copies model meta + canon JSON) + `tsc -b && vite build`. Expect 2–3 min.
6. **Verify**:
   - Open `https://prism-frontend.onrender.com/` → onboarding screen renders.
   - Sign in (anonymous, no email).
   - Navigate `/phase1` → ILMU consultant chat loads.
   - Navigate `/appendix/pipeline` → drag a slider → backend returns updated trace within ~1 s.
   - DevTools → Application → Service Workers → confirm registered (PWA installable).

### 1.3 Wire the two together

After both services are live:

1. Copy the frontend URL into the backend's `CORS_ALLOW_ORIGINS` env var. Trigger a re-deploy. Without this, browsers block `/predict` requests.
2. Copy the frontend URL into Supabase Auth → URL Configuration. Without this, anonymous sign-in tokens get rejected.
3. Update `README.md` "Live demo" section with both URLs so judges know where to look.

---

## 2. Pre-flight checklist (run locally before every deploy)

```bash
# 1. Refresh model artefacts from the notebook (≈3 min)
make models

# 2. Run the regression suite — must be 30/30 green
make test

# 3. Smoke test the local API
make api &              # background
sleep 4
make smoke              # curl /healthz + 2× /predict + asserts
make stop

# 4. Build the frontend production bundle
cd frontend && npm run build
# Confirm dist/ size ≤ 5 MB total, dist/index.html exists

# 5. Commit + push
git status
git push origin main    # triggers Render auto-deploy on both services
```

If any of steps 1–4 fail, stop and fix before pushing. Render will happily build a broken app.

---

## 3. Things that will bite you

### 3.1 Build-time vs run-time env vars

**Vite env vars are baked at build time.** Changing `VITE_PIPELINE_API` in Render's dashboard does not update an already-built frontend; you must trigger a rebuild. The backend (FastAPI) reads env vars at boot, so it picks up changes on next deploy/restart.

### 3.2 Cold starts on the free tier

Render Free spins the backend down after 15 min idle. First request after sleep takes 30–60 s. If a judge clicks `/predict` and waits 60 s for a response they will assume it is broken. **Pay $7/mo for Starter during the judging window** (24 Apr – 7 May, plus 6 June Grand Final). Or use a free uptime pinger (`uptimerobot.com`, 5-min interval) — note: spamming `/healthz` to dodge the spin-down policy violates Render's TOS.

### 3.3 ILMU rate limits

`backend/agent.py` enforces `RATE_LIMIT_PER_MIN = 30` per IP. ILMU's own quota matters more — if multiple judges hammer Phase 1 simultaneously, the consultant chat may 429. Test with `make smoke` doesn't exercise `/agent`. Run a manual chat test against the deployed backend before the demo:

```bash
curl -X POST https://prism-backend.onrender.com/agent \
     -H 'content-type: application/json' \
     -d '{"message":"we are a Vietnamese cedent, 70% property cat","screen":"scoping"}'
```

### 3.4 Supabase anonymous user table growth

Every page-load by every judge creates an anonymous `auth.users` row plus rows in `scoping_sessions`. Free Supabase tier caps at 50,000 monthly active users — fine for a demo, but **prune the project after the Final**:

```sql
-- After Grand Final: delete demo sessions older than 24h
DELETE FROM scoping_sessions WHERE created_at < now() - interval '24 hours';
DELETE FROM scoping_messages WHERE created_at < now() - interval '24 hours';
-- Anonymous auth users auto-expire per Supabase default (30 days)
```

### 3.5 PWA cache invalidation

Vite-PWA uses Workbox with `registerSW({ immediate: true })`. After a deploy, an already-installed PWA on a judge's phone will keep serving the old bundle until the SW updates (next visit → background fetch → next-next visit → new bundle). For a hackathon demo, **uninstall the PWA from your test device after every deploy** to confirm judges see the latest build. Or bump the `VITE_PWA_VERSION` (if configured) to force a refresh.

### 3.6 The 14 `/appendix/*` routes

The PWA has 21 screens. Phases 1–6 are primary; the 14 chart-driven appendix screens are lazy-loaded behind `Suspense`. After deploy, click through every appendix route once — `npm run build` may produce a chunk that fails at runtime if a TS error was downgraded to a warning. Use the production build, not `npm run dev`, for this check.

### 3.7 CORS lock vs ngrok

The hardened backend rejects every origin not in `CORS_ALLOW_ORIGINS`. If you use ngrok for a backup demo path, you must add the ngrok URL to `CORS_ALLOW_ORIGINS` (comma-separated, no spaces) and redeploy. Plan the ngrok URL ahead — `ngrok http 8000 --domain=your-reserved-domain.ngrok.app` (paid tier) gives a stable URL across restarts.

---

## 4. Rollback

Render keeps every deploy in `Deploys` tab. To revert:

1. Render Dashboard → service → Deploys.
2. Find the last green deploy → **Redeploy**.
3. If the rollback is for the backend (e.g. broken model artefact), also redeploy the frontend so it does not point at a stale version.

For a code-level rollback (revert the commit, not just the deploy):

```bash
git revert <bad-sha>
git push origin main
# Render auto-redeploys both services from the new HEAD
```

---

## 5. Post-deploy verification (run from a different machine)

Use a phone on cellular (not your office Wi-Fi) — proves the deploy is genuinely public, not just a local-network artefact.

| Check | Pass criterion |
|---|---|
| Open `https://prism-frontend.onrender.com/` | Landing renders; no console errors |
| Anonymous sign-in completes | `auth.users` row appears in Supabase dashboard |
| Phase 1 chat sends a message | ILMU response arrives ≤5 s; `scoping_messages` row appears |
| `/appendix/pipeline` slider drag | Trace updates ≤2 s; `served_by: live` (not "cached") in DevTools |
| `/appendix/stress` | Charts render Recharts; 4 NGFS scenarios labelled |
| Service-worker registered | DevTools → Application → SW status: "activated and running" |
| Add to Home Screen (iOS Safari / Chrome Android) | Installs as standalone app with PRISM icon |
| `curl https://prism-backend.onrender.com/healthz` | 200 OK, JSON includes `seed:2026` |

---

## 6. Submitting the live URLs

The MASA submission portal accepts a "Live Demo URL" field. Submit:

```
Frontend (judges start here):  https://prism-frontend.onrender.com
Backend API (Swagger):         https://prism-backend.onrender.com/docs
GitHub:                        https://github.com/<your-org>/MASAHackathon2026
```

Also update `README.md` § Live demo (currently points at `localhost`) with the deployed URLs, then commit + push (one extra deploy round).

---

## 7. Cost estimate (May–June 2026)

| Item | Tier | Monthly | For demo window |
|---|---|---:|---:|
| Render Web Service (backend) | Starter | $7 | $14 |
| Render Static Site (frontend) | Free | $0 | $0 |
| Supabase | Free | $0 | $0 |
| ILMU API | Free credit (YTL trial) | $0 | $0 |
| **Total** | | **$7** | **~$14** |

Assumes 7 May 2026 → 6 June 2026 (preliminary submission to Grand Final). Cancel Render Starter the day after the Final.

---

## 8. Alternatives if Render fails

**Railway**: same model — Docker for backend, static for frontend. UX similar. $5 free trial then $5/mo. Use if Render quota hits.

**Fly.io + Vercel**: backend on Fly (always-free tier covers small Docker apps), frontend on Vercel (best static-site DX). Two dashboards, more setup, but global edge for free.

**Self-hosted on a VM**: don't. Hackathon demo is a 10-day window; managed hosting saves a day of yak-shaving.

---

## 9. Decommissioning (post-Grand Final, June 2026)

1. Delete the Render services (`prism-backend`, `prism-frontend`).
2. Pause the Supabase project (Settings → General → Pause project) so the free-tier clock stops.
3. Rotate the ILMU API key.
4. Archive the GitHub repo (Settings → Archive) so it stays readable but immutable.
5. Update `README.md` "Live demo" section to point at a screenshot/video instead.

---

## 10. Open questions to resolve before deploy

- [ ] Decide on Option A vs B vs C in §0.1 (model artefact shipping). Recommended: A.
- [ ] Confirm `make models` re-emits artefacts on the deployment branch.
- [ ] Confirm Supabase anonymous sign-in is enabled on the production project.
- [ ] Decide whether to upgrade to Render Starter ($7/mo) for always-on, or accept cold starts.
- [ ] Get the ILMU prod API key (the one in `.env.example` may be a dev key with lower quota).
- [ ] Final URL chosen for frontend so it can be locked into backend CORS.
