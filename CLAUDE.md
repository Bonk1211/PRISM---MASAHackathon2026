# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Submission to **MASA Hackathon 2026: R-Ignite** — a climate-risk consulting engagement for a multinational reinsurer (Strategic Partner: **Hannover Re**). The submission converts World Bank WDI data into a 2024 GHG forecast, a 2030 NGFS-scenario stress test, and a quantified loss-ratio impact (~USD 135 m on a USD 1.2 bn notional SEA portfolio).

Read `README.md` and `PROJECT.md` for the full overview. The body of the actual submission lives in `deliverables/` (numbered `00`–`07` for reading order).

**Key dates.** Preliminary submission deadline: 7 May 2026, 23:59 GMT+8. Grand Final presentation: 6 June 2026.

## Common commands

```bash
# Re-render the primary R analysis (data → models → all 13 figures + JSON outputs)
Rscript -e "rmarkdown::render('analysis/R/analysis.Rmd')"

# Run the parallel Python pipeline (XGBoost + SHAP)
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb

# Launch the interactive 6-tab Shiny dashboard
Rscript -e "shiny::runApp('analysis/shiny/app.R', launch.browser = TRUE)"
```

End-to-end pipeline runs in ~3 minutes on a standard laptop. **Random seed is fixed at `2026`** in both R and Python; both implementations must produce identical headline results to four decimal places.

## Required data setup

The raw WDI download (`data/WB_WDI_WIDEF.csv`, ~243 MB) is **not committed** — download from <https://data360.worldbank.org/en/dataset/WB_WDI> in **Wide format** (per the brief). Place at `data/WB_WDI_WIDEF.csv`. The cleaned panels (`sea_panel_clean.csv`, `global_panel_clean.csv`) are committed and re-derivable from the raw download.

## Architecture — the analytical pipeline

The pipeline runs in this strict order; each stage feeds the next, and changing any upstream stage means re-running the rest.

```
WDI Wide format (1,486 indicators × 217 economies × 1960–2024)
    │  curate to 16-indicator panel + reshape to country-year
    ▼
data/{sea,global}_panel_clean.csv
    │  interpolate gaps ≤3y · log-transform GHG/GDP/pop · add lag-1/lag-2
    ▼
modelling frame (1990–2024; 2024 reserved as hold-out)
    │
    ├── M1: per-country log-linear trend       (transparent baseline)
    ├── M2: auto-ARIMA per country             (autocorrelation cross-check)
    ├── M3a: panel XGBoost — autoregressive    ← selected for forecast (2.18% MAPE)
    └── M3b: panel XGBoost — structural-only   ← selected for driver attribution
    │
    ▼
STIRPAT residuals: country-level + 8 sectoral aggregates
    │  + two-way fixed-effects regression with country-cluster-robust SE
    ▼
NGFS Phase V scenario perturbation → 2030 emissions paths
    │  × Swiss Re sigma elasticity (0.7) × portfolio GWP (USD 1.2 bn)
    ▼
2030 loss-ratio impact + capital-buffer recommendation
```

**Two non-obvious design decisions** that must be preserved when modifying:

1. **Two XGBoost specifications, not one.** M3a (with lag-1/lag-2 emissions) wins on forecast accuracy. M3b (no lags) wins on driver attribution because lags would dominate gain. A reinsurance committee needs both. Do not collapse them.
2. **Pairwise vs partial correlations are reported side-by-side** because two indicators (forest area, industry share) flip sign once log-GDP and log-population are partialled out. The diagnostic itself is a headline finding (§3.2 of the report) — do not drop the pairwise column for "tidiness".

## Repository structure conventions

- **`deliverables/`** — what judges read. Files prefixed `00`–`07` indicate reading order. The cedent-screening framework (`05_`), policy crosswalk (`06_`), and Q&A briefing (`07_`) are productised companions to the main report (`01_`); changing the analysis means propagating to all of them.
- **`analysis/`** — R Markdown is the primary pipeline; the Python notebook is a parallel implementation that must agree numerically. Shiny app is the bonus-criterion deliverable.
- **`exhibits/results/*.json`** — single source of truth for every number quoted in the deliverables. If you change a model, regenerate the JSON and grep for any stale numbers in `deliverables/`.
- **`exhibits/figures/fig*.png`** — 13 publication-quality figures, numbered to match report references (`fig5_phil_vs_viet.png` corresponds to Figure 5 in the report).
- **`docs/brief/`** — original organiser problem statement and rules. Read these before making any structural change to the submission.

## Numerical-consistency invariant

Every number in `deliverables/` traces back to a JSON in `exhibits/results/` or a CSV in `data/`. When the analysis changes:

1. Re-run `analysis/R/analysis.Rmd` and `analysis/python/analysis.ipynb` (both — they must agree).
2. Verify `exhibits/results/key_numbers.json` has refreshed.
3. Update prose in `deliverables/01_report.md`, `00_executive_one_pager.md`, `04_vietnam_vs_philippines_deep_dive.md`, and `02_pitch_deck_outline.md` so the numbers match.
4. Re-check the Shiny app's hard-coded reference values in `analysis/shiny/app.R`.

The headline number (loss-ratio swing) is computed from three inputs that must stay aligned across documents: portfolio GWP (USD 1.2 bn), base loss ratio (0.62), elasticity (0.7).

## Submission constraints (from `docs/brief/`)

- Report body capped at **10 pages**, 1-inch margins, ≥12 pt font (cover / TOC / bibliography / appendices excluded).
- Final entry = report PDF + source code + ≤ 3 supporting files + AI usage disclosure (`deliverables/ai_usage.md`).
- Each file ≤ 100 MB.
- Source code must include comments; README must explain setup and replication.

## When extending the analysis

- **Adding indicators.** Update the indicator map in both `analysis/R/analysis.Rmd` data-loading chunk and `analysis/python/analysis.ipynb`. Update `data/README.md` schema. Re-derive panels.
- **Adding scenarios.** Update the NGFS scenario dictionary in both pipelines. Update `01_report.md` §6 table, `00_executive_one_pager.md` numbers, and the Shiny app's stress-test tab.
- **Changing portfolio assumptions** (GWP, base loss ratio, elasticity). All three are referenced in: `01_report.md` §6, `00_executive_one_pager.md`, `04_vietnam_vs_philippines_deep_dive.md`, `06_policy_crosswalk.md` §2.5, and `analysis/shiny/app.R`. Update all together.

## What not to do

- Do not introduce randomness without a seed — the seed-2026 reproducibility claim is a credibility anchor.
- Do not let any 2024 information leak into the training set — 2024 is the held-out test year, and several headline accuracy claims depend on this.
- Do not delete the structural (M3b) XGBoost variant in favour of the autoregressive one — the explicit dual specification is a methodological differentiator.
- Do not commit `data/WB_WDI_WIDEF.csv` (243 MB; exceeds practical repo size).
