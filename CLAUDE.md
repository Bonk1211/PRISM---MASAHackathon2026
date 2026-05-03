# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Submission to **MASA Hackathon 2026: R-Ignite** — climate-risk consulting engagement for a multinational reinsurer (Strategic Partner: **Hannover Re**). Converts World Bank WDI data into a 2024 GHG forecast, a 2030 NGFS-scenario stress test, and a quantified loss-ratio impact (USD 135 m / +11 pp on a USD 1.2 bn notional SEA portfolio).

Read `README.md` and `PROJECT.md` for the full overview. Submission body lives in `deliverables/` (numbered `00`–`12` for reading order).

**Key dates.** Preliminary submission: 7 May 2026, 23:59 GMT+8. Grand Final: 6 June 2026.

**Brief constraint.** Modelling pipeline must be **R or Python only**. The team has elected **Python**. The interactive-app deliverable is *not* subject to this constraint (any tech stack OK).

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

The PWA runs `npm run sync-data` automatically as `predev`/`prebuild` — it copies `exhibits/results/key_numbers_python.json` into `app/src/data/` so React imports always reflect the latest pipeline run. Re-execute the notebook → JSON regenerates → next `npm run dev` picks it up. No hand-port.

## Required data setup

The raw WDI download (`data/WB_WDI_WIDEF.csv`, ~243 MB) is **not committed** but **is required** for cell 4 of the notebook to do real cleaning. Source URL (pinned, verified): `https://data360files.worldbank.org/data360-data/data/WB_WDI/WB_WDI_WIDEF.csv`.

Cell 4 has a fallback: if raw is absent, it loads the committed `data/global_panel_clean.csv` and skips the curate/reshape step (cell 6). Identical downstream behaviour, but the cleaning step itself is not exercised.

**External datasets** at `data/external/` (EM-DAT + ND-GAIN) are committed and joined into the panel by cell 8 of the notebook. Refresh via `data/external/build_external_panel.py`.

## Architecture — analytical pipeline

The Python notebook (`analysis/python/analysis.ipynb`, 41 cells) implements the full pipeline end-to-end and emits canonical JSON.

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

**Two non-obvious design decisions** that must be preserved:

1. **Two XGBoost specifications, not one.** M3a (with lag-1/lag-2 emissions) wins on forecast accuracy. M3b (no lags) wins on driver attribution because lags would dominate gain. A reinsurance committee needs both. Do not collapse them.
2. **Pairwise vs partial correlations are reported side-by-side.** Three indicators (forest area, industry share, energy use per capita) flip sign once log-GDP and log-population are partialled out. The diagnostic itself is a headline finding (§3.2 of the report) — do not drop the pairwise column for "tidiness".

## Repository structure conventions

- **`deliverables/`** — what judges read. Files prefixed `00`–`12` indicate reading order. The cedent-screening framework (`05_`), policy crosswalk (`06_`), Q&A briefing (`07_`), cedent visit scorecard (`08_`), executive memo (`09_`), VN cedent contacts (`10_`), Indonesia counterfactual (`11_`), and stress refresh playbook (`12_`) are productised companions to the main report (`01_`); changing the analysis means propagating to all of them.
- **`analysis/python/analysis.ipynb`** — primary pipeline, 41 cells. **Re-execute via `jupyter nbconvert --execute`** then copy /tmp output back to source. Don't hand-write notebooks via heredoc — use `nbformat` / `json.dump` on the cell dict.
- **`analysis/R/analysis.Rmd`** — legacy R companion. Numerical agreement is desirable but no longer enforced; XGBoost stochastic init differs across xgb 3.x. Stress-test, ARIMA, and log-linear MAPE all bit-exact between R and Python.
- **`analysis/shiny/app.R`** — legacy R Shiny. Superseded by PWA for the interactive-app criterion. Kept for reference.
- **`app/`** — installable PWA (Vite 7 + React 19 + TypeScript + Tailwind + vite-plugin-pwa). 6 mobile-first screens. Imports `key_numbers_python.json` at build time — never hand-edit the data file.
- **`exhibits/results/key_numbers_python.json`** — Python-emitted canonical JSON (15 top-level keys: mape_summary, m1/m2/m3a/m3b per country, feature_importance_m3a/m3b, stress_test_2030_aggregate, headline, stirpat, sectoral_residuals_pct, partial_correlations, two_way_fe, vn_vs_ph). **Single source of truth for every number quoted in deliverables and the PWA.**
- **`exhibits/results/key_numbers.json`** — older R-emitted JSON. Retained for cross-check only; do not write to it from Python.
- **`exhibits/figures/fig*.png`** — 13 publication-quality figures, numbered to match report references.
- **`docs/brief/`** — original organiser problem statement and rules. Read before any structural change to the submission.
- **`docs/app_prd.md`** — PWA product requirements doc.

## Numerical-consistency invariant

Every number in `deliverables/` traces back to `exhibits/results/key_numbers_python.json` or a CSV in `data/`. When the analysis changes:

1. Re-execute `analysis/python/analysis.ipynb` (raw WDI must be at `data/WB_WDI_WIDEF.csv`).
2. Verify `exhibits/results/key_numbers_python.json` regenerated (timestamp in `_meta.generated`).
3. Run `cd app && npm run sync-data && npm run build` — confirms PWA picks up new numbers.
4. Update prose in `deliverables/00_executive_one_pager.md`, `01_report.md` §3/§5/§6, `04_vietnam_vs_philippines_deep_dive.md`, `02_pitch_deck_outline.md` Slide 9, `09_hannover_re_executive_memo.md`, and `PROJECT.md` § Headline Findings.
5. If the Shiny app is being kept for any reason: re-sync hard-coded constants in `analysis/shiny/app.R`.

The headline number (USD 135 m / +11 pp loss-ratio swing) is computed from three inputs that must stay aligned across documents: **GWP USD 1.2 bn, base loss ratio 0.62, elasticity 0.7**. These live in the notebook's `CONSTANTS` block (cell 2) and propagate through `key_numbers_python.json`.

## Submission constraints (from `docs/brief/`)

- Report body capped at **10 pages**, 1-inch margins, ≥12 pt font (cover / TOC / bibliography / appendices excluded).
- Final entry = report PDF + source code + ≤ 3 supporting files + AI usage disclosure (`deliverables/ai_usage.md`).
- Each file ≤ 100 MB.
- Source code must include comments; README must explain setup and replication.
- **Modelling must use R or Python only** (the interactive-app deliverable is exempt — PWA is fine).

## When extending the analysis

- **Adding indicators.** Update `KEY_INDICATORS` in cell 5 of the notebook. Update `data/README.md` schema. Re-execute notebook (cleaning regenerates panels in-memory).
- **Adding scenarios.** Update the `scenarios` dict in cell 23 (NGFS perturbation). Re-export JSON. PWA `STRESS_2030` array reflects automatically.
- **Changing portfolio assumptions** (GWP, base LR, elasticity). Edit cell 2 `CONSTANTS` block only — JSON regenerates with new values; PWA picks up; only deliverable prose needs hand-update.

## Notebook authorship rules

- **Never write `.ipynb` via Bash heredoc or `Write` tool with raw JSON strings** — silent empty-file failures occur. Patch via Python script that loads JSON, mutates `nb['cells']`, and writes back. After patching, **re-execute via `jupyter nbconvert --execute`** and confirm cell outputs are populated before declaring success.
- After execution, **save the executed `.ipynb` back over the source** so committed notebook ships with cell outputs visible (judges may not re-run).

## Environment constraints (macOS)

- No sudo. Prefer `pip3 install --user` or `brew install` for system tooling.
- For input simulation use `pynput`, not `keyboard` (which requires root on macOS).
- R install (`brew install --cask r`) needs sudo for `installer -pkg` — block on user; do not attempt.
- PyTorch ≥ 2.6 requires `weights_only=False` for legacy pickle loads.

## What not to do

- Do not introduce randomness without `RANDOM_STATE = 2026` — the seed-2026 reproducibility claim is a credibility anchor.
- Do not let any 2024 information leak into the training set. Specifically: keep `interpolate(limit_direction='forward')` — `'both'` back-fills 2024 into 2023, breaking hold-out hygiene.
- Do not delete the structural (M3b) XGBoost variant in favour of the autoregressive one — the dual spec is a methodological differentiator.
- Do not commit `data/WB_WDI_WIDEF.csv` (243 MB).
- Do not hand-edit `app/src/data/key_numbers_python.json` — it is a build artefact of `npm run sync-data`. Edit upstream in the notebook + re-execute.
- Do not write to `exhibits/results/key_numbers.json` from Python — that file is R-canonical and kept for cross-check. Python writes to `key_numbers_python.json`.
