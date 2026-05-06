# PRISM — Climate Risk Assessment for a Multinational Reinsurer

*PRISM — **P**ortfolio **R**isk via **I**dentified **S**cenario **M**odeling.*

*Submission to **MASA Hackathon 2026** — organised by the Malaysian Actuarial Student Association in strategic partnership with **Hannover Re***

> **Tagline.** *Climate is now a structural driver of Southeast Asia (SEA) reinsurance loss — here is how Hannover Re wins it.*

---

## Headline Numbers

| What we built | What it shows | Where it lives |
|---|---|---|
| 16-indicator country-year panel, 10 SEA economies × 35 years | Curated from the World Bank WDI (1,486 indicators × 217 economies × 1960–2024) | `data/sea_panel_clean.csv`, `data/global_panel_clean.csv` |
| Three-model forecasting benchmark (log-linear / ARIMA / XGBoost) | **2.18 % MAPE** on 2024 hold-out for the selected XGBoost — beats ARIMA (2.67 %) and log-linear (9.23 %) | `analysis/R/analysis.Rmd` §4, `analysis/python/analysis.ipynb` |
| Two-XGBoost specification (autoregressive vs structural) | Separates *forecast accuracy* from *driver attribution* — the question a reinsurance committee actually asks twice | `exhibits/results/key_numbers.json`, `exhibits/results/structural_drivers.json` |
| STIRPAT residual decomposition (country + 8 sectors) | Vietnam aggregate **+24 %** decomposes into Power Industry **+280 %** and Industrial Combustion **+276 %** | `exhibits/figures/fig10_stirpat_residuals.png`, `fig12_sectoral_residuals.png` |
| Two-way fixed-effects panel regression | Three drivers survive country + year FE with cluster-robust SE: **log GDP, CO₂ intensity of GDP, urban population share** | `exhibits/results/section3_round2.json` |
| NGFS Phase V scenario stress test → 2030 | **+11 percentage-point loss-ratio swing** (Net Zero 51 % vs Hot House 62 %) on a USD 1.2 bn notional SEA portfolio = **USD ~135 m** | `exhibits/figures/fig4_stress_test_2030.png`, `fig6_loss_ratio_impact.png` |
| Three concrete client recommendations | (1) SEA parametric typhoon product (TAM USD 280 m by 2028), (2) ESG-linked underwriting screen, (3) USD 250 m cat bond timed to NGFS Disorderly window 2027 | `deliverables/01_report.md` §7 |
| Interactive R Shiny dashboard | 6 tabs, including Indicator Diagnostic (interactive partial correlations), Reinsurance Impact (live elasticity slider), and Policy Linkage | `analysis/shiny/app.R` |
| Compliance & policy crosswalk | Explicit mapping to BNM CRST 2024, IFRS S2, NGFS Phase V, Paris Agreement Article 2.1(c), TCFD, UNFCCC NDCs, ASEAN Strategy | `deliverables/06_policy_crosswalk.md` |

---

## What Makes This Submission Win

Five elements separate this work from a generic regression-and-recommendations submission:

1. **Pairwise vs partial correlation diagnostic.** Two indicators (forest area, industry share) flip sign once GDP and population are controlled. Most teams will report pairwise *r* and stop there. We report the diagnostic transparently and make it interactive in the dashboard.
2. **Two-XGBoost specification with explicit role separation.** The autoregressive variant wins on forecast accuracy (2.18 % MAPE). The structural variant wins on driver interpretability (log GDP gain 0.50, population gain 0.40). We report both because a reinsurance committee asks both questions.
3. **Sectoral STIRPAT residuals.** Country-level "Vietnam +24 % over-emits" decomposes into "Vietnam Power Industry +280 %, Industrial Combustion +276 %" — the actuarial story a cedent-screening framework actually needs.
4. **Two-way fixed-effects robustness.** Country FE plus year FE plus country-cluster-robust standard errors is the most demanding spec a 288-observation panel supports. Only three drivers survive — and we say so explicitly.
5. **Productised deliverables, not just analysis.** A cedent screening framework (`deliverables/05_cedent_screening_framework.md`), a policy crosswalk (`06_policy_crosswalk.md`), a Vietnam-vs-Philippines deep dive with parametric pricing arithmetic (`04_vietnam_vs_philippines_deep_dive.md`), and a 15-minute pitch script (`03_pitch_script.md`). All four are **outputs a Hannover Re actuary could circulate Monday morning**.

---

## Repository Map

```
.
├── README.md                              ← this file (judges start here)
├── PROJECT.md                             ← extended project overview
│
├── deliverables/                          ← READ THESE FIRST
│   ├── 00_executive_one_pager.md          ← single-page summary (bonus criterion)
│   ├── 01_report.md                       ← 10-page main report
│   ├── 02_pitch_deck_outline.md           ← 15-slide Grand Final deck
│   ├── 03_pitch_script.md                 ← word-for-word 15-min script
│   ├── 04_vietnam_vs_philippines_deep_dive.md
│   ├── 05_cedent_screening_framework.md   ← productised tool for client
│   ├── 06_policy_crosswalk.md             ← BNM CRST / IFRS S2 / NGFS / Paris
│   ├── 07_qa_briefing.md                  ← 15 anticipated judge questions
│   └── ai_usage.md                        ← required AI disclosure
│
├── analysis/                              ← code (read-and-run)
│   ├── R/analysis.Rmd                     ← primary R Markdown analysis
│   ├── python/analysis.ipynb              ← parallel Python notebook (XGBoost + SHAP)
│   └── shiny/app.R                        ← 6-tab interactive dashboard
│
├── data/                                  ← cleaned panels
│   ├── README.md
│   ├── sea_panel_clean.csv                ← 10 SEA economies × 35 years × 16 indicators
│   └── global_panel_clean.csv             ← global panel for XGBoost training
│
├── exhibits/                              ← figures, tables, machine-readable results
│   ├── figures/                           ← fig1–fig13 (publication-quality PNG)
│   ├── results/                           ← JSON outputs (key_numbers + supporting)
│   └── MASA_Hackathon_Summary.pdf
│
└── docs/                                  ← reference material
    ├── brief/                             ← organiser problem statement & rules
    │   ├── 01_introduction_and_timeline.md
    │   ├── 02_problem_statement.md
    │   ├── 03_rules_and_regulations.md
    │   └── 04_judging_and_submission.md
    └── code_documentation.md              ← module-by-module Python codebase walkthrough
```

---

## Deliverables Mapping to Judging Criteria

| Criterion | Weight | Where it lives |
|---|:---:|---|
| **Problem Framing & Preliminary Data Exploration** | 20 % | `deliverables/01_report.md` §1, §3 (eight subsections) · `analysis/R/analysis.Rmd` §1–3 |
| **Modelling & In-Depth Data Analysis** | 20 % | `01_report.md` §4 · `analysis/python/analysis.ipynb` cells 5–7 · `exhibits/results/section3_round2.json` (two-way FE) |
| **Financial Impact Assessment** | 20 % | `01_report.md` §6 · `analysis/shiny/app.R` Reinsurance Impact tab · `exhibits/figures/fig6_loss_ratio_impact.png` |
| **Strategic Risk Management Recommendations** | 20 % | `01_report.md` §7 · `05_cedent_screening_framework.md` (operational tool) |
| **Overall Storyline & Presentation** | 20 % | `01_report.md` (10 pages) · `02_pitch_deck_outline.md` · `03_pitch_script.md` |
| **Bonus** — interactive app + policy linkage + executive readiness | +10 % | `analysis/shiny/app.R` (6 tabs, Indicator Diagnostic + Policy Linkage) · `00_executive_one_pager.md` · `06_policy_crosswalk.md` |

---

## Reproduce in Three Minutes

```bash
# 1. R pipeline (everything except SHAP)
Rscript -e "rmarkdown::render('analysis/R/analysis.Rmd')"

# 2. Python pipeline (parallel implementation with SHAP)
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb

# 3. Launch the interactive dashboard
Rscript -e "shiny::runApp('analysis/shiny/app.R', launch.browser = TRUE)"
```

All stochastic steps use **`random seed = 2026`**. The 2024 hold-out is reserved (no leakage). Both R and Python implementations produce identical headline results to four decimal places.

### Minimal R environment

```r
install.packages(c(
  "tidyverse", "forecast", "xgboost", "shiny",
  "shinydashboard", "plotly", "DT", "rmarkdown"
))
```

### Minimal Python environment

```bash
python -m venv .venv && source .venv/bin/activate
pip install pandas numpy scipy scikit-learn statsmodels \
            linearmodels xgboost shap matplotlib seaborn jupyter
```

For the full module-by-module Python codebase walkthrough, see `docs/code_documentation.md`.

---

## Live Demo — Pipeline App (Frontend + Backend)

> **Quick path**: `make demo` from the repo root installs both stacks, regenerates the model artefacts, and starts the API + web in parallel. `Ctrl-C` stops both. Run `make` with no args for the full target list.

PRISM ships with two runnable services for the live judging demo:

- **Backend** (`serve/`) — FastAPI service that loads the trained M3a / M3b XGBoost models exported by the analysis notebook and exposes a `/predict` endpoint returning the full 5-stage pipeline trace.
- **Frontend** (`app/`) — React + Vite single-page web app. Editorial reinsurance dashboard, 12 routes, calls the backend live.

### One-time prerequisites

> **macOS only — install OpenMP runtime first.** XGBoost on macOS dynamically links `libomp.dylib`, which Apple's system Python and python.org installers do not ship. Anaconda bundles it; everything else needs:
>
> ```bash
> brew install libomp
> ```
>
> Without this, `import xgboost` raises `XGBoostError: libxgboost.dylib could not be loaded` and the API will not start. Linux + Windows users skip this step.

```bash
# 1. Re-execute the analysis notebook so cell 42 emits the model artefacts.
#    Skip this if serve/models/{m3a.json,m3b.json,meta.json} already exist.
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb --output /tmp/exec.ipynb
cp /tmp/exec.ipynb analysis/python/analysis.ipynb

# 2. Backend dependencies (FastAPI · uvicorn · pydantic · xgboost · scikit-learn · numpy)
cd serve
pip install -r requirements.txt        # or: uv sync
cd ..

# 3. Frontend dependencies
cd app
npm install
cp .env.example .env.local             # default points VITE_PIPELINE_API at localhost:8000
cd ..
```

### Run both in parallel

The `Makefile` orchestrates the demo. Common targets:

```bash
make demo        # install deps, build models, start API + web in parallel
make dev         # API + web in parallel (assumes installed)
make api         # API only, with --reload (dev)
make api-prod    # API only, no --reload (use for ngrok / live demo)
make web         # Vite dev server only
make smoke       # curl /healthz + 2× /predict and ASSERT expected ranges
make test        # pytest regression anchors against canon JSON (19 cases)
make stop        # kill any running uvicorn / vite
```

**Manual two-terminal run** (equivalent to `make dev`):

```bash
# Terminal 1 — backend
uvicorn serve.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd app && npm run dev
```

Then open **`http://localhost:5173/#/pipeline`**. Drag any feature slider — you should see real M3a inference at sub-millisecond latency with the 5-stage trace animating live.

The FastAPI root (`http://localhost:8000/`) renders an editorial landing page listing every endpoint with a working `curl` example computed from the request URL (works behind ngrok). Swagger at `/docs`, ReDoc at `/redoc`.

### Verify the integration

```bash
# From repo root, with API up:
make smoke
# ==> /healthz                                              {"ok":true,"version":"1.0","seed":2026}
# ==> /predict Vietnam hindcast      err -4.05%             ASSERT err_pct ∈ [-5,-3]%
# ==> /predict Vietnam forward Net Zero 2050  swing -135m   ASSERT lr_pp_vs_base < 0
# smoke OK
```

For a deeper invariant check (every SEA country pinned to canon `key_numbers_python.json` to within 0.5 percentage points):

```bash
make test
# 19 passed — covers all 10 SEA hindcasts, scenario sign-direction, validation surfaces
```

### Input validation surfaces

The API rejects malformed input with HTTP 422 (Pydantic validation) so `make demo` is safe to expose during judging:

| Input | Result |
|---|---|
| `country` not in the 10 SEA whitelist | **422** |
| `scenario` not in NGFS Phase V scenarios | **422** |
| `target_year < 2024` or `> 2050` | **422** |
| `feature_overrides` with > 32 keys | **422** |
| Unknown `feature_overrides` keys | **silently ignored** (still 200 OK) |
| `feature_overrides` with NaN/Inf | **silently dropped** |
| `feature_overrides` outside `feature_ranges` | **clamped** to 5/95 percentile |

### Stop both servers

```bash
make stop
# or globally: pkill -f "uvicorn serve" && pkill -f "vite"
```

### Optional — share the backend over the internet for the live demo

The frontend is configured via `VITE_PIPELINE_API`. To expose your local backend so a judge's phone can hit it from outside the venue:

```bash
ngrok http 8000
# Copy the https://*.ngrok-free.app URL into app/.env.local:
#   VITE_PIPELINE_API=https://<your-tunnel>.ngrok-free.app
# Then restart `npm run dev` so Vite picks up the new env var.
```

The frontend also has an offline fallback — if `VITE_PIPELINE_API` is unset or unreachable, the Pipeline screen renders a synthesised trace from `exhibits/results/key_numbers_python.json` and shows a "Cached mode" banner.

### Production build

```bash
make build            # → app/dist/  · ~103 KB gzip initial route (Pipeline)
make preview          # serves the build at http://localhost:4173
```

The bundle is route-split: Pipeline + Story load in ~103 KB gzip; chart-heavy screens (Model, HotSpots, Stress, Sectoral, Compare, Brief, Cedent, Diagnostic, Evidence) lazy-load Recharts (106 KB gzip) only on first visit.

For deployment, point any static host (Vercel / Netlify / Cloudflare Pages) at `app/dist/` and host the FastAPI service on Render / Fly / equivalent.

**CORS** is locked to `localhost:5173`, `localhost:4173`, and `127.0.0.1:5173` by default. To expose the API to a deployed frontend, set `CORS_ALLOW_ORIGINS` (comma-separated) when starting `uvicorn`:

```bash
CORS_ALLOW_ORIGINS="https://prism-sea.vercel.app" make api-prod
```

### File map for the demo stack

```
app/                          React + Vite single-page app
├── src/screens/Pipeline.tsx  ← live model demo (5 stages + inspect modals)
├── src/lib/pipeline.ts       ← typed /predict client + offline synthesiser
├── src/lib/useFocusTrap.ts   ← WCAG-compliant modal focus trap
├── src/data/pipeline_meta.json ← synced from serve/models/meta.json (10 SEA panels)
├── src/data/key_numbers_python.json ← synced from exhibits/results/
├── src/components/           ← Sidebar, Layout, Card, EvidenceModal, …
├── .env.example              ← VITE_PIPELINE_API documented here
└── package.json              ← sync-data hook copies meta + canon JSON pre-build

serve/                        FastAPI backend
├── main.py                   ← / · /healthz · /meta · POST /predict (CORS locked)
├── pipeline.py               ← model load + 5-stage trace builder + Pydantic validation
├── tests/                    ← pytest regression anchors (19 cases pinning canon)
│   └── test_regression_anchors.py
├── models/                   ← m3a.json · m3b.json · meta.json (from notebook)
├── pyproject.toml / requirements.txt
├── Dockerfile                ← optional Render / Fly deploy
└── README.md                 ← backend-only run notes
```

---

## Data Provenance

| Source | Used for | Vintage |
|---|---|---|
| **World Bank — World Development Indicators (Wide format)** | 16-indicator country-year panel; XGBoost training set | 1960–2024 (downloaded 25 Apr 2026) |
| **EM-DAT (CRED, UCLouvain)** | Disaster event counts, Philippines vs Vietnam | 2018–2023 |
| **Swiss Re Institute *sigma* 1/2024** | Insured-loss elasticity; protection-gap statistics | January 2024 |
| **Munich Re NatCatSERVICE** | Loss event corroboration | 2023 release |
| **NGFS Phase V** | Stress-test scenario calibration | 2024 vintage |
| **BNM Climate Risk Stress Testing Methodology Paper** | Regulatory anchor; capital-buffer guidance | 2024 |
| **UNFCCC NDC Registry** | Vietnam & Philippines national climate commitments | as filed 2022 / 2021 |

---

## Team

| Role | Responsibility |
|---|---|
| Data & Modelling Lead | R/Python pipeline, model selection, validation |
| Climate Risk & Industry Research Lead | NGFS scenarios, BNM CRST, EM-DAT, Swiss Re sigma, recommendations |
| Visualisation & Dashboard Lead | Shiny dashboard, report figures, slide deck visuals |
| Report, Slides & Project Manager | 10-page report, pitch deck, submission, AI usage doc |

Member names, universities, and contact details: see `deliverables/01_report.md` cover page.

---

## Acknowledgements

We thank the Malaysian Actuarial Student Association for organising MASA Hackathon 2026, **Hannover Re** as Strategic Partner, and the World Bank Group for making the WDI dataset openly available. The methodology builds on public work by the Network for Greening the Financial System, Bank Negara Malaysia, the Swiss Re Institute, the IFRS Foundation, and the Task Force on Climate-related Financial Disclosures — each cited in the report bibliography.

---

*Submission portal: <https://masahackathon2026.vercel.app> · Submission window: 24 Apr – 7 May 2026, 23:59 GMT+8.*
