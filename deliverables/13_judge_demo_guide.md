# PRISM — Judge Demo Guide

***P**ortfolio **R**isk via **I**dentified **S**cenario **M**odeling*

**A 5-minute happy path + 10-minute full tour for the live judging session.**

---

## Before you start (60 seconds)

You need two URLs. Either the team will share them, or run the stack locally:

| URL | What it is | Sanity check |
|---|---|---|
| **`http://localhost:5173/`** (or the team's deployed origin) | The PWA — primary demo surface | Should land on the editorial **Landing** screen |
| **`http://localhost:8000/healthz`** | FastAPI backend | Returns `{"ok":true,"version":"1.0","seed":2026}` |

If running locally:

```bash
make demo        # installs deps, rebuilds models, starts API + web in parallel
# wait ~30 seconds for both to come up, then open http://localhost:5173/
```

If the backend is unreachable, the PWA still works — the Pipeline screen falls back to the cached canonical JSON and shows a **"Cached mode"** banner. The other 13 screens render unchanged because every number is bundled at build time.

---

## The 5-minute happy path

The PWA reframes the submission as a Hannover Re consulting engagement. Walk it linearly:

### 1. Onboarding (15 sec)

Click **Sign in anonymously**. No email required — Supabase issues an anon JWT. The session persists transcripts and pinned axes for the next time you open the tab.

### 2. Phase 1 — Discovery (90 sec)

Single consolidated chat that runs three steps inside one feed:

1. **Scoping** — chat with the ILMU consultant to pin five axes: line of business, geography, time horizon, frameworks, disclosures. Type a short brief like *"Hannover Re SEA reinsurance, 5-year horizon, BNM CRST + IFRS S2"* — the assistant will ask follow-ups until all five axes are pinned, then unlock step 2.
2. **Risk taxonomy** — pick one or more of Physical Acute / Physical Chronic / Transition / Liability. Pre-filled based on your scoping answers.
3. **Indicator panel** — accept or trim the proposed mapping to 16 WDI indicators.

**What to notice:** the consultant cites BNM CRST 2024 and NGFS Phase V by name. Token usage is logged to Supabase per session — visible in the Phase 6 admin tail if asked.

### 3. Phase 4 — Data Pipeline (60 sec)

Visual walkthrough of the curate → panel → STIRPAT → modelling chain. **Click the "Open live demo"** call-to-action (or jump to `#/appendix/pipeline`) to drag feature sliders against the M3a XGBoost model. Watch the 5-stage trace update live: feature engineering → log-transform → tree inference → scenario perturbation → loss-ratio output. Latency < 1 ms per call.

### 4. Phase 6 — Strategy (90 sec)

The deliverable. Three productised tools side by side:

- **Cedent screening framework** — score any candidate cedent across six axes (capital, exposure mix, climate disclosure quality, NGFS alignment, parametric appetite, regulatory posture).
- **Parametric pricing simulator** — Vietnam typhoon parametric, USD 280 m premium opportunity by 2028.
- **Stress-refresh playbook** — quarterly NGFS Phase V re-calibration ritual.

### 5. The headline (15 sec)

End on the Phase 6 summary card: **+11.25 pp loss-ratio swing · USD 135 m** on a USD 1.2 bn notional SEA portfolio between Net Zero 2050 and Current Policies. That's the number every other deliverable points to.

---

## The 10-minute full tour (drill into appendix)

The 12 appendix screens (`/appendix/*`) preserve the full analytical depth. Visit them when a judge asks "where does this number come from?".

| Drill-down | URL | What to demo |
|---|---|---|
| **Diagnostic** | `#/appendix/diagnostic` | Toggle pairwise vs partial correlation. Three indicators (forest area, industry share, energy use per capita) flip sign once log-GDP and log-population are partialled out. The diagnostic itself is a finding. |
| **Sectoral** | `#/appendix/sectoral` | STIRPAT residuals decomposed across 8 sectors. Vietnam aggregate +24 % over-emission resolves into Power Industry **+280 %** and Industrial Combustion **+276 %**. |
| **Compare** | `#/appendix/compare` | Vietnam vs Philippines deep-dive. Same exposure to typhoons, divergent transition risk — the case study that drives the cedent-screening framework. |
| **Stress** | `#/appendix/stress` | Four NGFS Phase V scenarios as fan charts to 2030. Hot House 62.0 % → Net Zero 2050 50.7 % loss ratio. |
| **Pipeline** | `#/appendix/pipeline` | Live `/predict` slider — drag any of 16 features and watch M3a re-infer. Best single screen for the "is this a real model?" question. |
| **Model** | `#/appendix/model` | Three-model benchmark table. M3a XGBoost AR 2.43 % MAPE vs ARIMA 2.67 % vs log-linear 9.23 %. |
| **Cedent** | `#/appendix/cedent` | Productised cedent screening tool with NL agent. Type *"score a Vietnamese non-life cedent with weak transition disclosure"* — the agent extracts axes, scores, and narrates. |
| **HotSpots** | `#/appendix/hotspots` | SEA geographic risk heatmap. |
| **Pricing** | `#/appendix/pricing` | Vietnam typhoon parametric premium calculator. |
| **Actions** | `#/appendix/actions` | Strategic recommendation tracker. |
| **Story** | `#/appendix/story` | Editorial climate-risk narrative arc — the "what's the picture?" screen. |
| **Report** | `#/appendix/report` | Full 10-page report rendered inline with figure callouts. |

Tip: the top-nav has a **"Skip to appendix"** affordance so you never have to back-navigate through phases.

---

## What each judging criterion looks like in the demo

| Criterion (weight) | Show this | Where |
|---|---|---|
| **Problem framing & EDA** (20 %) | Phase 1 Discovery + Diagnostic toggle | `/phase1` · `/appendix/diagnostic` |
| **Modelling & in-depth analysis** (20 %) | Phase 4 walkthrough + Pipeline live slider + Model benchmark | `/phase4` · `/appendix/pipeline` · `/appendix/model` |
| **Financial impact** (20 %) | Stress fan charts + Phase 6 headline + Pricing simulator | `/appendix/stress` · `/phase6` · `/appendix/pricing` |
| **Strategic recommendations** (20 %) | Phase 6 (cedent screening + pricing + refresh playbook) | `/phase6` |
| **Storyline & presentation** (20 %) | Story arc + Report renderer + Phase 6 summary card | `/appendix/story` · `/appendix/report` · `/phase6` |
| **Bonus** (+10 %) | Installable PWA · ILMU LLM consultant · live `/predict` API · policy crosswalk in `06_` | end-to-end |

---

## Quick-fire jump points

If you have only 60 seconds, hit these three URLs in order:

1. **`/phase1`** — proves the LLM consultant works end to end (scoping → taxonomy → indicators).
2. **`/appendix/pipeline`** — proves the model is live, not a screenshot. Drag the GDP slider and watch the loss ratio move.
3. **`/phase6`** — lands on the USD 135 m / +11 pp headline.

---

## NL agent demo prompts

The Cedent and Stress screens accept natural language. Try these to show off the ILMU integration:

| Screen | Prompt | What you'll see |
|---|---|---|
| `/appendix/cedent` | *"Score a Vietnamese non-life cedent, mid-cap, weak transition disclosure"* | Six-axis radar fills in; narration cites BNM CRST. |
| `/appendix/cedent` | *"Compare a Philippine typhoon-heavy cedent to a Singaporean diversified one"* | Side-by-side scorecards. |
| `/appendix/stress` | *"What does Net Zero 2050 do to Indonesian coal exposure by 2028?"* | Fan-chart filtered + narration. |

Each call is two-turn: forced tool extraction at temperature 0, then JSON narration at 0.2, capped at 300 tokens. Average round-trip ~1.5 s on `ilmu-nemo-nano`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| **"Cached mode" banner** on Pipeline screen | Backend unreachable. Demo still works — every other number is build-time bundled. To restore live: `uvicorn backend.main:app --port 8000 --reload`. |
| **Phase 1 chat returns 401 / 500** | `ILMU_API_KEY` missing in `backend/.env`. Phase 1 falls back to a static "kickoff" message; the rest of the demo is unaffected. |
| **Phase 1 axes don't persist** | `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing. Session lives in memory for that tab only — fine for a single demo run. |
| **Sliders return HTTP 422** | You're outside `feature_ranges`. The API clamps automatically; if you see 422, the input shape is wrong (probably an unknown country). The 10 SEA whitelist is enforced. |
| **Stress chart blank** | Recharts lazy-loads on first chart visit. Wait 1 second after navigation. |
| **Production build needed** | `make build && make preview` serves at `http://localhost:4173`. |

---

## What to ask the team

If the judge wants to probe the depth, these questions land on real, defensible answers:

1. *Why two XGBoost specifications instead of one?* → M3a (lag-1/lag-2) wins on forecast (2.43 %), M3b (no lags) wins on driver attribution because lags would dominate gain. Reinsurance committees ask both questions, so we report both.
2. *How do you stop 2024 leakage?* → Forward-only interpolation (`limit_direction='forward'`, ≤3y), 2024 reserved as out-of-sample hold-out, no back-fill from 2024 into 2023. Pinned to `random_state=2026`.
3. *Why is the pairwise vs partial correlation diagnostic kept visible?* → Three indicators flip sign once log-GDP + log-population are partialled out (forest area, industry share, energy use per capita). The flip itself is a §3.2 headline finding — collapsing to one column would hide it.
4. *Is the USD 135 m number defensible?* → Three constants in notebook cell 2: GWP USD 1.2 bn, base LR 0.62, Swiss Re elasticity 0.7. NGFS Phase V perturbation × elasticity × GWP. Everything traces back via `key_numbers_python.json`.
5. *Where's the regulatory anchor?* → `06_policy_crosswalk.md` — explicit mapping to BNM CRST 2024, IFRS S2, NGFS Phase V, Paris 2.1(c), TCFD, UNFCCC NDCs, ASEAN Strategy.

---

## One-line cheat sheet

> Sign in → Phase 1 (chat with ILMU) → Phase 4 (pipeline walkthrough) → `/appendix/pipeline` (drag a slider) → Phase 6 (USD 135 m headline). Five minutes, one URL bar, one model talking back.
