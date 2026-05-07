# PRISM — Climate Risk Assessment for a Multinational Reinsurer

*PRISM — **P**ortfolio **R**isk via **I**dentified **S**cenario **M**odeling.*

*Submission to **MASA Hackathon 2026** — organised by the Malaysian Actuarial Student Association in strategic partnership with **Hannover Re**.*

> **Tagline.** *Climate is now a structural driver of Southeast Asia (SEA) reinsurance loss — here is how Hannover Re wins it.*

---

## Headline numbers

| What we built | What it shows | Where it lives |
|---|---|---|
| 16-indicator country-year panel, 10 SEA economies × 35 years | Curated from World Bank WDI (1,486 indicators × 217 economies × 1960–2024) | `data/sea_panel_clean.csv`, `data/global_panel_clean.csv` |
| Three-model forecasting benchmark (log-linear / ARIMA / XGBoost) | **2.43 % MAPE** on 2024 hold-out for M3a XGBoost — beats ARIMA (2.67 %) and log-linear (9.23 %) | `analysis/python/analysis.ipynb` §4, `exhibits/results/key_numbers_python.json` |
| Two-XGBoost specification (autoregressive M3a vs structural M3b) | Separates *forecast accuracy* (M3a, 2.43 %) from *driver attribution* (M3b, 9.67 %) — the two questions a reinsurance committee always asks | `serve/models/m3a.json`, `serve/models/m3b.json`, `exhibits/results/key_numbers_python.json` |
| STIRPAT residual decomposition (country + 8 sectors) | Vietnam aggregate **+24 %** decomposes into Power Industry **+280 %** and Industrial Combustion **+276 %** | `exhibits/figures/fig10_stirpat_residuals.png`, `fig12_sectoral_residuals.png` |
| Two-way fixed-effects panel regression | Three drivers survive country + year FE with cluster-robust SE: **log GDP, CO₂ intensity of GDP, urban population share** | `exhibits/results/key_numbers_python.json` (`two_way_fe`) |
| NGFS Phase V scenario stress test → 2030 | **+11.25 percentage-point loss-ratio swing** on a USD 1.2 bn notional SEA portfolio = **USD 135 m** | `exhibits/figures/fig4_stress_test_2030.png`, `fig6_loss_ratio_impact.png` |
| Productised consulting deliverables (00–12) | Cedent screening framework, policy crosswalk, Q&A briefing, cedent-visit scorecard, executive memo, VN cedent target list, Indonesia counterfactual, stress-refresh playbook | `deliverables/` |
| Installable PWA (React 19 + Vite 7) | Six-phase consulting engagement workflow with Supabase-backed state, ILMU-LLM scoping consultant, live `/predict` slider, anonymous auth | `app/` |
| FastAPI inference + agent backend | `/predict` (XGBoost M3a/M3b), `/agent` (NL parser via ILMU), Phase 1 scoping endpoints, Pydantic validation, CORS lock | `serve/` |
| Compliance & policy crosswalk | Explicit mapping to BNM CRST 2024, IFRS S2, NGFS Phase V, Paris Article 2.1(c), TCFD, UNFCCC NDCs, ASEAN Strategy | `deliverables/06_policy_crosswalk.md` |

Headline number USD 135 m / +11.25 pp computed from three constants pinned in notebook cell 2 and propagated through `key_numbers_python.json`: **GWP USD 1.2 bn, base loss ratio 0.62, Swiss Re elasticity 0.7**.

---

## What makes this submission win

1. **A consulting engagement, not a notebook dump.** The PWA reframes the whole submission as a six-phase Hannover Re engagement (Scoping → Risk Taxonomy → Indicator Mapping → Data Pipeline → Modelling → Strategy). The 14 chart-driven analytical screens still ship — demoted under `/appendix/*` so a judge can drill into any number — but the primary path is the engagement workflow.
2. **A live LLM consultant on Phase 1 scoping.** Backed by **ILMU** (YTL AI Labs Malaysia LLM, OpenAI-compatible API). A senior climate-risk consultant persona conducts a multi-turn interview that pins down five axes (line of business, geography, time horizon, frameworks, disclosures), persists transcript and pinned axes to Supabase per anonymous user session, and gates progression to Phase 2 on completeness.
3. **Two-XGBoost specification with explicit role separation.** M3a (with lag-1 / lag-2 emissions) wins on forecast accuracy (2.43 % MAPE). M3b (no lags, structural only) wins on driver attribution because lags would otherwise dominate gain. Reported side by side because the committee asks both questions.
4. **Pairwise vs partial correlation diagnostic kept transparent.** Three indicators (forest area, industry share, energy use per capita) flip sign once log-GDP and log-population are partialled out. Most teams report pairwise *r* and stop. We report both columns because the diagnostic itself is a headline finding.
5. **Sectoral STIRPAT residuals.** Country-level "Vietnam +24 % over-emits" decomposes into "Vietnam Power Industry +280 %, Industrial Combustion +276 %" — the actuarial story a cedent-screening framework actually needs.
6. **Productised, not just analytical.** Cedent screening framework (`05_`), policy crosswalk (`06_`), Q&A briefing (`07_`), cedent-visit scorecard (`08_`), executive memo (`09_`), VN cedent target list (`10_`), Indonesia counterfactual (`11_`), stress-refresh playbook (`12_`). Eight artefacts a Hannover Re actuary could circulate Monday morning.

---

## Repository map

```
.
├── README.md                              ← this file (judges start here)
├── PROJECT.md                             ← extended project overview
├── CLAUDE.md                              ← codebase guide for AI pair-programmers
├── Makefile                               ← demo orchestration (run `make`)
│
├── deliverables/                          ← READ THESE FIRST (numbered 00–12)
│   ├── 00_executive_one_pager.md          ← single-page summary
│   ├── 01_report.md                       ← 10-page main report
│   ├── 02_pitch_deck_outline.md           ← 15-slide Grand Final deck
│   ├── 03_pitch_script.md                 ← word-for-word 15-min script
│   ├── 04_vietnam_vs_philippines_deep_dive.md
│   ├── 05_cedent_screening_framework.md   ← productised tool for the client
│   ├── 06_policy_crosswalk.md             ← BNM CRST / IFRS S2 / NGFS / Paris
│   ├── 07_qa_briefing.md                  ← anticipated judge questions
│   ├── 08_cedent_visit_scorecard.md
│   ├── 09_hannover_re_executive_memo.md
│   ├── 10_vn_cedent_targets.md
│   ├── 11_indonesia_counterfactual.md
│   ├── 12_stress_refresh_playbook.md
│   └── ai_usage.md                        ← required AI disclosure
│
├── analysis/
│   ├── python/analysis.ipynb              ← PRIMARY pipeline (41 cells, ~3 min)
│   ├── R/analysis.Rmd                     ← legacy R companion (cross-check only)
│   └── shiny/app.R                        ← legacy R Shiny dashboard (superseded by PWA)
│
├── data/
│   ├── README.md
│   ├── sea_panel_clean.csv                ← 10 SEA economies × 35 years × 16 indicators
│   ├── global_panel_clean.csv             ← global panel for XGBoost training
│   └── external/                          ← EM-DAT + ND-GAIN context tables
│
├── exhibits/
│   ├── figures/                           ← fig1–fig13 publication-quality PNG
│   └── results/
│       ├── key_numbers_python.json        ← CANONICAL JSON (single source of truth)
│       └── key_numbers.json               ← legacy R-emitted (cross-check only)
│
├── app/                                   ← PWA — React 19 + Vite 7 + TypeScript
│   ├── src/screens/Phase1Scoping…6Strategy.tsx   ← primary engagement workflow
│   ├── src/screens/{Pipeline,Story,Model,…}.tsx  ← 14 chart screens at /appendix/*
│   ├── src/components/AuthGuard.tsx              ← Supabase anonymous auth gate
│   ├── src/lib/{pipeline,scoping,supabase}.ts    ← typed API + DB clients
│   ├── src/data/key_numbers_python.json          ← synced from exhibits/ pre-build
│   ├── src/data/pipeline_meta.json               ← synced from serve/models/
│   └── .env.example                              ← VITE_PIPELINE_API + VITE_SUPABASE_*
│
├── serve/                                 ← FastAPI backend
│   ├── main.py                            ← / · /healthz · /meta · /predict · /agent · /scoping/*
│   ├── pipeline.py                        ← M3a/M3b loader + 5-stage trace
│   ├── agent.py                           ← ILMU NL parser (Cedent + Stress screens)
│   ├── scoping.py                         ← Phase 1 multi-turn consultant chat
│   ├── supabase_client.py                 ← session + transcript + token usage persistence
│   ├── migrations/001_scoping.sql         ← schema for scoping_sessions / messages / token_usage
│   ├── models/{m3a,m3b,meta}.json         ← notebook artefacts (cell 42)
│   ├── tests/test_regression_anchors.py   ← 19 pytest cases pinning canon
│   └── .env.example                       ← ILMU_API_KEY + SUPABASE_* + CORS_ALLOW_ORIGINS
│
└── docs/
    ├── brief/                             ← organiser problem statement & rules
    ├── app_prd.md                         ← PWA product requirements
    └── code_documentation.md              ← module-by-module Python walkthrough
```

---

## Deliverables mapping to judging criteria

| Criterion | Weight | Where it lives |
|---|:---:|---|
| **Problem Framing & Preliminary Data Exploration** | 20 % | `01_report.md` §1, §3 · `analysis/python/analysis.ipynb` §1–3 · PWA Phase 1 (Scoping) + Phase 2 (Risk Taxonomy) |
| **Modelling & In-Depth Data Analysis** | 20 % | `01_report.md` §4 · notebook cells 5–7 · `key_numbers_python.json` (`two_way_fe`) · PWA Phase 4 (Data Pipeline) + Phase 5 (Modelling) + `/appendix/pipeline` live demo |
| **Financial Impact Assessment** | 20 % | `01_report.md` §6 · `fig6_loss_ratio_impact.png` · PWA `/appendix/stress` + `/appendix/pricing` |
| **Strategic Risk Management Recommendations** | 20 % | `01_report.md` §7 · `05_cedent_screening_framework.md` · PWA Phase 6 (Strategy) |
| **Overall Storyline & Presentation** | 20 % | `01_report.md` (10 pages) · `02_pitch_deck_outline.md` · `03_pitch_script.md` |
| **Bonus** — interactive app + policy linkage + executive readiness | +10 % | PWA (six-phase engagement + 14 appendix screens, installable) · `00_executive_one_pager.md` · `06_policy_crosswalk.md` |

---

## Quick start

```bash
make demo      # install both stacks + rebuild models + start API + web in parallel
make dev       # API + web only (assumes deps installed)
make stop      # kill uvicorn + vite
```

Then open **http://localhost:5173/** for the engagement workflow, or **http://localhost:5173/#/appendix/pipeline** for the live `/predict` demo.

`make` with no args lists every target. Common follow-ups:

```bash
make smoke     # curl /healthz + 2× /predict, ASSERT expected ranges
make test      # 19 pytest regression anchors against canon JSON
make build     # production bundle to app/dist/ (~103 KB gzip initial route)
make preview   # serve the build at http://localhost:4173
```

PWA `npm run sync-data` runs automatically as `predev` / `prebuild` — copies `exhibits/results/key_numbers_python.json` and `serve/models/meta.json` into `app/src/data/` so React imports always reflect the latest pipeline run. Re-execute the notebook → JSON regenerates → next `npm run dev` picks it up. No hand-port required.

---

## Required setup

### macOS — install OpenMP runtime first

XGBoost on macOS dynamically links `libomp.dylib`, which Apple's system Python and python.org installers do not ship. Without it, `import xgboost` raises `XGBoostError: libxgboost.dylib could not be loaded` and the API will not start.

```bash
brew install libomp
```

Linux + Windows users skip this step.

### Raw WDI download (optional but recommended)

The 243 MB raw World Bank WDI file is not committed. If you want the notebook to do real cleaning from raw, place it at `data/WB_WDI_WIDEF.csv`:

```
https://data360files.worldbank.org/data360-data/data/WB_WDI/WB_WDI_WIDEF.csv
```

Cell 4 has a fallback: if the raw file is absent it loads the committed `data/global_panel_clean.csv` and skips the curate/reshape step. All downstream cells still run.

### Environment variables

**Backend (`serve/.env`)** — copy `serve/.env.example`:

| Var | Purpose |
|---|---|
| `ILMU_API_KEY` | YTL AI Labs LLM key. Drives `/agent` (Cedent + Stress NL parser) and `/scoping/*` (Phase 1 consultant chat). Free tier sufficient for demo. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Phase 1 session / transcript / token-usage persistence. Project ref `ncpvewfibvjyppoqrcbk`. |
| `CORS_ALLOW_ORIGINS` | Comma-separated. Default covers `localhost:5173/4173/127.0.0.1:5173`. Override for ngrok / production. |

**Frontend (`app/.env.local`)** — `make install-web` seeds a default; copy from `app/.env.example` for the full set:

| Var | Purpose |
|---|---|
| `VITE_PIPELINE_API` | Backend base URL. Default `http://localhost:8000`. Point at your ngrok tunnel for live demo. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser-side anonymous auth + Phase 1 session sync. |

---

## Architecture — analytical pipeline

The Python notebook (`analysis/python/analysis.ipynb`, 41 cells) implements the full pipeline end to end and emits the canonical JSON.

```
data/WB_WDI_WIDEF.csv (raw, 243 MB, not committed)
    │  cell 4–6: curate to 16-indicator panel + sectoral GHG components
    │            (interpolate ≤3y FORWARD-ONLY — never both-direction → 2024 leakage)
    ▼
panel (9,275 rows × 41 cols: 265 economies × 1990–2024)
    │  cell 8: join EM-DAT + ND-GAIN (CONTEXT-ONLY, not fed to model)
    ▼
sea_panel (filtered to 10 SEA economies × 35 years)
    │  partial correlations · STIRPAT residuals · sectoral STIRPAT · two-way FE
    │  feature engineering (lags, log-transform, 2024 hold-out)
    ▼
modelling frame (1990–2023 train / 2024 test)
    │
    ├── M1: per-country log-linear trend       (transparent baseline · 9.23 % MAPE)
    ├── M2: auto-ARIMA per country             (autocorrelation cross-check · 2.67 %)
    ├── M3a: panel XGBoost — autoregressive    (forecast · 2.43 %)
    └── M3b: panel XGBoost — structural-only   (driver attribution · 9.67 %)
    │
    ▼
NGFS Phase V scenario perturbation × Swiss Re elasticity 0.7 × GWP USD 1.2 bn
    ▼
2030 loss-ratio impact across 4 scenarios:
    Current Policies   62.0 %   USD 744 m
    Delayed Transition 58.3 %   USD 700 m
    Mitigation         53.8 %   USD 646 m
    Net Zero 2050      50.7 %   USD 609 m   →  USD 135 m swing, +11.25 pp
    ▼
exhibits/results/key_numbers_python.json (single source of truth, 15 top-level keys)
serve/models/{m3a,m3b,meta}.json         (cell 42 — FastAPI loads at boot)
    │
    ├──→ app/src/data/key_numbers_python.json  (auto-copied by npm sync-data)
    ├──→ app/src/data/pipeline_meta.json       (auto-copied; backend feature ranges)
    │         ↓
    │    PWA renders the six-phase engagement + 14 appendix charts.
    │    /appendix/pipeline calls FastAPI /predict live (offline fallback to JSON).
    │
    └──→ deliverables/*.md (manual prose; numbers must agree with canon JSON)
```

All stochastic steps use **`random_state = 2026`**. The 2024 hold-out is reserved (no leakage). The R companion in `analysis/R/analysis.Rmd` is bit-exact for the stress test, ARIMA, and log-linear MAPE; XGBoost differs across `xgb 3.x` random init and is no longer pinned.

---

## Architecture — demo stack

Two services orchestrated by the root `Makefile`.

### Backend — `serve/`

FastAPI app exposing five surfaces:

| Endpoint | Purpose |
|---|---|
| `GET /` | Editorial landing page listing every endpoint with a working `curl` example. Computed from request URL so it works behind ngrok. |
| `GET /healthz` | `{"ok":true,"version":"1.0","seed":2026}` |
| `GET /meta` | Feature ranges + 2024 SEA panel + scenario list. PWA pipeline sliders read this. |
| `POST /predict` | M3a/M3b inference + 5-stage trace. Pydantic validates input. |
| `POST /agent` | ILMU NL parser. Two-turn pattern: forced tool-call extraction (T=0) → JSON narration (T=0.2, ≤300 tok). Drives Cedent + Stress NL panels. |
| `POST /scoping/*` | Phase 1 multi-turn consultant chat. Persists transcript + pinned axes to Supabase. |

CORS locked to `localhost:5173/4173/127.0.0.1:5173` by default — set `CORS_ALLOW_ORIGINS` to expose elsewhere. M3a/M3b loaded once at boot from `serve/models/`. ILMU base URL `https://api.ilmu.ai/v1`, model `ilmu-nemo-nano`.

### Frontend — `app/`

React 19 + Vite 7 + TypeScript + Tailwind. Hash router. **Two route tiers**:

**Primary — six-phase engagement workflow** (gated by Supabase anonymous auth via `AuthGuard`):

```
/onboarding   public · sign-in
/             Landing — engagement overview
/phase1       Scoping consultant chat (ILMU multi-turn, 5 axes)
/phase2       Risk Taxonomy selection (gates downstream phases)
/phase3       Indicator Mapping
/phase4       Data Pipeline walkthrough
/phase5       Modelling (M1/M2/M3a/M3b benchmark)
/phase6       Strategy & Recommendations
```

**Appendix — 14 chart-driven analytical screens** (legacy deep-dive paths preserved via redirect):

```
/appendix/pipeline     live /predict slider demo (offline fallback shows banner)
/appendix/story        narrative climate-risk arc
/appendix/model        forecasting benchmark detail
/appendix/diagnostic   pairwise vs partial correlation toggles
/appendix/hotspots     SEA cedent geographic risk
/appendix/sectoral     STIRPAT 8-sector decomposition
/appendix/compare      Vietnam vs Philippines deep-dive
/appendix/stress       NGFS Phase V scenario charts
/appendix/cedent       cedent screening tool
/appendix/pricing      parametric typhoon pricing simulator
/appendix/actions      strategic recommendation tracker
/appendix/evidence     citation lookup
/appendix/report       full report renderer
```

Bundle is route-split: ~103 KB gzip initial, Recharts (106 KB) lazy-loads on first chart visit.

---

## Reproduce in three minutes

```bash
# 1. Re-execute the analysis notebook (raw WDI required for cell 4 real cleaning)
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb --output /tmp/exec.ipynb
cp /tmp/exec.ipynb analysis/python/analysis.ipynb

# 2. Confirm canon JSON + model artefacts regenerated
ls -la exhibits/results/key_numbers_python.json serve/models/*.json

# 3. Start the demo stack
make demo

# 4. Verify the integration
make smoke     # /healthz + 2× /predict, ranges asserted
make test      # 19 regression anchors against canon JSON
```

### Minimal Python environment

```bash
python -m venv .venv && source .venv/bin/activate
pip install pandas numpy scipy scikit-learn statsmodels \
            linearmodels xgboost shap matplotlib seaborn jupyter
cd serve && pip install -r requirements.txt
```

For the full module-by-module Python walkthrough, see `docs/code_documentation.md`.

### Legacy R environment (cross-check only)

```r
install.packages(c(
  "tidyverse", "forecast", "xgboost", "shiny",
  "shinydashboard", "plotly", "DT", "rmarkdown"
))
```

```bash
Rscript -e "rmarkdown::render('analysis/R/analysis.Rmd')"
Rscript -e "shiny::runApp('analysis/shiny/app.R', launch.browser = TRUE)"
```

The R Shiny dashboard is retained for reference; the PWA supersedes it on the critical path.

---

## Live demo — running both services

```bash
# Terminal 1 — backend
uvicorn serve.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd app && npm run dev
```

Then open **http://localhost:5173/**. Sign in (anonymous, no email required), walk through Phase 1 → Phase 6, or jump straight to **`#/appendix/pipeline`** to drag feature sliders against live M3a inference at sub-millisecond latency.

The FastAPI root (`http://localhost:8000/`) renders an editorial landing page listing every endpoint. Swagger at `/docs`, ReDoc at `/redoc`.

### Verify the integration

```bash
make smoke
# ==> /healthz                                              {"ok":true,"version":"1.0","seed":2026}
# ==> /predict Vietnam hindcast      err -4.05%             ASSERT err_pct ∈ [-5,-3]%
# ==> /predict Vietnam forward Net Zero 2050  swing -135m   ASSERT lr_pp_vs_base < 0
# smoke OK

make test
# 19 passed — covers all 10 SEA hindcasts, scenario sign-direction, validation surfaces
```

### Input validation surfaces

The API rejects malformed input with HTTP 422 (Pydantic) so the live demo is safe to expose:

| Input | Result |
|---|---|
| `country` not in the 10 SEA whitelist | **422** |
| `scenario` not in NGFS Phase V scenarios | **422** |
| `target_year < 2024` or `> 2050` | **422** |
| `feature_overrides` with > 32 keys | **422** |
| Unknown `feature_overrides` keys | **silently ignored** (still 200 OK) |
| `feature_overrides` with NaN/Inf | **silently dropped** |
| `feature_overrides` outside `feature_ranges` | **clamped** to 5/95 percentile |

### Share the backend over the internet

```bash
ngrok http 8000
# Copy the https://*.ngrok-free.app URL into app/.env.local:
#   VITE_PIPELINE_API=https://<your-tunnel>.ngrok-free.app
# Then restart `npm run dev` so Vite picks up the new env var.
# Also append the ngrok URL to CORS_ALLOW_ORIGINS in serve/.env.
```

If `VITE_PIPELINE_API` is unset or unreachable, the Pipeline screen renders a synthesised trace from `key_numbers_python.json` and shows a "Cached mode" banner — judging keeps working offline.

### Production build

```bash
make build       # → app/dist/  · ~103 KB gzip initial route
make preview     # serves the build at http://localhost:4173
```

Point any static host (Vercel / Netlify / Cloudflare Pages) at `app/dist/` and host the FastAPI service on Render / Fly / equivalent. Set `CORS_ALLOW_ORIGINS` to the deployed origin.

---

## Data provenance

| Source | Used for | Vintage |
|---|---|---|
| **World Bank — World Development Indicators (Wide)** | 16-indicator country-year panel; XGBoost training set | 1960–2024 (downloaded 25 Apr 2026) |
| **EM-DAT (CRED, UCLouvain)** | Disaster event counts, Philippines vs Vietnam (context only) | 2018–2023 |
| **ND-GAIN** | Country adaptation / vulnerability index (context only) | 2024 release |
| **Swiss Re Institute *sigma* 1/2024** | Insured-loss elasticity; protection-gap statistics | January 2024 |
| **Munich Re NatCatSERVICE** | Loss-event corroboration | 2023 release |
| **NGFS Phase V** | Stress-test scenario calibration | 2024 vintage |
| **BNM Climate Risk Stress Testing Methodology Paper** | Regulatory anchor; capital-buffer guidance | 2024 |
| **UNFCCC NDC Registry** | Vietnam & Philippines national climate commitments | as filed 2022 / 2021 |

---

## Numerical-consistency invariant

Every number in `deliverables/` traces back to `exhibits/results/key_numbers_python.json` or a CSV in `data/`. When the analysis changes:

1. Re-execute `analysis/python/analysis.ipynb` (raw WDI must be at `data/WB_WDI_WIDEF.csv` for full cleaning).
2. Verify `exhibits/results/key_numbers_python.json` regenerated (timestamp in `_meta.generated`) and `serve/models/{m3a,m3b,meta}.json` regenerated (cell 42).
3. Run `make test` — the 19 regression anchors must still pass against the new canon.
4. Run `cd app && npm run sync-data && npm run build` — confirm the PWA picks up the new numbers.
5. Update prose in `deliverables/00_executive_one_pager.md`, `01_report.md` §3/§5/§6, `04_vietnam_vs_philippines_deep_dive.md`, `02_pitch_deck_outline.md` Slide 9, `09_hannover_re_executive_memo.md`, and `PROJECT.md` § Headline Findings.

---

## Submission constraints (from `docs/brief/`)

- Report body capped at **10 pages**, 1-inch margins, ≥12 pt font (cover / TOC / bibliography / appendices excluded).
- Final entry = report PDF + source code + ≤ 3 supporting files + AI usage disclosure (`deliverables/ai_usage.md`).
- Each file ≤ 100 MB.
- Source code must include comments; README must explain setup and replication.
- **Modelling must use R or Python only.** The interactive-app deliverable (PWA + FastAPI) is exempt.
- **Preliminary submission**: 7 May 2026, 23:59 GMT+8. **Grand Final**: 6 June 2026.

---

## Team

| Role | Responsibility |
|---|---|
| Data & Modelling Lead | Python pipeline, model selection, validation |
| Climate Risk & Industry Research Lead | NGFS scenarios, BNM CRST, EM-DAT, Swiss Re sigma, recommendations |
| Application & Visualisation Lead | PWA, FastAPI, Supabase, ILMU integration, report figures |
| Report, Slides & Project Manager | 10-page report, pitch deck, submission, AI usage doc |

Member names, universities, and contact details: see `deliverables/01_report.md` cover page.

---

## Acknowledgements

We thank the Malaysian Actuarial Student Association for organising MASA Hackathon 2026, **Hannover Re** as Strategic Partner, **YTL AI Labs** for the ILMU LLM access, and the World Bank Group for making the WDI dataset openly available. The methodology builds on public work by the Network for Greening the Financial System, Bank Negara Malaysia, the Swiss Re Institute, the IFRS Foundation, and the Task Force on Climate-related Financial Disclosures — each cited in the report bibliography.

---

*Submission portal: <https://masahackathon2026.vercel.app> · Submission window: 24 Apr – 7 May 2026, 23:59 GMT+8.*
