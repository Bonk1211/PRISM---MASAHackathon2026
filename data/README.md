# Data Directory

Two cleaned country-year panels derived from the **World Bank — World Development Indicators (Wide format)** release. Both are reproducible from the raw WDI CSV by running `analysis/R/analysis.Rmd` or `analysis/python/analysis.ipynb` end-to-end.

The original WDI download (`WB_WDI_WIDEF.csv`, ~243 MB) is **not committed to the repository** — see [Reproducing from raw](#reproducing-from-raw) below.

---

## Files

| File | Rows | Countries | Years | Purpose |
|---|---:|---:|---|---|
| `sea_panel_clean.csv` | 350 | 10 (SEA) | 1990–2024 | Primary modelling panel — all forecasting, STIRPAT, two-way FE, stress test |
| `global_panel_clean.csv` | 9,275 | 217 | 1960–2024 | Global panel for XGBoost training (borrowing strength across countries) |
| `external/external_features_sea.csv` | 290 | 10 (SEA) | 1995–2024 | EM-DAT (CRED/UCLouvain via HDX) annual disaster totals + ND-GAIN (Notre Dame) adaptive-capacity scores. See `external/README.md` for source URLs, licences, and rebuild script. |

Header row counts as 1; data row counts above exclude it.

### `sea_panel_clean.csv` countries

Brunei Darussalam, Cambodia, Indonesia, Lao PDR, Malaysia, Myanmar, Philippines, Singapore, Thailand, Vietnam.

(Selection: ten ASEAN economies. Timor-Leste excluded for short and partial WDI series — joins ASEAN in 2025.)

---

## Schema (both files)

| Column | Type | Units / definition | WDI code |
|---|---|---|---|
| `country` | string | World Bank `REF_AREA_LABEL` | — |
| `year` | int | Calendar year, 1960–2024 | — |
| `GHG_total_MtCO2e` | float | Total greenhouse gas emissions (Mt CO₂e, AR5, excluding LULUCF) — **modelling target** | `EN_GHG_ALL_MT_CE_AR5` |
| `GHG_per_capita_tCO2e` | float | GHG emissions per capita (t CO₂e) | `EN_GHG_ALL_PC_CE_AR5` |
| `CO2_per_capita_tCO2e` | float | CO₂ emissions per capita (t CO₂) | `EN_GHG_CO2_PC_CE_AR5` |
| `CO2_intensity_GDP` | float | CO₂ emissions per unit of GDP (kg/USD constant 2015) | `EN_GHG_CO2_RT_GDP_KD` |
| `renewable_energy_pct` | float | Renewable energy share of total final energy consumption (%) | `EG_FEC_RNEW_ZS` |
| `renewable_elec_pct` | float | Renewable electricity share of total electricity output (%) | `EG_ELC_RNEW_ZS` |
| `energy_use_pc` | float | Energy use per capita (kg of oil equivalent) | `EG_USE_PCAP_KG_OE` |
| `forest_area_pct` | float | Forest area (% of land area) | `AG_LND_FRST_ZS` |
| `agri_land_pct` | float | Agricultural land (% of land area) | `AG_LND_AGRI_ZS` |
| `GDP_constant_2015USD` | float | GDP, constant 2015 USD | `NY_GDP_MKTP_KD` |
| `GDP_per_capita_2015USD` | float | GDP per capita, constant 2015 USD | `NY_GDP_PCAP_KD` |
| `population` | float | Total population, persons | `SP_POP_TOTL` |
| `urban_pop_pct` | float | Urban population (% of total) | `SP_URB_TOTL_IN_ZS` |
| `industry_pct_GDP` | float | Industry value-added share of GDP (%) | `NV_IND_TOTL_ZS` |
| `agriculture_pct_GDP` | float | Agriculture value-added share of GDP (%) | `NV_AGR_TOTL_ZS` |
| `freshwater_withdrawal_pct` | float | Freshwater withdrawal (% of internal renewable resources) | `ER_H2O_FWTL_ZS` |

(Full WDI codes carry the `WB_WDI_` prefix in the raw file. The mapping is centralised in `KEY_INDICATORS` in the Python codebase — see `docs/code_documentation.md` §3.)

---

## Pre-processing decisions

Documented per judging criterion §6.2 (Modelling and In-Depth Data Analysis: "uses clear and defensible assumptions, and pre-processing steps").

1. **Modelling window restricted to 1990–2024.** UNFCCC baseline year and post-1990 GHG data quality threshold. The global panel keeps the full 1960–2024 history for descriptive use.
2. **Within-country linear interpolation** for missing-data gaps of three years or fewer.
3. **Indicators with > 30 % missingness across the panel are dropped** (none of the 16 retained indicators triggers this).
4. **Log-transformation** applied to GHG, GDP, and population during modelling — to stabilise variance and align with the multiplicative form of the STIRPAT framework. The CSVs hold the **levels**, not the logs; the log columns are computed in code.
5. **2024 actuals are reserved as out-of-sample hold-out.** All model selection (MAPE comparison, hyperparameter tuning) is based exclusively on 2024-out-of-fit performance.
6. **Random seed = 2026** is fixed in both R and Python pipelines for full reproducibility.

---

## Reproducing from raw

```bash
# Step 1 — download the WDI wide-format CSV (~243 MB)
# Source: https://data360.worldbank.org/en/dataset/WB_WDI
# Save as: data/WB_WDI_WIDEF.csv

# Step 2 — re-derive the cleaned panels
Rscript -e "rmarkdown::render('analysis/R/analysis.Rmd')"
# OR
jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb
```

Both pipelines produce identical CSVs (to the same byte length); R writes column order in the same lexical order as Python.

---

## Provenance & vintage

- **Source.** World Bank Group — Data 360. World Development Indicators (WDI). 1,486 indicators × 217 economies × 1960–2024.
- **Download format.** Wide format (per problem brief §2.1).
- **Download date.** 25 April 2026 (post-workshop release).
- **Coverage notes.** SEA panel coverage is high (>97 %) for indicators 1, 4–8, 10–16; lower for `freshwater_withdrawal_pct` (sparse pre-2000) and `renewable_elec_pct` (sparse pre-2000 in low-income SEA economies). Interpolation rule (max gap 3 years) handles the pre-2000 gaps cleanly without producing implausible values.

---

*Cross-references: `analysis/R/analysis.Rmd` data-loading section, `analysis/python/analysis.ipynb` cell 2, `docs/code_documentation.md` §4 (`data_loader.py`), `01_report.md` §2.1 (data section).*

---

## Phase exports — `exhibits/results/key_numbers_python.json`

The notebook emits three top-level keys consumed by the PWA's six-phase narrative (`/phase2`–`/phase4`). Sourced from cells 38–40 of `analysis/python/analysis.ipynb`; no new compute, just relabelling of existing in-memory objects.

### `phase_2_taxonomy` — Risk taxonomy (Phase 2)

Static map of climate-risk categories with engagement-coverage flag and qualitative severity. Three buckets per the TCFD / ISSB IFRS S2 framework: `physical` (`acute` + `chronic` subtypes), `transition` (`drivers` list), and `liability` (`drivers` list). Each bucket carries `covered: bool` and `severity ∈ {"H","M","L"}`. Drives the Phase 2 three-bucket grid in the PWA. Source of truth for which risks the engagement scopes in.

### `phase_3_indicator_map` — Indicator → risk-axis map (Phase 3)

Dict keyed by full WDI code (e.g. `WB_WDI_EN_GHG_ALL_MT_CE_AR5`). Each entry: `{label, risk_axis, rationale, correlation_partial, correlation_pairwise}`. `risk_axis` ∈ `{"transition", "physical_vulnerability", "adaptive_capacity", "exposure_base"}`. The two correlation columns are pulled directly from `corr_df` (cell 12) — preserves the CLAUDE.md-mandated **pairwise vs partial side-by-side** invariant (three indicators flip sign once log-GDP and log-population are partialled out: `forest_area_pct`, `industry_pct_GDP`, `energy_use_pc`). Sectoral GHG components (`sec_*`) are excluded from this map. 16 entries.

### `phase_4_panel_quality` — Panel data-quality summary (Phase 4)

Coverage / missingness / interpolation hygiene of the SEA modelling frame (`sea_panel`):

| Field | Meaning |
|---|---|
| `n_economies` | distinct countries (10 for SEA) |
| `n_years` | distinct years |
| `year_min` / `year_max` | panel year range (1990 / 2024) |
| `total_cells` | `sea_panel.size` (rows × cols) |
| `missing_pct_by_indicator` | dict `{column → pct}` of pre-interp NaN share, per numeric indicator |
| `interp_method` | `"forward_only"` — guards 2024 hold-out hygiene per CLAUDE.md (never `'both'`) |
| `interp_max_run` | `3` — max consecutive years filled by linear interpolation |
| `row_complete_pct` | share of rows with no NaN across all indicator columns, post-interp |

Drives the Phase 4 panel-quality strip; the headline numbers `n_economies=10, year_max=2024` are the regression anchors A5 verifies.
