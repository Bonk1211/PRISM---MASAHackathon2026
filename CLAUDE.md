# CLAUDE.md

This file guide Claude Code (claude.ai/code) when work in this repo.

## Project context

Submission **PRISM** (Portfolio Risk via Identified Scenario Modeling) to **MASA Hackathon 2026: R-Ignite** (R-Ignite = hackathon theme set by organiser, PRISM = our project name). Climate-risk consulting engagement for multinational reinsurer (Strategic Partner: **Hannover Re**). Convert World Bank WDI data into 2024 GHG forecast, 2030 NGFS-scenario stress test, quantified loss-ratio impact (USD 135 m / +11 pp on USD 1.2 bn notional SEA portfolio).

Read `README.md` and `PROJECT.md` for full overview. Submission body in `deliverables/` (numbered `00`–`12` for reading order).

**Key dates.** Preliminary submission: 7 May 2026, 23:59 GMT+8. Grand Final: 6 June 2026.

**Brief constraint.** Modelling pipeline must be **R or Python only**. Team picked **Python**. Interactive-app deliverable *not* subject to constraint (any stack OK).

## Common commands

```bash
# Primary pipeline (Python notebook — 41 cells, ~3 min on raw WDI)
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb --output /tmp/exec.ipynb
cp /tmp/exec.ipynb analysis/python/analysis.ipynb   # save outputs back to source

# Mobile interactive app (PWA — installable from any phone)
cd app && npm run dev          # http://localhost:5173 + LAN URL for phone
cd app && npm run build        # production bundle to app/dist/
cd app && npm run preview      # serve build at http://localhost:4173

# Legacy R Shiny dashboard (kept for reference; not on critical path)
Rscript -e "shiny::runApp('analysis/shiny/app.R', launch.browser = TRUE)"
```

PWA run `npm run sync-data` auto as `predev`/`prebuild` — copy `exhibits/results/key_numbers_python.json` into `app/src/data/` so React imports reflect latest pipeline run. Re-execute notebook → JSON regen → next `npm run dev` pick up. No hand-port.

## Required data setup

Raw WDI download (`data/WB_WDI_WIDEF.csv`, ~243 MB) **not committed** but **required** for cell 4 to do real cleaning. Source URL (pinned, verified): `https://data360files.worldbank.org/data360-data/data/WB_WDI/WB_WDI_WIDEF.csv`.

Cell 4 has fallback: if raw absent, load committed `data/global_panel_clean.csv` and skip curate/reshape (cell 6). Identical downstream behaviour, but cleaning step not exercised.

**External datasets** at `data/external/` (EM-DAT + ND-GAIN) committed and joined into panel by cell 8. Refresh via `data/external/build_external_panel.py`.

## Architecture — analytical pipeline

Python notebook (`analysis/python/analysis.ipynb`, 41 cells) implement full pipeline end-to-end and emit canonical JSON.

```
data/WB_WDI_WIDEF.csv (raw, 243 MB, not committed)
    │  cell 4–6: curate to 16-indicator panel + sectoral GHG components
    │            (interp ≤3y FORWARD-ONLY — never both-direction → 2024 leakage)
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
    ├── M1: per-country log-linear trend       (transparent baseline, 9.23 % MAPE)
    ├── M2: auto-ARIMA per country             (autocorrelation cross-check, 2.67 %)
    ├── M3a: panel XGBoost — autoregressive    (forecast, ~2.4–2.9 % MAPE)
    └── M3b: panel XGBoost — structural-only   (driver attribution, ~9.7 % MAPE)
    │
    ▼
NGFS Phase V scenario perturbation × Swiss Re elasticity 0.7 × GWP USD 1.2 bn
    ▼
2030 loss-ratio impact (Hot House 62.0 % → Net Zero 50.7 %; USD 135 m swing)
    ▼
exhibits/results/key_numbers_python.json (single source of truth)
    │
    ├──→ app/src/data/key_numbers_python.json (auto-copied by npm sync-data)
    │         ↓
    │    PWA renders Story · Model · HotSpots · Stress · Cedent · Actions
    │
    ├──→ deliverables/*.md (manual prose; numbers must agree)
    │
    └──→ analysis/shiny/app.R (still hand-typed; legacy)
```

**Two non-obvious design decisions** must preserve:

1. **Two XGBoost specs, not one.** M3a (with lag-1/lag-2 emissions) win on forecast accuracy. M3b (no lags) win on driver attribution because lags would dominate gain. Reinsurance committee need both. Don't collapse.
2. **Pairwise vs partial correlations reported side-by-side.** Three indicators (forest area, industry share, energy use per capita) flip sign once log-GDP and log-population partialled out. Diagnostic itself is headline finding (§3.2 of report) — don't drop pairwise column for "tidiness".

## Repository structure conventions

- **`deliverables/`** — what judges read. Files prefixed `00`–`12` indicate reading order. Cedent-screening framework (`05_`), policy crosswalk (`06_`), Q&A briefing (`07_`), cedent visit scorecard (`08_`), executive memo (`09_`), VN cedent contacts (`10_`), Indonesia counterfactual (`11_`), stress refresh playbook (`12_`) are productised companions to main report (`01_`); change analysis means propagate to all.
- **`analysis/python/analysis.ipynb`** — primary pipeline, 41 cells. **Re-execute via `jupyter nbconvert --execute`** then copy /tmp output back to source. Don't hand-write notebooks via heredoc — use `nbformat` / `json.dump` on cell dict.
- **`analysis/R/analysis.Rmd`** — legacy R companion. Numerical agreement desirable but no longer enforced; XGBoost stochastic init differs across xgb 3.x. Stress-test, ARIMA, log-linear MAPE all bit-exact between R and Python.
- **`analysis/shiny/app.R`** — legacy R Shiny. Superseded by PWA for interactive-app criterion. Kept for reference.
- **`app/`** — installable PWA (Vite 7 + React 19 + TypeScript + Tailwind + vite-plugin-pwa). 6 mobile-first screens. Import `key_numbers_python.json` at build time — never hand-edit data file.
- **`exhibits/results/key_numbers_python.json`** — Python-emitted canonical JSON (15 top-level keys: mape_summary, m1/m2/m3a/m3b per country, feature_importance_m3a/m3b, stress_test_2030_aggregate, headline, stirpat, sectoral_residuals_pct, partial_correlations, two_way_fe, vn_vs_ph). **Single source of truth for every number quoted in deliverables and PWA.**
- **`exhibits/results/key_numbers.json`** — older R-emitted JSON. Retained for cross-check only; don't write to it from Python.
- **`exhibits/figures/fig*.png`** — 13 publication-quality figures, numbered to match report references.
- **`docs/brief/`** — original organiser problem statement and rules. Read before any structural change to submission.
- **`docs/app_prd.md`** — PWA product requirements doc.

## Numerical-consistency invariant

Every number in `deliverables/` trace back to `exhibits/results/key_numbers_python.json` or CSV in `data/`. When analysis change:

1. Re-execute `analysis/python/analysis.ipynb` (raw WDI must be at `data/WB_WDI_WIDEF.csv`).
2. Verify `exhibits/results/key_numbers_python.json` regen (timestamp in `_meta.generated`).
3. Run `cd app && npm run sync-data && npm run build` — confirm PWA pick up new numbers.
4. Update prose in `deliverables/00_executive_one_pager.md`, `01_report.md` §3/§5/§6, `04_vietnam_vs_philippines_deep_dive.md`, `02_pitch_deck_outline.md` Slide 9, `09_hannover_re_executive_memo.md`, and `PROJECT.md` § Headline Findings.
5. If Shiny app kept for any reason: re-sync hard-coded constants in `analysis/shiny/app.R`.

Headline number (USD 135 m / +11 pp loss-ratio swing) computed from three inputs that must stay aligned across docs: **GWP USD 1.2 bn, base loss ratio 0.62, elasticity 0.7**. Live in notebook's `CONSTANTS` block (cell 2) and propagate through `key_numbers_python.json`.

## Submission constraints (from `docs/brief/`)

- Report body capped at **10 pages**, 1-inch margins, ≥12 pt font (cover / TOC / bibliography / appendices excluded).
- Final entry = report PDF + source code + ≤ 3 supporting files + AI usage disclosure (`deliverables/ai_usage.md`).
- Each file ≤ 100 MB.
- Source code must include comments; README must explain setup and replication.
- **Modelling must use R or Python only** (interactive-app deliverable exempt — PWA fine).

## When extending the analysis

- **Adding indicators.** Update `KEY_INDICATORS` in cell 5. Update `data/README.md` schema. Re-execute notebook (cleaning regen panels in-memory).
- **Adding scenarios.** Update `scenarios` dict in cell 23 (NGFS perturbation). Re-export JSON. PWA `STRESS_2030` array reflects auto.
- **Changing portfolio assumptions** (GWP, base LR, elasticity). Edit cell 2 `CONSTANTS` block only — JSON regen with new values; PWA pick up; only deliverable prose need hand-update.

## Notebook authorship rules

- **Never write `.ipynb` via Bash heredoc or `Write` tool with raw JSON strings** — silent empty-file failures occur. Patch via Python script that loads JSON, mutate `nb['cells']`, write back. After patching, **re-execute via `jupyter nbconvert --execute`** and confirm cell outputs populated before declaring success.
- After execution, **save executed `.ipynb` back over source** so committed notebook ships with cell outputs visible (judges may not re-run).

## Environment constraints (macOS)

- No sudo. Prefer `pip3 install --user` or `brew install` for system tooling.
- For input simulation use `pynput`, not `keyboard` (require root on macOS).
- R install (`brew install --cask r`) need sudo for `installer -pkg` — block on user; don't attempt.
- PyTorch ≥ 2.6 require `weights_only=False` for legacy pickle loads.

## What not to do

- Don't introduce randomness without `RANDOM_STATE = 2026` — seed-2026 reproducibility claim is credibility anchor.
- Don't let any 2024 info leak into training set. Specifically: keep `interpolate(limit_direction='forward')` — `'both'` back-fills 2024 into 2023, break hold-out hygiene.
- Don't delete structural (M3b) XGBoost variant in favour of autoregressive one — dual spec is methodological differentiator.
- Don't commit `data/WB_WDI_WIDEF.csv` (243 MB).
- Don't hand-edit `app/src/data/key_numbers_python.json` — build artefact of `npm run sync-data`. Edit upstream in notebook + re-execute.
- Don't write to `exhibits/results/key_numbers.json` from Python — R-canonical, kept for cross-check. Python write to `key_numbers_python.json`.