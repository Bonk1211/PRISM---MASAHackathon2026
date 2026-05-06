# MASA Hackathon 2026 — PRISM Python Code Documentation

**Climate Risk Assessment for a Multinational Reinsurer**

This document contains the complete Python codebase that reproduces every figure, table, and analytical result in the submission. Code is organised by analytical module so it can be read top-to-bottom or referenced by section. All code is tested and produces identical results across runs (random seed = 2026 throughout).

---

## Table of Contents

1. [Project structure](#1-project-structure)
2. [Setup & dependencies](#2-setup--dependencies)
3. [Module: `config.py` — constants and panel definition](#3-module-configpy--constants-and-panel-definition)
4. [Module: `data_loader.py` — load and reshape WDI](#4-module-data_loaderpy--load-and-reshape-wdi)
5. [Module: `preprocessing.py` — interpolation and feature engineering](#5-module-preprocessingpy--interpolation-and-feature-engineering)
6. [Module: `eda.py` — pairwise & partial correlations, decoupling diagnostic](#6-module-edapy--pairwise--partial-correlations-decoupling-diagnostic)
7. [Module: `stirpat.py` — country and sectoral residuals](#7-module-stirpatpy--country-and-sectoral-residuals)
8. [Module: `models.py` — M1 log-linear, M2 ARIMA, M3 XGBoost](#8-module-modelspy--m1-log-linear-m2-arima-m3-xgboost)
9. [Module: `panel_regression.py` — two-way fixed-effects](#9-module-panel_regressionpy--two-way-fixed-effects)
10. [Module: `stress_test.py` — NGFS scenario projections](#10-module-stress_testpy--ngfs-scenario-projections)
11. [Module: `financial_impact.py` — loss-ratio translation](#11-module-financial_impactpy--loss-ratio-translation)
12. [Module: `plotting.py` — all 13 figures](#12-module-plottingpy--all-13-figures)
13. [Entry point: `main.py`](#13-entry-point-mainpy)
14. [How to run](#14-how-to-run)

---

## 1. Project structure

```
masa_python/
├── README.md
├── requirements.txt
├── config.py                  # Constants, indicator panel, country list, scenarios
├── main.py                    # Pipeline orchestrator (entry point)
├── src/
│   ├── __init__.py
│   ├── data_loader.py         # Load WDI, reshape to country-year panel
│   ├── preprocessing.py       # Interpolation, log-transforms, feature engineering
│   ├── eda.py                 # Pairwise / partial correlations, decoupling diagnostic
│   ├── stirpat.py             # STIRPAT regression, country & sectoral residuals
│   ├── models.py              # M1 log-linear, M2 ARIMA, M3 XGBoost (autoreg + structural)
│   ├── panel_regression.py    # Two-way fixed-effects with cluster-robust SE
│   ├── stress_test.py         # 2024-2030 NGFS scenario projections
│   ├── financial_impact.py    # Loss-ratio translation, USD impact
│   └── plotting.py            # All publication-quality figures
├── notebooks/
│   └── analysis.ipynb         # Interactive exploration notebook
└── outputs/                   # Generated figures, JSON results
    ├── fig1_sea_ghg_trajectory.png
    ├── ... (13 figures total)
    └── *.json
```

Designed to open cleanly in VS Code, PyCharm, or any IDE that recognises Python modules. Each `src/` file is a self-contained, importable module with a single analytical responsibility.

---

## 2. Setup & dependencies

### `requirements.txt`

```
pandas>=2.0
numpy>=1.24
scipy>=1.11
scikit-learn>=1.3
statsmodels>=0.14
linearmodels>=5.3
xgboost>=2.0
shap>=0.43
matplotlib>=3.7
seaborn>=0.13
reportlab>=4.0
Pillow>=10.0
jupyter>=1.0
```

### Installation

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Data

Download the World Bank WDI (Wide format, ~243 MB) from <https://data360.worldbank.org/en/dataset/WB_WDI> and save as `data/WB_WDI_WIDEF.csv`.

---

## 3. Module: `config.py` — constants and panel definition

Centralises every magic constant in the project. Edit this file (and only this file) to change the indicator panel, country scope, or financial assumptions.

```python
"""
config.py — Project-wide constants, indicator panel, and assumptions.

Editing this file is the single source of truth for changing:
  * Which indicators enter the analysis
  * Which countries are considered SEA
  * Which NGFS scenarios are used
  * Reinsurance portfolio assumptions (GWP, base loss ratio, elasticity)
  * Random seed for reproducibility

All other modules import from here.
"""
from pathlib import Path

# ---------- Paths ----------
PROJECT_ROOT  = Path(__file__).parent
DATA_DIR      = PROJECT_ROOT / 'data'
OUTPUTS_DIR   = PROJECT_ROOT / 'outputs'
WDI_FILE      = DATA_DIR / 'WB_WDI_WIDEF.csv'

OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ---------- Reproducibility ----------
RANDOM_SEED = 2026

# ---------- Curated 16-indicator panel ----------
# Mapping from full WDI code to short name used throughout the codebase.
KEY_INDICATORS = {
    # Emissions (target + companion measures)
    'WB_WDI_EN_GHG_ALL_MT_CE_AR5':  'GHG_total_MtCO2e',
    'WB_WDI_EN_GHG_ALL_PC_CE_AR5':  'GHG_per_capita_tCO2e',
    'WB_WDI_EN_GHG_CO2_PC_CE_AR5':  'CO2_per_capita_tCO2e',
    'WB_WDI_EN_GHG_CO2_RT_GDP_KD':  'CO2_intensity_GDP',
    # Energy
    'WB_WDI_EG_FEC_RNEW_ZS':        'renewable_energy_pct',
    'WB_WDI_EG_ELC_RNEW_ZS':        'renewable_elec_pct',
    'WB_WDI_EG_USE_PCAP_KG_OE':     'energy_use_pc',
    # Land use
    'WB_WDI_AG_LND_FRST_ZS':        'forest_area_pct',
    'WB_WDI_AG_LND_AGRI_ZS':        'agri_land_pct',
    # Macro
    'WB_WDI_NY_GDP_MKTP_KD':        'GDP_constant_2015USD',
    'WB_WDI_NY_GDP_PCAP_KD':        'GDP_per_capita_2015USD',
    'WB_WDI_SP_POP_TOTL':           'population',
    'WB_WDI_SP_URB_TOTL_IN_ZS':     'urban_pop_pct',
    # Sectoral
    'WB_WDI_NV_IND_TOTL_ZS':        'industry_pct_GDP',
    'WB_WDI_NV_AGR_TOTL_ZS':        'agriculture_pct_GDP',
    # Water
    'WB_WDI_ER_H2O_FWTL_ZS':        'freshwater_withdrawal_pct',
}

# Sectoral GHG indicators for sectoral residual analysis (Section 5)
SECTOR_INDICATORS = {
    'Power Industry':        ['EN_GHG_CO2_PI_MT', 'EN_GHG_CH4_PI_MT', 'EN_GHG_N2O_PI_MT'],
    'Industrial Combustion': ['EN_GHG_CO2_IC_MT', 'EN_GHG_CH4_IC_MT', 'EN_GHG_N2O_IC_MT'],
    'Industrial Processes':  ['EN_GHG_CO2_IP_MT', 'EN_GHG_CH4_IP_MT', 'EN_GHG_N2O_IP_MT',
                              'EN_GHG_FGAS_IP_MT'],
    'Transport':             ['EN_GHG_CO2_TR_MT', 'EN_GHG_CH4_TR_MT', 'EN_GHG_N2O_TR_MT'],
    'Agriculture':           ['EN_GHG_CO2_AG_MT', 'EN_GHG_CH4_AG_MT', 'EN_GHG_N2O_AG_MT'],
    'Waste':                 ['EN_GHG_CO2_WA_MT', 'EN_GHG_CH4_WA_MT', 'EN_GHG_N2O_WA_MT'],
    'Buildings':             ['EN_GHG_CO2_BU_MT', 'EN_GHG_CH4_BU_MT', 'EN_GHG_N2O_BU_MT'],
    'Fugitive (Energy)':     ['EN_GHG_CO2_FE_MT', 'EN_GHG_CH4_FE_MT', 'EN_GHG_N2O_FE_MT'],
}

# ---------- Country scope ----------
SEA = ['Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Vietnam',
       'Singapore', 'Cambodia', 'Myanmar', 'Lao PDR', 'Brunei Darussalam']

# ---------- Modelling window ----------
TRAIN_START_YEAR = 1990   # UNFCCC baseline; AR5 GHG accounting reliable from here
TRAIN_END_YEAR   = 2023   # 2024 reserved as out-of-sample hold-out
TEST_YEAR        = 2024
PROJECTION_END   = 2030

# ---------- NGFS Phase V scenarios ----------
# SEA-region annual GHG growth rate assumption per scenario.
NGFS_SCENARIOS = {
    'Net Zero 2050':         -0.025,    # Orderly transition
    'Delayed Transition':     0.010,    # Disorderly transition
    'Current Policies':       0.025,    # Hot House World
    'Mitigation (proposed)': -0.010,    # Client-specific mitigation lever
}

# ---------- Reinsurance portfolio assumptions ----------
PORTFOLIO_GWP_USDM   = 1200    # USD millions; illustrative SEA gross written premium
BASE_LOSS_RATIO      = 0.62    # Industry baseline
LOSS_TO_EMIS_ELASTICITY = 0.7  # Swiss Re sigma 1/2024 medium-term elasticity
```

---

## 4. Module: `data_loader.py` — load and reshape WDI

Reads the wide-format WDI CSV and reshapes it into a long-then-wide country-year panel. The WDI file contains 105 columns (39 metadata + 66 year columns 1960-2025) and ~289,000 rows; this module filters down to our 16-indicator panel and produces a clean panel in seconds.

```python
"""
src/data_loader.py — Load WDI CSV and reshape to country-year panel.

The WDI Wide-format CSV has structure:
  Metadata cols (STRUCTURE, INDICATOR, REF_AREA_LABEL, ...) + year columns 1960..2025

This module:
  1. Filters to our 16-indicator panel (and SEA + global comparison set)
  2. Melts year columns into a long format
  3. Pivots to a wide country-year panel (one row per country-year)
"""
from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Iterable

from config import KEY_INDICATORS, WDI_FILE


def load_wdi_raw(path=WDI_FILE) -> pd.DataFrame:
    """Read the wide-format WDI CSV. Returns ~289k rows x 105 cols."""
    return pd.read_csv(path, low_memory=False)


def get_year_cols(df: pd.DataFrame) -> list[str]:
    """Return the year columns (1960..2025 as strings) present in the dataframe."""
    return [c for c in df.columns if c.isdigit()]


def build_panel(df_raw: pd.DataFrame,
                indicator_map: dict[str, str] = KEY_INDICATORS,
                countries: Iterable[str] | None = None) -> pd.DataFrame:
    """
    Reshape raw WDI to a country-year panel with one column per indicator.

    Parameters
    ----------
    df_raw : DataFrame
        Output of `load_wdi_raw()`.
    indicator_map : dict
        Maps full WDI code -> short name. Defaults to the 16 curated indicators.
    countries : iterable of str, optional
        If provided, restrict to these REF_AREA_LABEL values.
        If None, return all economies (useful for global-panel XGBoost training).

    Returns
    -------
    DataFrame with columns ['country', 'year', <short_name_1>, ..., <short_name_n>].
    """
    year_cols = get_year_cols(df_raw)

    # Filter rows
    mask = df_raw['INDICATOR'].isin(indicator_map.keys())
    if countries is not None:
        mask &= df_raw['REF_AREA_LABEL'].isin(countries)
    sub = df_raw.loc[mask].copy()
    sub['short'] = sub['INDICATOR'].map(indicator_map)

    # Long format
    long = sub.melt(id_vars=['REF_AREA_LABEL', 'short'],
                    value_vars=year_cols,
                    var_name='year', value_name='value')
    long['year']  = long['year'].astype(int)
    long['value'] = pd.to_numeric(long['value'], errors='coerce')
    long = long.dropna(subset=['value'])

    # Pivot to country-year panel
    panel = (long
             .pivot_table(index=['REF_AREA_LABEL', 'year'],
                          columns='short', values='value')
             .reset_index()
             .rename(columns={'REF_AREA_LABEL': 'country'})
             .sort_values(['country', 'year']))

    panel.columns.name = None  # remove pivot artefact
    return panel
```

---

## 5. Module: `preprocessing.py` — interpolation and feature engineering

Within-country linear interpolation for short gaps, log-transformation of skewed indicators, and creation of lag features for the autoregressive XGBoost.

```python
"""
src/preprocessing.py — Interpolation, log-transformation, lag-feature engineering.

Pre-processing decisions (documented per judging criterion 6.2):
  1. Modelling window 1990-2024 (UNFCCC baseline; post-1990 GHG quality threshold)
  2. Within-country linear interpolation for gaps <= 3 years
  3. Log-transformation of GHG and GDP to stabilise variance
  4. 2024 reserved as hold-out test set
"""
from __future__ import annotations
import pandas as pd
import numpy as np

from config import TRAIN_START_YEAR, TEST_YEAR


def interpolate_panel(panel: pd.DataFrame,
                      max_gap: int = 3) -> pd.DataFrame:
    """
    Within-country linear interpolation for short missing-data gaps.
    Forward-fill trailing NAs (rule = 'both' in pandas).
    """
    feat_cols = [c for c in panel.columns if c not in ('country', 'year')]
    panel = panel.sort_values(['country', 'year']).copy()
    panel[feat_cols] = (panel
                        .groupby('country')[feat_cols]
                        .transform(lambda g: g.interpolate(method='linear',
                                                           limit=max_gap,
                                                           limit_direction='both')))
    return panel


def filter_modelling_window(panel: pd.DataFrame,
                            start_year: int = TRAIN_START_YEAR) -> pd.DataFrame:
    """Restrict panel to start_year onwards (default 1990)."""
    return panel[panel['year'] >= start_year].reset_index(drop=True)


def add_log_transforms(panel: pd.DataFrame) -> pd.DataFrame:
    """Add log_GHG, log_GDP, log_pop columns where the underlying value is positive."""
    panel = panel.sort_values(['country', 'year']).copy()
    panel['log_GHG'] = np.log(panel['GHG_total_MtCO2e'])
    panel['log_GDP'] = np.log(panel['GDP_constant_2015USD'])
    panel['log_pop'] = np.log(panel['population'])
    return panel


def add_lag_features(panel: pd.DataFrame,
                     target: str = 'log_GHG',
                     lags: tuple[int, ...] = (1, 2)) -> pd.DataFrame:
    """
    Add lag-k features grouped by country.
    Used by the autoregressive XGBoost (M3a).
    """
    panel = panel.sort_values(['country', 'year']).copy()
    for k in lags:
        panel[f'{target}_lag{k}'] = panel.groupby('country')[target].shift(k)
    panel['GHG_growth'] = panel['log_GHG'] - panel['log_GHG_lag1']
    return panel


def make_modelling_frame(panel: pd.DataFrame) -> pd.DataFrame:
    """
    One-shot pipeline: interpolate -> filter window -> log-transform -> add lags.

    Returns a panel ready for either structural or autoregressive modelling.
    """
    out = (panel
           .pipe(interpolate_panel)
           .pipe(filter_modelling_window)
           .pipe(add_log_transforms)
           .pipe(add_lag_features))
    return out
```

---

## 6. Module: `eda.py` — pairwise & partial correlations, decoupling diagnostic

The first analytical module. Computes pairwise correlations, partial correlations (controlling for log GDP and log population), and the rolling decoupling diagnostic.

```python
"""
src/eda.py — Exploratory data analysis: correlations and decoupling.

This module produces the inputs for Section 3 of the report:
  - Pairwise correlations of each indicator with log(GHG)
  - Partial correlations after controlling for log_GDP and log_pop
  - Rolling 5-year correlation between log(GDP/cap) and CO2/cap (decoupling)
"""
from __future__ import annotations
import pandas as pd
import numpy as np
from scipy import stats
import statsmodels.api as sm


def pairwise_correlations(panel: pd.DataFrame,
                          target: str = 'log_GHG',
                          year_min: int = 2000,
                          year_max: int = 2023) -> pd.DataFrame:
    """
    Compute pairwise Pearson correlations of all numeric indicators with `target`.

    Returns a DataFrame sorted by absolute correlation, with columns:
      indicator, pearson_r, p_value
    """
    sub = panel[panel['year'].between(year_min, year_max)].copy()
    candidates = [c for c in sub.select_dtypes(include='number').columns
                  if c not in ('year', target)]

    rows = []
    for v in candidates:
        s = sub[[target, v]].dropna()
        if len(s) > 30:
            r, p = stats.pearsonr(s[target], s[v])
            rows.append({'indicator': v, 'pearson_r': r, 'p_value': p})

    out = pd.DataFrame(rows)
    return out.reindex(out['pearson_r'].abs().sort_values(ascending=False).index)


def partial_correlation(df: pd.DataFrame,
                        x: str, y: str,
                        controls: list[str]) -> tuple[float, float]:
    """
    Partial correlation between x and y, controlling for `controls`.
    Implementation: residualise both x and y on controls, then Pearson on residuals.
    """
    d = df[[x, y] + controls].dropna()
    if len(d) < 30:
        return np.nan, np.nan
    res_x = sm.OLS(d[x], sm.add_constant(d[controls])).fit().resid
    res_y = sm.OLS(d[y], sm.add_constant(d[controls])).fit().resid
    return stats.pearsonr(res_x, res_y)


def partial_correlations(panel: pd.DataFrame,
                         target: str = 'log_GHG',
                         controls: list[str] = ('log_GDP', 'log_pop'),
                         year_min: int = 2000,
                         year_max: int = 2023) -> pd.DataFrame:
    """
    Compute partial correlations of each candidate indicator with `target`,
    controlling for the variables in `controls`.
    """
    sub = panel[panel['year'].between(year_min, year_max)].copy()
    controls = list(controls)
    candidates = [c for c in sub.select_dtypes(include='number').columns
                  if c not in ('year', target) + tuple(controls)
                  and c not in ('GDP_constant_2015USD', 'population')]

    rows = []
    for v in candidates:
        r, p = partial_correlation(sub, v, target, controls)
        if not np.isnan(r):
            rows.append({'indicator': v, 'partial_r': r, 'p_value': p})

    out = pd.DataFrame(rows)
    return out.reindex(out['partial_r'].abs().sort_values(ascending=False).index)


def rolling_decoupling(panel: pd.DataFrame,
                       affluence_col: str = 'GDP_per_capita_2015USD',
                       intensity_col: str = 'CO2_per_capita_tCO2e',
                       window: int = 5,
                       year_start: int = 2005,
                       year_end:   int = 2023) -> pd.DataFrame:
    """
    Rolling cross-country correlation of log(affluence) vs intensity,
    over a trailing `window`-year window. Tracks decoupling.
    """
    rows = []
    for end_year in range(year_start, year_end + 1):
        s = panel[panel['year'].between(end_year - window, end_year)][[affluence_col, intensity_col]].dropna()
        if len(s) > 25:
            r, _ = stats.pearsonr(np.log(s[affluence_col]), s[intensity_col])
            rows.append({'year_end': end_year, 'rolling_r': r})
    return pd.DataFrame(rows)
```

---

## 7. Module: `stirpat.py` — country and sectoral residuals

Implements the STIRPAT framework (Dietz & Rosa 1997): `log(Impact) = α + β log(Population) + γ log(GDP) + ε`. The residuals identify country-specific (and sector-specific) idiosyncratic carbon intensity beyond what scale predicts.

```python
"""
src/stirpat.py — STIRPAT regression and residual analysis.

  Aggregate residual: log(GHG) = a + b*log(POP) + c*log(GDP) + e
  Country residual = actual - predicted; positive => emits MORE than scale predicts.

The same logic is applied at the sector level (Power, Industrial Combustion,
Transport, Agriculture, Waste, Buildings, Fugitive, Industrial Processes) to
identify which sector drives each country's deviation.
"""
from __future__ import annotations
import pandas as pd
import numpy as np
import statsmodels.api as sm

from config import SEA, SECTOR_INDICATORS


def fit_stirpat(panel: pd.DataFrame,
                year_min: int = 1990,
                year_max: int = 2023) -> tuple[sm.regression.linear_model.RegressionResultsWrapper, pd.DataFrame]:
    """
    Fit log(GHG) ~ log(POP) + log(GDP) on the GLOBAL panel.

    Returns
    -------
    fit : statsmodels OLS results
    residual_df : DataFrame with columns [country, year, residual, exp_residual_pct]
    """
    df = panel[panel['year'].between(year_min, year_max)].copy()
    df = df.dropna(subset=['log_GHG', 'log_GDP', 'log_pop'])

    X = sm.add_constant(df[['log_pop', 'log_GDP']])
    fit = sm.OLS(df['log_GHG'], X).fit()

    df['predicted_log_GHG'] = fit.predict(X)
    df['residual']          = df['log_GHG'] - df['predicted_log_GHG']
    df['exp_residual_pct']  = (np.exp(df['residual']) - 1) * 100
    return fit, df[['country', 'year', 'residual', 'exp_residual_pct']]


def sea_country_residuals(residual_df: pd.DataFrame,
                          year_window: tuple[int, int] = (2019, 2023)) -> pd.DataFrame:
    """
    Average country-level residuals over a recent window (default 2019-2023)
    for the 10 SEA economies. Positive => over-emitter relative to scale.
    """
    yr_min, yr_max = year_window
    sub = residual_df[residual_df['country'].isin(SEA) &
                      residual_df['year'].between(yr_min, yr_max)]
    out = (sub.groupby('country')['exp_residual_pct'].mean()
              .sort_values(ascending=False)
              .reset_index()
              .rename(columns={'exp_residual_pct': 'residual_pct'}))
    return out


def build_sectoral_panel(df_raw: pd.DataFrame,
                         control_panel: pd.DataFrame) -> pd.DataFrame:
    """
    Build a country-year-sector panel from sectoral GHG indicators.
    Sums across CO2, CH4, N2O within each sector.

    Parameters
    ----------
    df_raw : Raw WDI dataframe (output of data_loader.load_wdi_raw)
    control_panel : Country-year panel with population and GDP (for STIRPAT controls)
    """
    # Build full WDI codes from sectoral partials
    codes, lookup = [], {}
    for sector, partials in SECTOR_INDICATORS.items():
        for p in partials:
            full = f'WB_WDI_{p}_CE_AR5'
            codes.append(full)
            lookup[full] = sector

    sub = df_raw[df_raw['INDICATOR'].isin(codes)].copy()
    sub['sector'] = sub['INDICATOR'].map(lookup)

    year_cols = [c for c in df_raw.columns if c.isdigit()]
    long = sub.melt(id_vars=['REF_AREA_LABEL', 'sector'],
                    value_vars=year_cols,
                    var_name='year', value_name='value')
    long['year']  = long['year'].astype(int)
    long['value'] = pd.to_numeric(long['value'], errors='coerce')
    long = long.dropna(subset=['value'])

    # Sum across the 3 GHG gases within each sector
    sec = (long.groupby(['REF_AREA_LABEL', 'year', 'sector'])['value']
                .sum().reset_index()
                .rename(columns={'REF_AREA_LABEL': 'country', 'value': 'GHG'}))

    # Join control variables (GDP, population) from the main panel
    ctrl = control_panel[['country', 'year', 'GDP_constant_2015USD', 'population']]
    return sec.merge(ctrl, on=['country', 'year'], how='left')


def sectoral_residuals(sectoral_panel: pd.DataFrame,
                       year_window: tuple[int, int] = (2019, 2023)) -> pd.DataFrame:
    """
    Estimate per-sector STIRPAT regression on the global sectoral panel,
    return SEA country residuals averaged over `year_window`.
    """
    sec = sectoral_panel.copy()
    sec['log_GHG'] = np.log(sec['GHG'].clip(lower=0.001))
    sec['log_GDP'] = np.log(sec['GDP_constant_2015USD'])
    sec['log_pop'] = np.log(sec['population'])

    yr_min, yr_max = year_window
    out = []
    for sector, group in sec.groupby('sector'):
        d = group[group['year'].between(1990, 2023) & (group['GHG'] > 0)].dropna(
            subset=['log_GHG', 'log_GDP', 'log_pop'])
        if len(d) < 100:
            continue
        X = sm.add_constant(d[['log_pop', 'log_GDP']])
        fit = sm.OLS(d['log_GHG'], X).fit()
        d = d.copy()
        d['pred'] = fit.predict(X)
        d['residual_pct'] = (np.exp(d['log_GHG'] - d['pred']) - 1) * 100

        sea_avg = (d[d['country'].isin(SEA) & d['year'].between(yr_min, yr_max)]
                   .groupby('country')['residual_pct'].mean().reset_index())
        sea_avg['sector'] = sector
        out.append(sea_avg)

    return pd.concat(out, ignore_index=True)
```

---

## 8. Module: `models.py` — M1 log-linear, M2 ARIMA, M3 XGBoost

Three forecasting models benchmarked on the 2024 hold-out. M3a (autoregressive) is the production forecast; M3b (structural-only) is the driver-attribution model.

```python
"""
src/models.py — Three forecasting models with 2024 hold-out validation.

  M1: Per-country log-linear trend     -- transparent baseline
  M2: Auto-ARIMA per country           -- captures autocorrelation, COVID dip
  M3a: XGBoost panel (autoregressive)  -- best 2024 hold-out MAPE; production forecast
  M3b: XGBoost panel (structural-only) -- best driver story; companion model

All four are compared via SEA-region MAPE on the 2024 hold-out.
"""
from __future__ import annotations
import warnings
import numpy as np
import pandas as pd
import xgboost as xgb
from statsmodels.tsa.arima.model import ARIMA

from config import SEA, RANDOM_SEED, TEST_YEAR
warnings.filterwarnings('ignore')


# ---------------------------------------------------------------
# M1 — Log-linear per-country baseline
# ---------------------------------------------------------------
def m1_log_linear(sea_panel: pd.DataFrame,
                  target_year: int = TEST_YEAR) -> pd.DataFrame:
    """
    Fit `log(GHG_total) ~ year` for each SEA country on training data,
    forecast `target_year`, compare to actual.
    """
    rows = []
    for c in SEA:
        cd = sea_panel[(sea_panel['country'] == c) &
                       (sea_panel['year'] >= 1990) &
                       (sea_panel['year'] < target_year) &
                       sea_panel['GHG_total_MtCO2e'].notna()]
        if len(cd) < 10:
            continue
        slope, icpt = np.polyfit(cd['year'].values,
                                  np.log(cd['GHG_total_MtCO2e'].values), 1)
        pred = np.exp(icpt + slope * target_year)
        actual = sea_panel.loc[(sea_panel['country'] == c) &
                               (sea_panel['year'] == target_year),
                               'GHG_total_MtCO2e'].iloc[0]
        rows.append([c, pred, actual, (pred - actual) / actual * 100])
    df = pd.DataFrame(rows, columns=['country', 'pred_2024', 'actual_2024', 'err_pct'])
    df['abs_err_pct'] = df['err_pct'].abs()
    return df


# ---------------------------------------------------------------
# M2 — Auto-ARIMA per country
# ---------------------------------------------------------------
def _best_arima(series, p_max=2, d_max=2, q_max=2):
    best_aic = np.inf
    best_order, best_fit = None, None
    for p in range(p_max + 1):
        for d in range(d_max + 1):
            for q in range(q_max + 1):
                try:
                    m = ARIMA(series, order=(p, d, q)).fit()
                    if m.aic < best_aic:
                        best_aic, best_order, best_fit = m.aic, (p, d, q), m
                except Exception:
                    pass
    return best_aic, best_order, best_fit


def m2_arima(sea_panel: pd.DataFrame,
             target_year: int = TEST_YEAR) -> pd.DataFrame:
    """Fit auto-ARIMA per country and forecast target_year."""
    rows = []
    for c in SEA:
        s = (sea_panel[sea_panel['country'] == c]
             .set_index('year')['GHG_total_MtCO2e']
             .loc[1990:target_year - 1].dropna())
        if len(s) < 10:
            continue
        _, order, fit = _best_arima(s)
        pred = float(fit.forecast(1).iloc[0])
        actual = sea_panel.loc[(sea_panel['country'] == c) &
                               (sea_panel['year'] == target_year),
                               'GHG_total_MtCO2e'].iloc[0]
        rows.append([c, str(order), pred, actual, (pred - actual) / actual * 100])
    df = pd.DataFrame(rows, columns=['country', 'order', 'pred_2024',
                                     'actual_2024', 'err_pct'])
    df['abs_err_pct'] = df['err_pct'].abs()
    return df


# ---------------------------------------------------------------
# M3a — XGBoost (autoregressive)
# ---------------------------------------------------------------
AUTOREG_FEATURES = ['log_GDP', 'log_pop', 'log_GHG_lag1', 'log_GHG_lag2',
                    'renewable_energy_pct', 'urban_pop_pct', 'industry_pct_GDP',
                    'forest_area_pct', 'CO2_intensity_GDP', 'GDP_per_capita_2015USD']


def m3a_xgboost_autoregressive(global_panel: pd.DataFrame,
                                target_year: int = TEST_YEAR
                                ) -> tuple[pd.DataFrame, xgb.XGBRegressor]:
    """
    Fit XGBoost on the global modelling frame using lagged emissions as features.
    Returns (results_df, fitted_model).
    """
    mdl = global_panel.dropna(
        subset=['log_GHG', 'log_GHG_lag1', 'log_GHG_lag2'] + AUTOREG_FEATURES).copy()
    train = mdl[mdl['year'] < target_year].dropna(subset=AUTOREG_FEATURES)
    test  = mdl[(mdl['year'] == target_year) & (mdl['country'].isin(SEA))].dropna(
        subset=AUTOREG_FEATURES)

    model = xgb.XGBRegressor(
        n_estimators=600, learning_rate=0.04, max_depth=5,
        subsample=0.8, colsample_bytree=0.8,
        objective='reg:squarederror', random_state=RANDOM_SEED)
    model.fit(train[AUTOREG_FEATURES], train['log_GHG'])

    pred = np.exp(model.predict(test[AUTOREG_FEATURES]))
    actual = np.exp(test['log_GHG'].values)
    df = pd.DataFrame({'country': test['country'].values,
                       'pred_2024': pred, 'actual_2024': actual})
    df['err_pct']     = (df['pred_2024'] - df['actual_2024']) / df['actual_2024'] * 100
    df['abs_err_pct'] = df['err_pct'].abs()
    return df, model


# ---------------------------------------------------------------
# M3b — XGBoost (structural-only, no lags)
# ---------------------------------------------------------------
STRUCTURAL_FEATURES = ['log_GDP', 'log_pop', 'renewable_energy_pct', 'urban_pop_pct',
                      'industry_pct_GDP', 'forest_area_pct', 'CO2_intensity_GDP',
                      'GDP_per_capita_2015USD', 'agriculture_pct_GDP', 'energy_use_pc']


def m3b_xgboost_structural(global_panel: pd.DataFrame,
                            target_year: int = TEST_YEAR
                            ) -> tuple[pd.DataFrame, xgb.XGBRegressor]:
    """
    Same as M3a but excluding lagged emissions. Used for driver attribution
    (the structural feature importance ranking that validates STIRPAT).
    """
    mdl = global_panel.dropna(subset=['log_GHG'] + STRUCTURAL_FEATURES).copy()
    train = mdl[mdl['year'] < target_year]
    test  = mdl[(mdl['year'] == target_year) & (mdl['country'].isin(SEA))]

    model = xgb.XGBRegressor(
        n_estimators=600, learning_rate=0.04, max_depth=5,
        subsample=0.8, colsample_bytree=0.8,
        objective='reg:squarederror', random_state=RANDOM_SEED)
    model.fit(train[STRUCTURAL_FEATURES], train['log_GHG'])

    pred = np.exp(model.predict(test[STRUCTURAL_FEATURES]))
    actual = np.exp(test['log_GHG'].values)
    df = pd.DataFrame({'country': test['country'].values,
                       'pred_2024': pred, 'actual_2024': actual})
    df['err_pct']     = (df['pred_2024'] - df['actual_2024']) / df['actual_2024'] * 100
    df['abs_err_pct'] = df['err_pct'].abs()
    return df, model


def feature_importance(model: xgb.XGBRegressor,
                       feature_names: list[str]) -> pd.DataFrame:
    """Return a DataFrame of XGBoost feature importance (gain), sorted desc."""
    return (pd.DataFrame({'feature': feature_names,
                          'gain': model.feature_importances_})
              .sort_values('gain', ascending=False)
              .reset_index(drop=True))
```

---

## 9. Module: `panel_regression.py` — two-way fixed-effects

Two-way fixed-effects with cluster-robust standard errors. Tests which structural drivers survive the most demanding panel specification.

```python
"""
src/panel_regression.py — Two-way fixed-effects regression for robustness.

  Pooled OLS:        baseline, treats observations as independent
  Country FE:        absorbs persistent country features (institutions, geography)
  Two-way FE:        also absorbs global time shocks (oil prices, COVID)
                     Cluster-robust standard errors at country level

Coefficients are standardised (z-score) for comparability across drivers.
"""
from __future__ import annotations
import pandas as pd
import statsmodels.api as sm
from linearmodels.panel import PanelOLS

from config import SEA


FE_FEATURES = ['log_GDP', 'log_pop', 'renewable_energy_pct', 'urban_pop_pct',
               'industry_pct_GDP', 'CO2_intensity_GDP', 'forest_area_pct']


def _standardise(s: pd.Series) -> pd.Series:
    return (s - s.mean()) / s.std()


def prepare_panel(panel: pd.DataFrame,
                  year_min: int = 1995,
                  year_max: int = 2023) -> pd.DataFrame:
    """Subset to SEA + year range, drop NA, add z-scored covariates."""
    sub = panel[panel['country'].isin(SEA) &
                panel['year'].between(year_min, year_max)].copy()
    sub = sub.dropna(subset=['log_GHG'] + FE_FEATURES)
    for c in FE_FEATURES:
        sub[c + '_z'] = _standardise(sub[c])
    return sub


def fit_three_specifications(panel_clean: pd.DataFrame) -> dict:
    """
    Fit pooled OLS, country FE, and two-way FE on the same panel.
    Returns a dict with R^2 stats and a coefficient comparison table.
    """
    exog_cols = [c + '_z' for c in FE_FEATURES]
    panel_idx = panel_clean.set_index(['country', 'year'])

    # Pooled OLS
    exog = sm.add_constant(panel_idx[exog_cols])
    m_pool = sm.OLS(panel_idx['log_GHG'], exog).fit(cov_type='HC3')

    # Country FE
    m_cfe = PanelOLS(panel_idx['log_GHG'], panel_idx[exog_cols],
                     entity_effects=True
                    ).fit(cov_type='clustered', cluster_entity=True)

    # Two-way FE
    m_2fe = PanelOLS(panel_idx['log_GHG'], panel_idx[exog_cols],
                     entity_effects=True, time_effects=True
                    ).fit(cov_type='clustered', cluster_entity=True)

    def _table(model, name, is_panel=False):
        if is_panel:
            return pd.DataFrame({
                f'{name}_coef': model.params.round(3),
                f'{name}_se':   model.std_errors.round(3),
                f'{name}_p':    model.pvalues.round(4)})
        else:
            params = model.params.drop('const', errors='ignore')
            return pd.DataFrame({
                f'{name}_coef': params.round(3),
                f'{name}_se':   model.bse.drop('const', errors='ignore').round(3),
                f'{name}_p':    model.pvalues.drop('const', errors='ignore').round(4)})

    joined = pd.concat([_table(m_pool, 'Pooled', False),
                        _table(m_cfe,  'CountryFE', True),
                        _table(m_2fe,  'TwoWayFE',  True)], axis=1)
    joined.index = [c.replace('_z', '') for c in joined.index]

    return {
        'pooled_R2':           round(m_pool.rsquared, 3),
        'country_FE_within_R2': round(m_cfe.rsquared_within, 3),
        'two_way_FE_within_R2': round(m_2fe.rsquared_within, 3),
        'coefficients': joined,
    }
```

---

## 10. Module: `stress_test.py` — NGFS scenario projections

Project 2024 emissions out to 2030 under each NGFS scenario plus the proposed mitigation lever.

```python
"""
src/stress_test.py — 2024-2030 emission projections under NGFS scenarios.

We apply NGFS Phase V scenarios (the de-facto standard, cross-referenced in
BNM CRST 2024). Growth rates per scenario are SEA-region calibrations
defined in config.NGFS_SCENARIOS.
"""
from __future__ import annotations
import pandas as pd

from config import SEA, NGFS_SCENARIOS, TEST_YEAR, PROJECTION_END


def project_country(sea_panel: pd.DataFrame,
                    country: str,
                    scenarios: dict = NGFS_SCENARIOS,
                    base_year: int = TEST_YEAR,
                    end_year:  int = PROJECTION_END) -> pd.DataFrame:
    """
    Project a single country's GHG out to `end_year` under each scenario.
    Returns long-format DataFrame with columns [country, scenario, year, emissions].
    """
    base = sea_panel.loc[(sea_panel['country'] == country) &
                         (sea_panel['year'] == base_year),
                         'GHG_total_MtCO2e']
    if len(base) == 0:
        return pd.DataFrame()
    base = base.iloc[0]

    rows = []
    for scen, growth in scenarios.items():
        for y in range(base_year, end_year + 1):
            rows.append([country, scen, y, base * (1 + growth) ** (y - base_year)])
    return pd.DataFrame(rows, columns=['country', 'scenario', 'year', 'emissions'])


def project_all_sea(sea_panel: pd.DataFrame, **kwargs) -> pd.DataFrame:
    """Run project_country across all 10 SEA economies and concatenate."""
    return pd.concat([project_country(sea_panel, c, **kwargs) for c in SEA],
                     ignore_index=True)
```

---

## 11. Module: `financial_impact.py` — loss-ratio translation

Convert emission paths to expected reinsurance loss using the Swiss Re sigma 1/2024 elasticity assumption.

```python
"""
src/financial_impact.py — Translate emission paths to reinsurance loss-ratio impact.

  Method (Swiss Re sigma 1/2024 convention):
    Insured catastrophe losses scale ~linearly with regional emissions in the
    medium term, with elasticity ~0.7. Apply this elasticity to the emission
    delta vs the Hot House World baseline:

      loss_ratio = base_LR * (1 + elasticity * pct_change_vs_baseline)
      expected_loss = loss_ratio * GWP
"""
from __future__ import annotations
import pandas as pd

from config import (PORTFOLIO_GWP_USDM, BASE_LOSS_RATIO,
                    LOSS_TO_EMIS_ELASTICITY, PROJECTION_END)


def compute_loss_impact(projection_df: pd.DataFrame,
                        baseline_scenario: str = 'Current Policies',
                        gwp_usdm: float = PORTFOLIO_GWP_USDM,
                        base_lr: float = BASE_LOSS_RATIO,
                        elasticity: float = LOSS_TO_EMIS_ELASTICITY,
                        end_year: int = PROJECTION_END) -> pd.DataFrame:
    """
    Aggregate SEA emissions at end_year by scenario, translate to loss ratio
    and expected loss in USD millions.
    """
    agg = (projection_df[projection_df['year'] == end_year]
           .groupby('scenario')['emissions'].sum().reset_index())

    ref = agg.loc[agg['scenario'] == baseline_scenario, 'emissions'].iloc[0]
    agg['pct_change']           = agg['emissions'] / ref - 1
    agg['expected_loss_ratio']  = base_lr * (1 + elasticity * agg['pct_change'])
    agg['expected_loss_USDm']   = agg['expected_loss_ratio'] * gwp_usdm

    return agg.sort_values('expected_loss_USDm').reset_index(drop=True)
```

---

## 12. Module: `plotting.py` — all 13 figures

Every figure used in the analysis. Each function takes the relevant data and saves a PNG to `outputs/`.

```python
"""
src/plotting.py — All 13 figures used in the analysis.

Each function is self-contained and saves to `config.OUTPUTS_DIR`.
Naming convention preserves chronological order of generation (fig1...fig13).
"""
from __future__ import annotations
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from config import OUTPUTS_DIR, SEA, NGFS_SCENARIOS

sns.set_style('whitegrid')
plt.rcParams.update({'figure.dpi': 130, 'font.size': 10.5,
                     'axes.titleweight': 'bold'})


def fig1_sea_trajectory(sea_panel: pd.DataFrame):
    """SEA emissions trajectory 1990-2024 on log scale."""
    fig, ax = plt.subplots(figsize=(11, 5.5))
    palette = sns.color_palette('viridis', len(SEA))
    for i, c in enumerate(SEA):
        d = sea_panel[sea_panel['country'] == c]
        ax.plot(d['year'], d['GHG_total_MtCO2e'], lw=1.6, color=palette[i], label=c)
        last = d[d['year'] == 2024]
        if len(last):
            ax.scatter(last['year'], last['GHG_total_MtCO2e'],
                       color=palette[i], s=35, zorder=5)
    ax.set_yscale('log')
    ax.set_title('SEA total GHG emissions, 1990-2024 (log scale)')
    ax.set_ylabel('Mt CO2-equivalent (excl. LULUCF)')
    ax.legend(loc='center left', bbox_to_anchor=(1.0, 0.5), fontsize=9)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig1_sea_ghg_trajectory.png', bbox_inches='tight')
    plt.close()


def fig2_model_comparison(mape_dict: dict[str, float]):
    """Bar chart of MAPE across the three forecast models."""
    fig, ax = plt.subplots(figsize=(7.5, 4))
    mods, mapes = list(mape_dict.keys()), list(mape_dict.values())
    clrs = ['#95a5a6', '#3498db', '#27ae60'][:len(mods)]
    bars = ax.bar(mods, mapes, color=clrs, edgecolor='black', linewidth=0.6)
    for b, v in zip(bars, mapes):
        ax.text(b.get_x() + b.get_width()/2, v + 0.1, f'{v:.2f}%',
                ha='center', fontweight='bold')
    ax.set_ylabel('SEA 2024 hold-out MAPE (%)')
    ax.set_title('Model comparison - out-of-sample 2024 MAPE')
    ax.set_ylim(0, max(mapes) * 1.25)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig2_model_comparison.png', bbox_inches='tight')
    plt.close()


def fig3_feature_importance(imp_df: pd.DataFrame, top_n: int = 10):
    """Horizontal bar chart of XGBoost (autoregressive) feature gains."""
    fig, ax = plt.subplots(figsize=(8, 5))
    top = imp_df.head(top_n)
    ax.barh(top['feature'][::-1], top['gain'][::-1], color='#2c3e50')
    ax.set_title('XGBoost feature importance (gain)')
    ax.set_xlabel('Gain')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig3_feature_importance.png', bbox_inches='tight')
    plt.close()


def fig4_stress_test(projection_df: pd.DataFrame, top_emitters=None):
    """2x2 panel: 2030 emission paths under all scenarios for top-4 emitters."""
    if top_emitters is None:
        top_emitters = ['Indonesia', 'Vietnam', 'Thailand', 'Philippines']
    sc_clr = {'Net Zero 2050':         '#27ae60',
              'Delayed Transition':    '#f39c12',
              'Current Policies':      '#c0392b',
              'Mitigation (proposed)': '#2980b9'}
    fig, axes = plt.subplots(2, 2, figsize=(11, 7), sharex=True)
    for ax, c in zip(axes.ravel(), top_emitters):
        d = projection_df[projection_df['country'] == c]
        for sc, sd in d.groupby('scenario'):
            ax.plot(sd['year'], sd['emissions'], lw=1.7, marker='o', ms=3.5,
                    color=sc_clr.get(sc, 'gray'), label=sc)
        ax.set_title(c); ax.set_ylabel('Mt CO2e'); ax.grid(alpha=0.3)
    axes[0, 0].legend(loc='upper left', fontsize=8.5)
    fig.suptitle('2030 GHG projections under NGFS scenarios + proposed mitigation',
                 y=1.01, fontsize=13)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig4_stress_test_2030.png', bbox_inches='tight')
    plt.close()


def fig5_phil_vs_viet(sea_panel: pd.DataFrame):
    """Side-by-side: total emissions and per-capita for Phil vs Vietnam."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))
    for ax, metric, title in [
        (axes[0], 'GHG_total_MtCO2e',     'Total GHG emissions'),
        (axes[1], 'GHG_per_capita_tCO2e', 'GHG per capita')]:
        for c, color in [('Philippines', '#0070C0'), ('Vietnam', '#C00000')]:
            d = sea_panel[sea_panel['country'] == c]
            ax.plot(d['year'], d[metric], lw=1.8, label=c, color=color)
        ax.set_title(title); ax.legend(); ax.grid(alpha=0.3)
    fig.suptitle('Philippines vs Vietnam - 1990-2024', y=1.02, fontsize=13)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig5_phil_vs_viet.png', bbox_inches='tight')
    plt.close()


def fig6_loss_impact(loss_df: pd.DataFrame):
    """Horizontal bar of expected loss by scenario in USD m."""
    sc_clr = {'Net Zero 2050':         '#27ae60',
              'Mitigation (proposed)': '#2980b9',
              'Delayed Transition':    '#f39c12',
              'Current Policies':      '#c0392b'}
    fig, ax = plt.subplots(figsize=(8.5, 4))
    bars = ax.barh(loss_df['scenario'], loss_df['expected_loss_USDm'],
                   color=[sc_clr.get(s, 'gray') for s in loss_df['scenario']])
    for b, v in zip(bars, loss_df['expected_loss_USDm']):
        ax.text(v + 5, b.get_y() + b.get_height()/2, f'USD {v:,.0f}m',
                va='center', fontsize=9.5, fontweight='bold')
    ax.set_xlim(0, loss_df['expected_loss_USDm'].max() * 1.18)
    ax.set_xlabel('Expected loss (USD m) on USD 1.2 bn GWP')
    ax.set_title('2030 expected loss by scenario  (elasticity 0.7, base LR 62%)')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig6_loss_ratio_impact.png', bbox_inches='tight')
    plt.close()


def fig7_correlation_heatmap(sea_panel: pd.DataFrame, year_min=2000, year_max=2023):
    """Full 16-indicator correlation matrix on SEA panel."""
    feat_cols = [c for c in sea_panel.select_dtypes(include='number').columns
                 if c != 'year']
    fig, ax = plt.subplots(figsize=(11, 8))
    corr = sea_panel[sea_panel['year'].between(year_min, year_max)][feat_cols].corr()
    sns.heatmap(corr, cmap='RdBu_r', center=0, annot=True, fmt='.2f',
                annot_kws={'size': 8}, cbar_kws={'shrink': 0.7}, ax=ax)
    ax.set_title('Correlation matrix - SEA panel, 2000-2023')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig7_correlation_heatmap.png', bbox_inches='tight')
    plt.close()


def fig8_structural_drivers(imp_df: pd.DataFrame):
    """Structural-only XGBoost feature importance."""
    fig, ax = plt.subplots(figsize=(8, 5))
    imp_sorted = imp_df.sort_values('gain')
    ax.barh(imp_sorted['feature'], imp_sorted['gain'], color='#2980b9')
    ax.set_title('Structural drivers of GHG in SEA  (XGBoost, no autoregressive lags)')
    ax.set_xlabel('Gain')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig8_structural_drivers.png', bbox_inches='tight')
    plt.close()


def fig9_pairwise_vs_partial(pairwise_df: pd.DataFrame, partial_df: pd.DataFrame):
    """Side-by-side bar comparison of pairwise (raw) vs partial correlations."""
    merged = (pairwise_df.merge(partial_df, on='indicator', how='outer')
              .dropna(subset=['pearson_r', 'partial_r'])
              .sort_values('pearson_r'))
    y = np.arange(len(merged))
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(y - 0.2, merged['pearson_r'], height=0.4, color='#95a5a6',
            edgecolor='black', linewidth=0.5, label='Pairwise (raw)')
    ax.barh(y + 0.2, merged['partial_r'], height=0.4, color='#2980b9',
            edgecolor='black', linewidth=0.5,
            label='Partial (after controlling for GDP & population)')
    ax.set_yticks(y); ax.set_yticklabels(merged['indicator'])
    ax.axvline(0, color='black', linewidth=0.7)
    ax.set_xlabel('Correlation with log(GHG)')
    ax.set_title('Pairwise vs partial correlations - what survives after controlling for scale?')
    ax.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig9_pairwise_vs_partial.png', bbox_inches='tight')
    plt.close()


def fig10_stirpat_residuals(country_resid_df: pd.DataFrame):
    """Horizontal bar of country STIRPAT residuals."""
    df = country_resid_df.sort_values('residual_pct')
    fig, ax = plt.subplots(figsize=(9, 5))
    clrs = ['#c0392b' if v > 0 else '#27ae60' for v in df['residual_pct']]
    ax.barh(df['country'], df['residual_pct'], color=clrs,
            edgecolor='black', linewidth=0.5)
    for i, (c, v) in enumerate(zip(df['country'], df['residual_pct'])):
        ax.text(v + (3 if v > 0 else -3), i, f'{v:+.0f}%',
                va='center', ha='left' if v > 0 else 'right',
                fontweight='bold', fontsize=9.5)
    ax.axvline(0, color='black', linewidth=0.7)
    ax.set_xlabel('% deviation from STIRPAT prediction (2019-2023 avg)')
    ax.set_title('Idiosyncratic emissions risk - over- vs under-emitters in SEA\n'
                 '(controlling for population x GDP)', fontsize=11.5)
    xmax = max(abs(df['residual_pct'].min()), df['residual_pct'].max())
    ax.set_xlim(-xmax * 1.4, xmax * 1.4)
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig10_stirpat_residuals.png', bbox_inches='tight')
    plt.close()


def fig11_decoupling(decoupling_df: pd.DataFrame):
    """Rolling correlation of log(GDP/cap) vs CO2/cap over time."""
    fig, ax = plt.subplots(figsize=(9, 4.5))
    ax.plot(decoupling_df['year_end'], decoupling_df['rolling_r'],
            color='#1a2942', linewidth=2, marker='o', markersize=4)
    ax.axhline(0, color='gray', linestyle='--', linewidth=0.6)
    ax.fill_between(decoupling_df['year_end'], 0, decoupling_df['rolling_r'],
                    where=(decoupling_df['rolling_r'] > 0), alpha=0.2,
                    color='#c0392b', label='Coupled')
    ax.fill_between(decoupling_df['year_end'], 0, decoupling_df['rolling_r'],
                    where=(decoupling_df['rolling_r'] <= 0), alpha=0.2,
                    color='#27ae60', label='Decoupled')
    ax.set_xlabel('Trailing 5-year window ending'); ax.set_ylabel('Pearson r')
    ax.set_title('Decoupling diagnostic - rolling correlation of log(GDP/cap) vs CO2/cap in SEA')
    ax.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig11_decoupling_diagnostic.png', bbox_inches='tight')
    plt.close()


def fig12_sectoral_residuals(sectoral_df: pd.DataFrame):
    """Heatmap of country x sector residuals."""
    pivot = sectoral_df.pivot(index='country', columns='sector', values='residual_pct').loc[SEA]
    fig, ax = plt.subplots(figsize=(11, 5.5))
    sns.heatmap(pivot, cmap='RdBu_r', center=0, annot=True, fmt='.0f',
                annot_kws={'size': 9, 'weight': 'bold'},
                cbar_kws={'label': '% deviation from STIRPAT prediction', 'shrink': 0.8},
                linewidths=0.4, linecolor='white', ax=ax,
                vmin=-200, vmax=200)
    ax.set_title("Sectoral STIRPAT residuals - which sectors drive each country's "
                 "over/under-emission?\n(2019-2023 avg; positive = sector emits more "
                 "than population x GDP would predict)", fontsize=11.5, pad=14)
    ax.set_xlabel(''); ax.set_ylabel('')
    plt.xticks(rotation=20, ha='right')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig12_sectoral_residuals.png', bbox_inches='tight')
    plt.close()


def fig13_two_way_FE(coef_table: pd.DataFrame,
                     order: list[str] | None = None):
    """Coefficient comparison across pooled / country-FE / two-way-FE."""
    if order is None:
        order = ['log_GDP', 'log_pop', 'industry_pct_GDP', 'CO2_intensity_GDP',
                 'urban_pop_pct', 'forest_area_pct', 'renewable_energy_pct']
    y = np.arange(len(order))
    w = 0.27
    fig, ax = plt.subplots(figsize=(10, 6))
    for i, (col_pref, color, label) in enumerate([
            ('Pooled',    '#95a5a6', 'Pooled OLS'),
            ('CountryFE', '#3498db', 'Country FE'),
            ('TwoWayFE',  '#27ae60', 'Two-way FE (country+year)')]):
        coefs = [coef_table.loc[v, f'{col_pref}_coef'] for v in order]
        ses   = [coef_table.loc[v, f'{col_pref}_se']   for v in order]
        ax.barh(y + (i - 1) * w, coefs, height=w * 0.9, color=color, alpha=0.85,
                xerr=ses, error_kw={'linewidth': 1, 'ecolor': 'black'},
                edgecolor='black', linewidth=0.5, label=label)
    ax.set_yticks(y); ax.set_yticklabels(order)
    ax.axvline(0, color='black', linewidth=0.7)
    ax.set_xlabel('Standardised coefficient on log(GHG)  [+/- 1 cluster-robust SE]')
    ax.set_title('SEA panel - standardised driver coefficients across three FE specifications')
    ax.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(OUTPUTS_DIR / 'fig13_two_way_FE.png', bbox_inches='tight')
    plt.close()
```

---

## 13. Entry point: `main.py`

The orchestrator. Runs the full pipeline from raw WDI to all 13 figures and `key_numbers.json` in approximately 3 minutes.

```python
"""
main.py — End-to-end pipeline orchestrator.

Run from project root with:
    python main.py

Produces:
    outputs/fig1..fig13.png    (13 figures)
    outputs/key_numbers.json   (all numerical results)
    data/sea_panel_clean.csv   (cleaned SEA panel, used by Shiny app)
    data/global_panel_clean.csv (cleaned global panel)
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

# Make src/ importable
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from config import (SEA, OUTPUTS_DIR, DATA_DIR, RANDOM_SEED,
                    PORTFOLIO_GWP_USDM, BASE_LOSS_RATIO, LOSS_TO_EMIS_ELASTICITY)
from data_loader import load_wdi_raw, build_panel
from preprocessing import make_modelling_frame, interpolate_panel, filter_modelling_window
from eda import pairwise_correlations, partial_correlations, rolling_decoupling
from stirpat import (fit_stirpat, sea_country_residuals,
                     build_sectoral_panel, sectoral_residuals)
from models import (m1_log_linear, m2_arima,
                    m3a_xgboost_autoregressive, m3b_xgboost_structural,
                    feature_importance, AUTOREG_FEATURES, STRUCTURAL_FEATURES)
from panel_regression import prepare_panel, fit_three_specifications
from stress_test import project_all_sea
from financial_impact import compute_loss_impact
from plotting import (fig1_sea_trajectory, fig2_model_comparison,
                      fig3_feature_importance, fig4_stress_test,
                      fig5_phil_vs_viet, fig6_loss_impact,
                      fig7_correlation_heatmap, fig8_structural_drivers,
                      fig9_pairwise_vs_partial, fig10_stirpat_residuals,
                      fig11_decoupling, fig12_sectoral_residuals,
                      fig13_two_way_FE)
import numpy as np
np.random.seed(RANDOM_SEED)


def main():
    print("[1/8] Loading WDI...")
    df_raw = load_wdi_raw()

    print("[2/8] Building country-year panels...")
    sea_panel    = build_panel(df_raw, countries=SEA)
    global_panel = build_panel(df_raw)            # all economies for XGBoost training

    sea_clean    = make_modelling_frame(sea_panel)
    global_clean = make_modelling_frame(global_panel)

    sea_clean.to_csv(DATA_DIR / 'sea_panel_clean.csv', index=False)
    global_clean.to_csv(DATA_DIR / 'global_panel_clean.csv', index=False)

    print("[3/8] EDA - pairwise & partial correlations...")
    pairwise = pairwise_correlations(sea_clean)
    partial  = partial_correlations(sea_clean)
    decoupling = rolling_decoupling(sea_clean[sea_clean['country'].isin(SEA)])

    print("[4/8] STIRPAT residuals...")
    _, residual_df = fit_stirpat(global_clean)
    country_resid = sea_country_residuals(residual_df)

    sec_panel = build_sectoral_panel(df_raw, global_clean)
    sec_resid = sectoral_residuals(sec_panel)

    print("[5/8] Forecasting models (M1, M2, M3a, M3b)...")
    m1 = m1_log_linear(sea_clean)
    m2 = m2_arima(sea_clean)
    m3a, model_3a = m3a_xgboost_autoregressive(global_clean)
    m3b, model_3b = m3b_xgboost_structural(global_clean)
    imp_3a = feature_importance(model_3a, AUTOREG_FEATURES)
    imp_3b = feature_importance(model_3b, STRUCTURAL_FEATURES)

    print("[6/8] Two-way fixed-effects regression...")
    fe_panel = prepare_panel(global_clean)
    fe_results = fit_three_specifications(fe_panel)

    print("[7/8] Stress test + financial impact...")
    projection = project_all_sea(sea_clean[sea_clean['country'].isin(SEA)])
    loss = compute_loss_impact(projection)

    print("[8/8] Generating figures...")
    sea_for_plot = sea_clean[sea_clean['country'].isin(SEA)]
    fig1_sea_trajectory(sea_for_plot)
    fig2_model_comparison({'M1: Log-linear': m1['abs_err_pct'].mean(),
                           'M2: ARIMA':      m2['abs_err_pct'].mean(),
                           'M3: XGBoost':    m3a['abs_err_pct'].mean()})
    fig3_feature_importance(imp_3a)
    fig4_stress_test(projection)
    fig5_phil_vs_viet(sea_for_plot)
    fig6_loss_impact(loss)
    fig7_correlation_heatmap(sea_for_plot)
    fig8_structural_drivers(imp_3b)
    fig9_pairwise_vs_partial(pairwise, partial)
    fig10_stirpat_residuals(country_resid)
    fig11_decoupling(decoupling)
    fig12_sectoral_residuals(sec_resid)
    fig13_two_way_FE(fe_results['coefficients'])

    # Persist all numerical results
    out = {
        'mape_summary': {
            'log_linear': round(m1['abs_err_pct'].mean(), 2),
            'ARIMA':      round(m2['abs_err_pct'].mean(), 2),
            'XGBoost_autoregressive': round(m3a['abs_err_pct'].mean(), 2),
            'XGBoost_structural':     round(m3b['abs_err_pct'].mean(), 2),
        },
        'feature_importance_autoregressive': imp_3a.round(4).to_dict('records'),
        'feature_importance_structural':     imp_3b.round(4).to_dict('records'),
        'stirpat_country_residuals':         country_resid.round(1).to_dict('records'),
        'fe_results': {
            'pooled_R2':            fe_results['pooled_R2'],
            'country_FE_within_R2': fe_results['country_FE_within_R2'],
            'two_way_FE_within_R2': fe_results['two_way_FE_within_R2'],
        },
        'stress_test_2030_aggregate': loss.round(3).to_dict('records'),
    }
    with open(OUTPUTS_DIR / 'key_numbers.json', 'w') as f:
        json.dump(out, f, indent=2, default=str)

    print("\nPipeline complete. Outputs in", OUTPUTS_DIR)
    print(f"  M1 MAPE: {m1['abs_err_pct'].mean():.2f}%")
    print(f"  M2 MAPE: {m2['abs_err_pct'].mean():.2f}%")
    print(f"  M3a MAPE: {m3a['abs_err_pct'].mean():.2f}%   <-- selected")
    print(f"  M3b MAPE: {m3b['abs_err_pct'].mean():.2f}%   (structural-only)")


if __name__ == '__main__':
    main()
```

---

## 14. How to run

```bash
# 1. Set up environment
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Place the WDI download
mkdir -p data
# Download WB_WDI_WIDEF.csv from https://data360.worldbank.org/en/dataset/WB_WDI
# Save it to data/WB_WDI_WIDEF.csv

# 3. Run the pipeline
python main.py
```

Expected runtime: **~3 minutes** on a standard laptop. Output:

- `outputs/fig1..fig13.png` — all 13 figures
- `outputs/key_numbers.json` — every numerical result, machine-readable
- `data/sea_panel_clean.csv` — cleaned SEA panel (also consumed by the R Shiny app)
- `data/global_panel_clean.csv` — cleaned global panel

### Reproducibility

- Random seed = **2026** throughout
- 2024 reserved as out-of-sample hold-out (no leakage)
- All stochastic steps (XGBoost, ARIMA grid search) are deterministic given the seed

### Module dependency graph

```
main.py
  ├── data_loader.py     (no internal deps)
  ├── preprocessing.py   (no internal deps)
  ├── eda.py             (uses preprocessing output)
  ├── stirpat.py         (uses data_loader + preprocessing)
  ├── models.py          (uses preprocessing output)
  ├── panel_regression.py (uses preprocessing output)
  ├── stress_test.py     (uses preprocessing output)
  ├── financial_impact.py (uses stress_test output)
  └── plotting.py        (consumes all of the above)
```

Each `src/` module imports only from `config.py` plus the standard scientific Python stack. Modules can be imported individually for ad-hoc analysis without running the full pipeline.

---

*Document generated for MASA Hackathon 2026 submission. All code MIT-licensed for the team's use; underlying World Bank WDI data is open-licensed under Creative Commons Attribution 4.0.*
