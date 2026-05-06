# PRISM

***P**ortfolio **R**isk via **I**dentified **S**cenario **M**odeling*

**Climate Risk Assessment for a Multinational Reinsurer using World Bank WDI Indicators**

*Submission to MASA Hackathon 2026 — organised by the Malaysian Actuarial Student Association in strategic partnership with Hannover Re*

---

## Overview

PRISM is a quantitative climate-risk assessment that converts open World Bank development data into actionable underwriting decisions for a multinational reinsurer with material Southeast Asia (SEA) exposure. Working from a 16-indicator panel covering 10 SEA economies over 1990–2024, we identify the dominant drivers of regional GHG emissions, build a forecasting model that achieves **2.18 % MAPE on a 2024 hold-out**, stress-test a 2030 mitigation strategy under NGFS Phase V scenarios, and translate the result into a quantified financial impact: an **11 percentage-point loss-ratio swing (USD ~135 m)** on a notional USD 1.2 bn SEA gross written premium portfolio.

The submission comprises an R Markdown analysis, a parallel Python notebook with SHAP interpretability, an interactive R Shiny dashboard, a 10-page report, and a Grand Final pitch deck — all reproducibly anchored to the **STIRPAT framework**, **NGFS scenarios**, **Bank Negara Malaysia's CRST 2024 Methodology**, **IFRS S2 Climate-related Disclosures**, and the **Paris Agreement Article 2.1(c)** finance-flow alignment objective.

## The Challenge

The hackathon brief asks teams to assess climate-related risks for a multinational reinsurance client by:

1. Identifying environmental, energy, and socio-economic indicators most informative for understanding climate risk
2. Building a model that predicts 2024 GHG emissions from selected drivers
3. Linking emissions trajectories to natural-disaster insurance claims, with a deep-dive on two SEA economies
4. Stress-testing a 2030 mitigation strategy and translating the result to expected reinsurance financial impact

Three structural features of the SEA market make this engagement timely. **Concentration of physical risk** — five of the world's ten most disaster-prone economies are in SEA. **Wide protection gap** — average regional insurance penetration of ~2.0 % of GDP (half the OECD level), with ~85 % of disaster losses uninsured. **Regulatory tailwind** — Bank Negara Malaysia issued its Climate Risk Stress Testing methodology in 2024 mandating NGFS-aligned scenario analysis, and IFRS S2 reporting takes effect across ASEAN markets in 2026–27.

## Approach

We frame climate risk through three TCFD-aligned channels — **transition**, **physical**, and **adaptive capacity** — and map our 16-indicator panel against each. The analytical pipeline runs:

```
World Bank WDI (1,486 indicators × 217 economies × 1960–2024)
       │
       ▼  curate + reshape
Country-year panel (10 SEA economies × 16 indicators × 35 years)
       │
       ▼  pre-process (interpolation, log-transform, 2024 holdout)
Modelling frame
       │
       ├── M1: Per-country log-linear trend  (transparent baseline)
       ├── M2: Auto-ARIMA per country         (autocorrelation control)
       ├── M3a: XGBoost panel — autoregressive (best forecast)
       └── M3b: XGBoost panel — structural-only (best driver story)
       │
       ▼  validation: 2024 hold-out MAPE + 5-fold blocked time-series CV
Selected forecast
       │
       ▼  STIRPAT residuals + sectoral decomposition + two-way FE robustness
Driver attribution
       │
       ▼  perturb under NGFS Phase V scenarios + proposed mitigation
2030 emissions paths
       │
       ▼  Swiss Re sigma elasticity (0.7) × portfolio GWP
Reinsurance loss-ratio impact + capital recommendations
```

Two distinctive methodological choices run through the analysis. **Pairwise correlations are decomposed into partial correlations** to separate scale artefacts from genuine structural drivers, revealing two indicator sign-flips (forest area, industry share) that pairwise analysis hides. **STIRPAT residuals are computed at country and sector level**, so the country-aggregate over-emission story (Vietnam +24 %) decomposes into a sector-specific story (Vietnam Power Industry +280 %, Industrial Combustion +276 %) that directly informs cedent-screening logic.

## Headline Findings

### 1. Scale dominates, but two indicators flip sign once scale is controlled

GDP and population alone explain ~94 % of cross-country variation in GHG emissions globally — validating STIRPAT (Dietz & Rosa 1997). After partialling out scale, **CO₂ intensity of GDP** emerges as the single strongest driver (partial r = +0.75), while **forest area** and **industry share** flip sign relative to their pairwise correlations. This is the analytically distinctive finding most teams will miss.

### 2. Vietnam is a concentrated power-sector transition-risk story

| | Aggregate STIRPAT residual | Power Industry sector | Industrial Combustion sector |
|---|---:|---:|---:|
| Vietnam | **+24 %** | **+280 %** | **+276 %** |
| Philippines | −49 % | +66 % | −54 % |

Vietnam emits 24 % more than population × GDP would predict. Sectoral decomposition reveals that this is almost entirely a power-sector and heavy-industry story — driven by 2010s-era coal-fired capacity expansion. The Philippines, by contrast, is the largest under-emitter in SEA at −49 %, reflecting its services-and-remittance-driven growth model. This contrast anchors our parametric typhoon product design.

### 3. Forecast accuracy: XGBoost wins on a 2024 hold-out

| Model | SEA 2024 MAPE | Use case |
|---|---:|---|
| Per-country log-linear | 9.23 % | Sanity-check baseline |
| Auto-ARIMA | 2.67 % | Transparent companion |
| **XGBoost (autoregressive)** | **2.18 %** | **Selected forecast** |
| XGBoost (structural-only) | 6.73 % | Driver-story companion |

We deliberately report **two XGBoost specifications** because a reinsurance committee asks two distinct questions — *what is the best forecast?* and *what is driving the number?* — that warrant different models.

### 4. Two-way fixed-effects: three drivers survive the most demanding spec

Of the seven candidate structural drivers, only **log GDP, CO₂ intensity of GDP, and urban population share** survive country and year fixed effects with country-cluster-robust standard errors. Renewable-energy share carries cross-sectional information only (it varies between countries but barely moves the needle within any single country at current rates of energy transition). This is the methodological rigour that distinguishes a defensible underwriting model from a correlation-driven narrative.

### 5. 2030 financial impact: USD 135 m loss-ratio swing across pathways

On a notional USD 1.2 bn SEA portfolio with elasticity 0.7 (Swiss Re sigma 1/2024) and 62 % base loss ratio:

| 2030 Scenario | Expected loss ratio | Expected loss (USD m) |
|---|---:|---:|
| Net Zero 2050 (orderly) | 50.7 % | 609 |
| Mitigation (proposed product) | 53.8 % | 646 |
| Delayed Transition | 58.3 % | 700 |
| Current Policies (Hot House) | 62.0 % | 744 |

The 11-percentage-point spread is the headline number for the client conversation. The proposed mitigation strategy — a renewable-energy-linked parametric reinsurance product — recovers **72.6 %** of the swing — Mitigation 2030 expected loss USD 646 m vs Hot House USD 744 m / Net Zero USD 609 m, so (744 − 646) / (744 − 609) = 72.6 %.

## Strategic Recommendations

The analysis supports four concrete actions for the client:

1. **Launch a SEA Parametric Typhoon Reinsurance Product** with Saffir-Simpson Cat 3+ trigger; estimated TAM USD 280 m premium by 2028
2. **Introduce an ESG-Linked Underwriting Screen** offering 5–10 % renewal discounts for cedents with credible NDC-aligned transition plans (Paris Agreement Article 2.1(c) alignment)
3. **Time a USD 250 m SEA Multi-Peril Cat Bond Issuance** to the NGFS Disorderly Transition window in 2027, before transition risk re-prices spreads
4. **Hold an additional 8 % regional risk capital buffer** under a Hot House World scenario, per BNM CRST 2024 guidance for material climate-physical exposures

## Repository Structure

```
.
├── README.md                              ← landing page + judging-criteria mapping
├── PROJECT.md                             ← this document
│
├── deliverables/                          ← READ THESE FIRST (judges)
│   ├── 00_executive_one_pager.md          ← single-page summary (bonus criterion)
│   ├── 01_report.md                       ← 10-page main report
│   ├── 02_pitch_deck_outline.md           ← 15-slide Grand Final deck
│   ├── 03_pitch_script.md                 ← word-for-word 15-min script
│   ├── 04_vietnam_vs_philippines_deep_dive.md
│   ├── 05_cedent_screening_framework.md   ← productised tool for the client
│   ├── 06_policy_crosswalk.md             ← BNM CRST / IFRS S2 / NGFS / Paris
│   ├── 07_qa_briefing.md                  ← 15 anticipated judge questions
│   ├── 08_cedent_visit_scorecard.md       ← printable one-page cedent scorecard
│   ├── 09_hannover_re_executive_memo.md   ← memo from team to APAC CRO
│   ├── 10_vn_cedent_targets.md            ← public-domain VN cedent contact list
│   ├── 11_indonesia_counterfactual.md     ← framework applied to IDN (generalisability)
│   ├── 12_stress_refresh_playbook.md      ← quarterly board-pack refresh process
│   └── ai_usage.md                        ← required AI disclosure
│
├── analysis/
│   ├── R/analysis.Rmd                     ← primary R Markdown analysis
│   ├── python/analysis.ipynb              ← parallel Python notebook (XGBoost + SHAP)
│   └── shiny/app.R                        ← interactive 6-tab dashboard
│
├── data/
│   ├── README.md
│   ├── sea_panel_clean.csv                ← 10 SEA economies × 35 years × 16 indicators
│   ├── global_panel_clean.csv             ← global panel for XGBoost training
│   └── external/                          ← EM-DAT (HDX) + ND-GAIN (Notre Dame)
│       ├── README.md                       provenance, licences, citations
│       ├── fetch_external.sh               pinned download URLs
│       ├── build_external_panel.py         SEA filter + country-year aggregation
│       └── external_features_sea.csv       merged disaster + adaptive-capacity panel
│
├── exhibits/
│   ├── figures/                           ← fig1–fig13 (publication-quality PNG)
│   ├── results/                           ← JSON outputs (key_numbers + supporting)
│   └── MASA_Hackathon_Summary.pdf
│
├── app/                                   ← Mobile-first PWA viewer (Vite + React 19)
│   ├── public/                             icons + manifest assets
│   ├── src/
│   │   ├── data/                           keyNumbers.ts + cedent.ts (port of JSON)
│   │   ├── screens/                        Story · Model · HotSpots · Stress · Cedent · Actions
│   │   └── components/                     Layout · BottomNav · Card
│   ├── vite.config.ts                      vite-plugin-pwa + Workbox
│   └── README.md                           install + Add-to-Home-Screen guide
│
└── docs/
    ├── brief/                             ← organiser problem statement & rules
    │   ├── 01_introduction_and_timeline.md
    │   ├── 02_problem_statement.md
    │   ├── 03_rules_and_regulations.md
    │   └── 04_judging_and_submission.md
    ├── code_documentation.md              ← module-by-module Python codebase walkthrough
    └── app_prd.md                         ← PRISM PWA product requirements
```

The raw WDI download (`WB_WDI_WIDEF.csv`, ~243 MB) is **not committed**; download it from <https://data360.worldbank.org/en/dataset/WB_WDI> and place it in `data/` to re-run the cleaning step. See `data/README.md`.

## Deliverables Mapping to Judging Criteria

| Criterion | Weight | Where it lives |
|---|:---:|---|
| Problem Framing & EDA | 20 % | `analysis/R/analysis.Rmd` §1–3 · `deliverables/01_report.md` §1, §3 (eight subsections) |
| Modelling & In-Depth Analysis | 20 % | `analysis/R/analysis.Rmd` §4 · `analysis/python/analysis.ipynb` cells 5–7 · two-way FE in `exhibits/results/section3_round2.json` |
| Financial Impact Assessment | 20 % | `analysis/R/analysis.Rmd` §6 · `deliverables/01_report.md` §6 · `analysis/shiny/app.R` Reinsurance Impact tab |
| Strategic Recommendations | 20 % | `deliverables/01_report.md` §7 · `deliverables/05_cedent_screening_framework.md` (operational tool) |
| Storyline & Presentation | 20 % | `deliverables/01_report.md` (10 pages) · `deliverables/02_pitch_deck_outline.md` · `deliverables/03_pitch_script.md` |
| **Bonus** — interactive app + policy linkage + executive readiness | +10 % | `analysis/shiny/app.R` (6 tabs incl. Indicator Diagnostic + Policy Linkage) · `deliverables/00_executive_one_pager.md` · `deliverables/06_policy_crosswalk.md` |

## What Makes This Submission Distinctive

Five elements separate this work from a generic regression-and-recommendations submission:

**Pairwise vs partial correlation diagnostic.** Two of our 16 indicators flip sign once scale is controlled (forest area, industry share). The diagnostic is reported transparently in §3.2 of the report and made interactive in the Shiny app's Indicator Diagnostic tab. Most teams will report pairwise r and stop there.

**Two-XGBoost specification with explicit role separation.** The autoregressive variant (lag-1 + lag-2 emissions) wins on forecast accuracy. The structural-only variant (no lags) wins on driver interpretability. We report both because a reinsurance committee asks both questions.

**Sectoral STIRPAT residuals.** Country-level "Vietnam +24 % over-emits" decomposes into sectoral concentration ("Vietnam power +280 %, industrial combustion +276 %") that directly informs the cedent-screening framework in §7. The 8-sector heatmap is one of our strongest visuals.

**Two-way fixed-effects robustness.** Country FE plus year FE plus cluster-robust standard errors is the most demanding specification a panel of this size supports. Only three drivers survive — and we say so explicitly. This is the methodological rigour that Hannover Re actuaries will recognise.

**Interactive dashboard with explicit policy linkage.** The R Shiny app has six tabs including a dedicated Indicator Diagnostic panel (interactive partial-correlation toggling, residual ranking, sectoral heatmap) and a Policy Linkage tab citing Paris Agreement, NGFS, BNM CRST, IFRS S2, TCFD, UNFCCC NDCs, and the ASEAN Strategy for Carbon Neutrality. The bonus criterion (10 %) explicitly rewards this combination.

**Mobile PWA (`app/`) for the live demo.** A Vite + React installable Progressive Web App walks a non-technical viewer through the same 5-screen story (Story → Model → Hot Spots → Stress → Cedent → Actions) on a phone. The Stress and Cedent screens recompute live, and the Cedent screen ports the same 5-tier composite logic used in the Shiny *Reinsurance Impact* tab. Numerical anchors mirror `exhibits/results/key_numbers.json`. Detailed product requirements live in `docs/app_prd.md`.

**External data integration (`data/external/`).** Two open datasets enrich the WDI core: **EM-DAT Country Profiles** (CRED/UCLouvain via HDX) for Vietnam vs Philippines disaster claims (2018–2023, 2024-CPI USD damages), and **ND-GAIN 2026 Country Index** (Notre Dame) for the adaptive-capacity tier in the cedent screening framework. `data/external/build_external_panel.py` produces `external_features_sea.csv`, joined into both R and Python pipelines and quoted in §2.3 of the report.

## Limitations & Honest Caveats

The analysis is reduced-form — it does not capture climate-physical feedback into emissions or economic output (a coupled Integrated Assessment Model would be required). 2024 WDI figures may be revised post-submission. The Brunei Fugitive-Energy +4,205 % residual is genuine but reflects a small (USD ~17 bn GDP) economy with extreme natural-gas dependence, not a generalisable pattern. The renewable-energy-share signal is largely cross-sectional rather than within-country, meaning our proposed mitigation product has to be calibrated against between-country variation rather than within-country trajectories. EM-DAT and Swiss Re sigma figures are estimated and revised; recommendations should be validated against the client's internal loss triangulation.

## Reproducibility

All stochastic steps use **random seed = 2026**. The 2024 hold-out is reserved (no leakage). Environment specifications, install commands, and run instructions are in `README.md`. The end-to-end pipeline takes ~3 minutes on a standard laptop. Both R and Python implementations produce identical headline results to four decimal places.

## Tech Stack

- **R 4.3+** — primary modelling environment; `tidyverse`, `forecast`, `xgboost`, `shiny`, `shinydashboard`, `plotly`, `linearmodels` (via Python)
- **Python 3.10+** — parallel implementation; `pandas`, `xgboost`, `shap`, `statsmodels`, `linearmodels`, `seaborn`
- **R Markdown / Pandoc** — report compilation
- **Git** — version control (recommended deployment to GitHub for the final submission)

## Team

| Role | Member | Responsibility |
|---|---|---|
| Data & Modelling Lead | [Member 1, University] | R/Python pipeline, model selection, validation |
| Climate Risk & Industry Research Lead | [Member 2, University] | NGFS scenarios, BNM CRST, EM-DAT, Swiss Re sigma, recommendations |
| Visualisation & Dashboard Lead | [Member 3, University] | Shiny dashboard, report figures, slide deck visuals |
| Report, Slides & Project Manager | [Member 4, University] | 10-page report, pitch deck, submission, AI usage doc, schedule management |

## Acknowledgements

We thank the Malaysian Actuarial Student Association for organising MASA Hackathon 2026, Hannover Re as strategic industry partner, the World Bank Group for making the World Development Indicators dataset openly available, and the workshop facilitators for their guidance during the briefing session on 25 April 2026.

The Network for Greening the Financial System, Bank Negara Malaysia, the Swiss Re Institute, the IFRS Foundation, and the TCFD have produced the public methodologies that this analysis builds on; we cite each source in the report bibliography.

## Contact

Team Leader: **[Full Name]** · [email] · [phone]

---

*Submitted [Date] · MASA Hackathon 2026 · Submission portal: https://masahackathon2026.vercel.app*
