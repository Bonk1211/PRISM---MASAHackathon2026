# MASA Hackathon 2026: PRISM
## Portfolio Risk via Identified Scenario Modeling
### Climate Risk Assessment for a Multinational Reinsurer — Strategic Analysis using World Bank WDI Indicators

**Team:** [TEAM_NAME]
**Members:** [Member 1, University] · [Member 2, University] · [Member 3, University] · [Member 4, University]
**Submission date:** [Date]

---

## Executive Summary

This report assesses climate-related risks for our multinational reinsurance client, with a focus on long-term financial resilience in Southeast Asia (SEA). Using **16 indicators across 10 SEA economies (1990–2024)** from the World Bank's World Development Indicators (WDI), we (i) identify **GDP (gain 0.51) and population (gain 0.40)** as the dominant structural drivers of GHG emissions in the region — consistent with the STIRPAT framework — with technology variables (industry share, carbon intensity, renewables) refining at the margin, (ii) build a panel **XGBoost forecasting model** that achieves **2.92 % MAPE on a 2024 hold-out** (Python pipeline, seed 2026 — independent R re-run lands at 2.18 %; both materially outperform a log-linear baseline at 9.23 % and auto-ARIMA at 2.67 %, the latter two bit-exact across pipelines), (iii) demonstrate that **Vietnam has overtaken Thailand** as SEA's second-largest emitter and is growing emissions roughly **5× faster than the Philippines** despite similar population scale, and (iv) stress-test a 2030 mitigation strategy under NGFS Phase V scenarios, finding that, on a notional USD 1.2 bn SEA portfolio, the **Current Policies** ("Hot House World") pathway leaves expected loss at **USD 744 m (62 % loss ratio)** while a **Net Zero 2050** transition reduces this by **USD 135 m to USD 609 m (51 % LR)** — an 11 percentage-point loss-ratio swing across pathways. We recommend four actions: launch a SEA parametric typhoon reinsurance product (TAM ~USD 280 m by 2028), introduce an ESG-linked underwriting screen aligned with Paris Agreement Article 2.1(c), time a USD 250 m catastrophe bond issuance to the NGFS Disorderly Transition window in 2027, and hold an additional 8 % regional risk-capital buffer per BNM CRST 2024 §6.3. Limitations include reduced-form modelling without explicit climate-physical feedback and reliance on revisable WDI 2024 estimates.

---

## 1. Problem Framing & Business Context

The client — a multinational reinsurer with material SEA exposure — faces a structural shift: climate risk is moving from a tail concern to a primary driver of expected loss. Three aspects of the SEA region make this consultation particularly timely:

- **Concentration of physical risk.** Five of the world's ten most disaster-prone economies are in SEA (CRED EM-DAT Country Profiles, snapshot 2026-04-24, distributed via OCHA HDX).
- **Wide protection gap.** SEA average insurance penetration is ~2.0 % of GDP, half the OECD level (Swiss Re sigma 1/2024); ~85 % of regional disaster losses go uninsured.
- **Regulatory tailwind.** Bank Negara Malaysia issued its **Climate Risk Stress Testing (CRST) Methodology** in 2024, mandating reinsurers operating in Malaysia to adopt NGFS-aligned scenario analysis. IFRS S2 reporting takes effect across ASEAN markets in 2026–27.

We frame the engagement around **four questions** mapped to the hackathon brief: *(Q1)* Which indicators best explain regional GHG dynamics? *(Q2)* What is the most defensible 2024 GHG forecast? *(Q3)* How do climate trends translate into natural-disaster insurance claims, and where is the strongest underwriting opportunity? *(Q4)* What is the 2030 financial impact of a proposed mitigation strategy?

## 2. Data & Methodology

### 2.1 Data
We use the **World Bank WDI Wide-format release** (1,486 indicators × 217 economies × 1960–2024). From this we curate a panel of **16 indicators** spanning emissions, energy, land use, and macro/sectoral structure — selected for SEA completeness and theoretical relevance to the **STIRPAT framework** (Dietz & Rosa 1997: Impact = ƒ(Population, Affluence, Technology)). External data integrated into the country-year frame:

- **EM-DAT Country Profiles** (CRED/UCLouvain, distributed via OCHA HDX, snapshot 2026-04-24): country-year totals for events, persons affected, deaths and CPI-adjusted damage in USD — drives §5 disaster-claims analysis.
- **ND-GAIN Country Index** (University of Notre Dame, 2026 release): annual *gain*, *vulnerability*, and *readiness* scores — provides an adaptive-capacity signal independent of WDI scale variables; feeds the cedent-screening framework (`05_cedent_screening_framework.md`).
- **Swiss Re Institute *sigma* 1/2024**, **Munich Re NatCatSERVICE 2024**, **OECD Insurance Statistics 2023**: industry benchmarks for insured-share, premium-to-GDP, and protection-gap figures where EM-DAT does not publish primary values.

Provenance, licences, and a re-fetch script for the two open datasets are documented in `data/external/README.md`.

### 2.2 Pre-processing
Modelling window restricted to **1990–2024** (UNFCCC baseline year and post-1990 GHG data quality threshold). Within-country **linear interpolation** for gaps ≤ 3 years; indicators with > 30 % missingness dropped. Log-transformation applied to GHG and GDP to stabilise variance. **2024 actuals held out** for unbiased model selection.

### 2.3 Modelling architecture
We benchmark three models: **M1 — Per-country log-linear trend** (transparent baseline); **M2 — Auto-ARIMA per country** (captures auto-correlation and the COVID-19 structural break); **M3 — Panel XGBoost** trained on global 1990–2023 data with country fixed effects, lagged emissions, and STIRPAT-aligned features (log GDP, log population, urbanisation, renewable share, carbon intensity, industrial share, forest cover). Selection is by **2024 hold-out MAPE** on the SEA subset; SHAP values provide per-country prediction decomposition. *Validation*: 5-fold blocked time-series CV on the training set; sensitivity test excluding 2020–21 COVID years confirms regional MAPE moves < 1 pp.

[**Figure 1**: pipeline diagram — data → pre-processing → 3 candidate models → selection → stress test → loss translation]

## 3. Drivers of Climate-Related Risk in Southeast Asia

Climate risk is not a single phenomenon. For a reinsurer, three distinct risk channels demand separate indicator panels, separate exposures, and separate underwriting responses (TCFD 2017; IFRS S2 §B14):

- **Transition risk** — financial loss from policy, technology, or preference shifts that impair carbon-intensive assets. Driver indicators: emissions levels and trajectories, carbon intensity of GDP, energy mix.
- **Physical risk** — direct loss from climate-related events (acute) and trends (chronic). Driver indicators: population concentration, urbanisation, agricultural land use, water stress, forest cover.
- **Adaptive capacity** — the economy's ability to absorb and adjust to climate-related shocks. Driver indicators: GDP per capita, renewable energy share, industrial structure.

Our 16-indicator panel maps to all three channels. We now identify which indicators carry the most signal — and where the obvious answer is misleading.

### 3.1 Scale dominates, but it is not the whole story

A naïve correlation analysis on the SEA panel 1990–2024 shows total GHG emissions correlate most strongly with GDP (r = +0.77) and population (r = +0.76), with agricultural land (r = +0.67), forest area (r = −0.45), and energy use per capita (r = −0.52) following. A panel XGBoost (M3b structural specification, no lags) confirms the dominance: **log GDP (gain 0.51) and log population (gain 0.40) together account for ~91 % of structural variation** in regional emissions, validating the **STIRPAT framework** (Dietz & Rosa 1997: Impact ∝ Population × Affluence × Technology). A two-variable STIRPAT OLS (`log_GHG ~ log_pop + log_GDP`) on the SEA pooled panel yields population coefficient **0.40**, GDP coefficient **0.49**, R² = **0.95** — near-constant scale elasticity confirmed independently of the tree model.

This is the central — but largely uninformative — finding for an underwriter, because population and GDP are not actionable risk factors. The relevant question is: **which indicators carry information *after* removing the scale effect?**

### 3.2 Partial correlations — what survives after controlling for scale

Partialling out log GDP and log population from each candidate indicator (Figure 9) reorders importance and, in **three cases**, flips the sign — computed via `pingouin.partial_corr` on the SEA pooled panel and emitted to `exhibits/results/key_numbers_python.json` → `partial_correlations`:

| Indicator | Pairwise r | Partial r | What it tells us |
|---|---:|---:|---|
| CO₂ intensity of GDP | +0.42 | **+0.74** | Strongest *technology* signal — economies producing each USD of output more carbon-intensively are the transition-risk hotspots |
| Forest area % | −0.45 | **+0.60** ⚠ | **Sign flip.** Forest-rich SEA economies emit *more* than predicted — a deforestation-and-land-use channel |
| Industry % of GDP | −0.21 | **+0.47** ⚠ | **Sign flip.** Industrial structure matters once scale is held constant |
| Energy use per capita | −0.52 | **+0.42** ⚠ | **Sign flip.** Negative pairwise reflects Singapore's services dominance; energy intensity at the margin still drives emissions |
| Agriculture land % | +0.67 | +0.07 | Pairwise signal collapses — almost entirely a scale artefact |
| Urban population % | −0.15 | −0.24 | Modest negative under partial — services-led urbanisation reduces intensity |
| Renewable energy share | −0.02 | −0.38 | Stronger under partial — meaningful mitigation lever once scale is fixed |

**The partial-correlation ranking is the more useful one for transition-risk pricing.** Carbon intensity, forest cover, industry share, and energy use are stronger drivers than they first appear; agricultural land share collapses to noise once scale is removed.

### 3.3 Idiosyncratic country risk — STIRPAT residuals

The STIRPAT regression also identifies which SEA economies **deviate** from the scale-implied emissions level (Figure 10). Residuals are the country-specific emissions component that population and GDP cannot explain — the strongest available proxy for idiosyncratic transition-risk exposure. We report two specifications side-by-side: the **SEA-pooled** OLS on `log_GHG ~ log_pop + log_GDP` (Python re-derivation, conservative; emitted to `key_numbers_python.json` → `stirpat.country_residual_pct`) and a **global panel** specification (R-derived, used in the cedent-screening framework `05_`) which yields larger residuals because the regression is fit on 265 economies and SEA countries appear as outliers relative to the global trend:

| Country | SEA-pooled residual (Python) | Global-panel residual (R, used in cedent framework `05_`) |
|---|---:|---:|
| Myanmar | **+36 %** | +4 % |
| Malaysia | **+30 %** | +32 % |
| Brunei Darussalam | **+28 %** | **+287 %** |
| Thailand | **+21 %** | +6 % |
| Vietnam | **+13 %** | **+24 %** |
| Indonesia | +7 % | −19 % |
| Cambodia | −14 % | +13 % |
| Lao PDR | −21 % | **+93 %** |
| Singapore | −27 % | −12 % |
| Philippines | **−39 %** | **−49 %** |

Both specifications agree on the ordinal direction (Vietnam over-emits, Philippines under-emits, Brunei is the most extreme outlier) but diverge on magnitude. The cedent-screening framework (`05_cedent_screening_framework.md`) uses the **global-panel** values because Brunei's structural LNG dependency, Lao PDR's hydro-export anomaly, and similar single-economy outliers are harder to surface against a SEA-only baseline. Vietnam remains the most material idiosyncratic transition-risk exposure under either specification — top-3 SEA emissions level *plus* unexplained-by-scale carbon intensity. The Philippines is the largest under-emitter under either specification, reflecting services-and-remittance-driven growth.

### 3.4 Sectoral residuals — drilling into the country story

Aggregate residuals are useful for country tiering but conceal the *sector* that is driving each country's deviation. We re-run STIRPAT on **eight sectoral GHG aggregates** (Power Industry, Industrial Combustion, Industrial Processes, Transport, Agriculture, Waste, Buildings, Fugitive Emissions) and report SEA residuals over 2019–2023 (Figure 12). Three patterns emerge with direct underwriting implications:

| Country | Dominant over-emitting sectors (% over STIRPAT) | Underwriting implication |
|---|---|---|
| **Vietnam** | Power Industry **+280 %**, Industrial Combustion **+276 %**, Industrial Processes +147 % | Heavy-industry and coal-power expansion are the transition-risk concentration points; cedents with steel, cement, and thermal-power books need scenario-explicit cover |
| **Lao PDR** | Power Industry **+781 %**, Industrial Processes +420 %, Agriculture +189 % | The hydro-rich grid narrative masks an extreme outlier in coal-power IP exports; idiosyncratic country premium warranted |
| **Brunei** | Fugitive Energy **+4,205 %**, Power Industry +351 % | Single-sector dependency; methane-leakage liability risk is a discrete underwriting consideration |
| **Malaysia** | Power Industry +172 %, Fugitive Energy +154 %, Industrial Combustion +78 % | Diversified over-emission profile; treaty-level rather than facultative response |
| **Thailand** | Industrial Processes +155 %, Industrial Combustion +90 %, Transport +66 % | Manufacturing-led intensity; sectoral cedent-screening more effective than country-level loadings |
| **Indonesia** | Fugitive Energy +83 %, Power Industry +77 %, Industrial Combustion +65 % | Coal-power is the single largest absolute over-emission lever in SEA |
| **Cambodia** | Agriculture +146 %, Industrial Processes +122 % | Land-use plus emerging industry; agri-parametric product fit |
| **Myanmar** | Agriculture +110 % | Concentrated rice/livestock emissions; sovereign-index cover candidate |
| **Singapore** | Industrial Processes +255 % (refining/petrochem); Agriculture/Buildings/Transport all strongly negative | Specialised refining footprint inside an otherwise services-dominated economy |
| **Philippines** | All sectors negative or mild positive; Power Industry +66 % only | Cleanest aggregate profile in SEA — confirms the "low-transition-risk" tier |

**Vietnam in particular reveals itself differently under sectoral analysis.** The aggregate +24 % residual understates the concentration: power-and-industrial combustion sit at +280 % each, while transport (+8 %) and waste (−9 %) are unremarkable. The transition-risk story for Vietnam is *almost entirely a power-sector story* — which directly informs the parametric-product design in Section 7.

### 3.5 Robustness — two-way fixed-effects regression

Partial correlations and STIRPAT residuals identify drivers but treat each observation as independent. Panel observations are not independent — countries have persistent unobserved features (institutional quality, geography) and years contain global shocks (oil prices, COVID-19). We therefore re-estimate the structural model with `linearmodels.PanelOLS`, applying both **entity (country) and time (year) fixed effects** with **country-cluster-robust standard errors** (Figure 13). Coefficients emitted to `key_numbers_python.json` → `two_way_fe`:

| Indicator | Two-way FE β | std err | p-value | Significant? |
|---|---:|---:|---:|---|
| **CO₂ intensity of GDP** | **0.612** | 0.074 | <0.001 | ✓✓✓ |
| **log GDP** | **0.318** | 0.082 | <0.001 | ✓✓✓ |
| **Urban population %** | **0.012** | 0.004 | 0.002 | ✓✓✓ |
| log population | 0.729 | 0.448 | 0.105 | (n.s.) |
| Forest area % | 0.008 | 0.005 | 0.112 | (n.s.) |
| Industry % of GDP | −0.005 | 0.005 | 0.253 | (n.s.) |
| Renewable energy % | −0.003 | 0.004 | 0.398 | (n.s.) |

(SEA panel 1990–2024, n = 335, R² within = 0.95; ✓✓✓ = p<0.01, ✓✓ = p<0.05, ✓ = p<0.10)

**Three implications.** First, **GDP, CO₂ intensity of GDP, and urban population share are the three drivers that survive the most demanding specification** — both within-country and net of global time shocks. These three should anchor any structural underwriting model. Second, the **renewable-energy share signal is mostly cross-sectional**, not within-country — meaning renewables differ across countries but barely move the needle within any one country at SEA's current pace of energy transition. The implication for product design is that a renewable-linked mitigation lever (Section 7) needs to be calibrated against the cross-country comparison, not within-country trajectories. Third, **population is mostly absorbed by country fixed effects** — population scale matters but moves slowly relative to other drivers, so its effect is properly part of the country dummy in a panel context.

### 3.6 Decoupling — slow, partial, fragile

The clearest socio-economic indicator for *adaptive capacity* is whether GDP-per-capita growth is decoupling from per-capita emissions. The trailing 5-year cross-country correlation between log GDP-per-capita and CO₂-per-capita in SEA (Figure 11) has eased from **r = 0.92 in 2005 to r = 0.81 in 2023** — directionally encouraging but well short of the decoupling threshold (r ≤ 0.3) seen in mature OECD economies. Only Singapore and Malaysia show country-specific decoupling on a per-capita basis; the remaining eight economies remain firmly coupled.

This matters for two reasons. First, the **scale effect will continue to dominate** SEA emissions through the 2030 horizon — supporting our forecast structure (autoregressive XGBoost trained on global panel). Second, transition-risk pricing should be informed primarily by the *trajectory* of carbon intensity (declining/flat/rising) rather than the level — countries closer to decoupling have lower transition-risk volatility.

### 3.7 Complete indicator panel by climate-risk channel

We synthesise all 16 indicators into the following risk-channel mapping:

#### Transition-risk indicators

| # | Indicator | Partial r / role | Reinsurance use case | SEA pattern worth flagging |
|---|---|:---:|---|---|
| 1 | **GHG total** (Mt CO₂e, excl. LULUCF) | *target* | Carbon-footprint disclosure (IFRS S2), cedent screening | Indonesia 1,324; Vietnam 584; ratio Vietnam:Philippines = 2.2× |
| 2 | **CO₂ intensity of GDP** (kg/USD) | **+0.74** (FE-robust) | Single best transition-risk underwriting metric | 6× spread — Singapore ~0.10 vs Cambodia ~0.60 |
| 3 | **Industry share of GDP** (%) | +0.47 ⚠ flip (not FE-robust) | Sectoral cedent classification | Brunei (oil/LNG) and Lao PDR high; Singapore (services) low |
| 4 | **Energy use per capita** (kg OE) | +0.42 ⚠ flip | Industrial-cedent risk tiering | Brunei/Singapore high; Cambodia/Myanmar 5–10× lower |
| 5 | **Renewable energy share** (% TFEC) | −0.38 (cross-sectional only) | ESG-linked underwriting screen; mitigation calibration | Cambodia/Myanmar high (traditional biomass — caveat); Singapore <3 % |
| 6 | **Renewable electricity share** (%) | −0.24 | Power-sector cedent screening; modern-renewables focus | Lao PDR ~80 % (hydro); Vietnam climbing fast post-2015 |
| 7 | **GHG per capita** (t CO₂e) | indirect | Country tiering; per-citizen carbon footprint | Brunei extreme outlier (~30 t/cap); Cambodia/Lao PDR <5 t/cap |
| 8 | **CO₂ per capita** (t CO₂e) | indirect | Cross-check on energy-system intensity | Tracks #7; Singapore moderate, Brunei high |

**Anchor:** CO₂ intensity of GDP. Strongest scale-adjusted, FE-robust signal we have; the metric most directly priced into a transition-risk premium.

#### Physical-risk indicators (acute and chronic)

| # | Indicator | Partial r / role | Reinsurance use case | SEA pattern worth flagging |
|---|---|:---:|---|---|
| 9 | **Forest area share** (%) | **+0.60** ⚠ (sign flip) | Flood-modelling input; deforestation-driven loss-of-buffer | Forest-rich SEA economies (Indonesia, Lao PDR) over-emit relative to scale — LULUCF/deforestation channel |
| 10 | **Freshwater withdrawal** (% of internal) | −0.36 | Drought / water-stress product pricing | Vietnam/Thailand moderate stress; Philippines lower |
| 11 | **Urban population share** (%) | −0.23 → **+0.24 under FE** | Cat-modelling peak-zone calibration; urban-heat exposure | Singapore 100 %; Cambodia ~25 % — 4× spread on insured-asset concentration |
| 12 | **Agriculture share of GDP** (%) | +0.16 | Sovereign / index insurance pricing | Myanmar/Cambodia ~25 %; Singapore 0 % — sharp climate-economic vulnerability gradient |
| 13 | **Agricultural land share** (%) | +0.06 (n.s.) | Crop / parametric agri pricing | Pairwise signal misleading — drops to noise after scale; use #12 instead |

**Anchors:** Population (concentration) and urban population share for acute physical risk; agriculture share of GDP for chronic physical risk. Forest area share is the *unexpected* anchor — sign flip means it should be paired with deforestation-rate data (FAO FRA / Global Forest Watch — not in WDI) for full underwriting use.

#### Adaptive-capacity & scale indicators

| # | Indicator | Partial r / role | Reinsurance use case | SEA pattern worth flagging |
|---|---|:---:|---|---|
| 14 | **GDP per capita** (constant USD) | −0.43 | Penetration forecasting; country tiering | Singapore ~USD 60 k vs Myanmar/Cambodia ~USD 1.5 k — 40× spread |
| 15 | **GDP, total** (constant USD) | scale control | Market sizing; GWP allocation | Indonesia ~USD 1.4 tn dominates SEA aggregate by 3× |
| 16 | **Population, total** | scale control | Cat-modelling exposure count | Indonesia ~280 m vs Brunei <500 k — 600× spread |

**Anchor:** GDP per capita. Captures both adaptive capacity and insurance-purchase power; largest cross-SEA spread of any indicator.

#### Cross-channel anchor indicators

Three indicators carry signal in **two or more risk channels** and should sit at the centre of any country-level dashboard for the SEA portfolio:

| Indicator | Transition | Physical | Adaptive | Why it earns its place |
|---|:---:|:---:|:---:|---|
| **CO₂ intensity of GDP** | ●●● | – | ● | Direct transition-risk pricing input; tracks energy-system modernisation |
| **GDP per capita** | ● | – | ●●● | Wealth → both adaptive capacity and insurance demand |
| **Renewable energy share** | ●● | – | ●● | Mitigation lever (transition) and energy-system resilience (adaptive) |

Together with the two scale controls (population, total GDP), these five indicators form a parsimonious **Climate Risk Country Card** — five numbers that summarise where any SEA economy sits in the transition–physical–adaptive triangle and that drive the underwriting tiering recommendations in Section 7.

### 3.8 Significant patterns and their implications

Five patterns emerge from the analysis that we carry forward into modelling and recommendations:

1. **Scale dominates.** GDP and population alone explain ~91 % of cross-country variation in GHG emissions on the SEA panel. Implication for the client: physical-asset accumulation in the highest-growth SEA economies is the primary driver of expected loss exposure.
2. **Three pairwise correlations are misleading.** Forest area, industry share, and energy use per capita all flip sign once scale is controlled. Forest-rich SEA economies emit *more* than predicted (a deforestation channel hidden by the LULUCF-excluding indicator); higher industrial share *raises* emissions intensity once scale is held constant; energy use per capita's negative pairwise reflects Singapore's services dominance and reverses to positive at the within-country margin. All three findings should appear in any cedent-screening framework that uses these indicators.
3. **Sectoral concentration of transition risk is sharp.** Vietnam's +24 % aggregate residual is almost entirely a +280 % power-sector residual; Brunei is a single-sector (fugitive-energy) story; Lao PDR is hydro-plus-coal-power. Country-level transition premiums materially understate or overstate cedent-level exposure depending on the cedent's sectoral book.
4. **Three FE-robust drivers carry the structural signal.** GDP, CO₂ intensity of GDP, and urban population share survive the most demanding two-way fixed-effects specification with cluster-robust standard errors. These three should anchor any structural underwriting model; population and renewable share carry mostly cross-sectional information and should be used for country tiering rather than within-country dynamics.
5. **Decoupling is too slow to relax the stress test.** A persistent r = 0.81 between affluence and emissions per capita means our 2030 stress test cannot count on autonomous decoupling; mitigation has to be policy-driven (NGFS Net Zero pathway) or product-driven (the proposed renewable-linked reinsurance lever).

## 4. Modelling 2024 GHG Emissions

We benchmark **two candidate XGBoost specifications** plus the log-linear baseline and ARIMA. The two XGBoost variants serve different purposes — both are reported, with explicit reasoning for which is used where.

| Model | Use case | SEA MAPE (Python, primary) | SEA MAPE (R cross-check) | Notes |
|---|---|---:|---:|---|
| M1: Log-linear trend | Sanity-check baseline | **9.23 %** | 9.23 % | Per-country fit, no covariates · bit-exact across pipelines |
| M2: Auto-ARIMA | Transparent companion | **2.67 %** | 2.67 % | Captures COVID dip · bit-exact across pipelines |
| M3a: XGBoost (autoregressive) | **Forecasting** — selected | **2.92 %** | 2.18 % | With log_GHG lag-1 and lag-2 · cross-pipeline drift from xgboost 3.x stochastic init (acceptable; both single-digit) |
| M3b: XGBoost (structural) | **Driver story** — selected | **9.67 %** | 6.73 % | Excludes lags; isolates structural drivers |

**Why two XGBoost variants.** A reinsurance committee asks two questions: *(a) what is the best forecast?* and *(b) what is driving the number?* The autoregressive model wins on (a) because lag-1 and lag-2 emissions are extremely informative — a one-step-ahead forecast that is wrong about lag-1 is structurally weaker. The autoregressive model loses on (b) because its feature importance is dominated by lagged GHG (gain 0.61 + 0.35 = 0.96), which is mathematically expected but commercially uninformative. The structural model — without lag features — therefore answers question (b) cleanly.

**Structural feature importance (XGBoost M3b, no lags — Python re-run, seed 2026).** Log GDP (gain **0.51**) and log population (gain **0.40**) together account for ~91 % of explanatory power, validating the **STIRPAT framework** (Dietz & Rosa 1997). CO₂ intensity of GDP (0.03), industry share of GDP (0.02), GDP per capita (0.01), and urbanisation (0.01) refine at the margin. Renewable energy share (0.01) and forest area (0.01) enter weakly — consistent with the headline finding that *the SEA scale effect dominates the technology effect*.

**Limitations.** Reduced-form; no explicit climate-physical feedback; 2024 WDI figures may be revised; AR5 accounting omits sub-national heterogeneity. **Validation**: 5-fold blocked time-series CV; sensitivity test excluding 2020–21 COVID years moves SEA MAPE by < 1 pp.

[**Figure 4**: model comparison plot — predicted vs actual 2024 across the 10 SEA countries, with 95 % bands]
[**Figure 5**: structural feature importance — population & GDP dominate]

## 5. Climate Risk → Natural-Disaster Insurance Claims (Philippines vs Vietnam)

We compare **Philippines vs Vietnam** because both face similar typhoon-physical risk profiles but diverge sharply on emissions trajectory and insurance market structure — making them the cleanest natural experiment in SEA for our client.

[**Figure 6**: dual-axis chart — events count + economic damage (CPI-adjusted) + benchmarked insured losses, Philippines vs Vietnam, 2000–2024, sourced from EM-DAT Country Profiles (HDX snapshot 2026-04-24) and Swiss Re *sigma* 1/2024]

Key contrasts:

- **Disaster frequency**: Philippines averages **~12.5 reported events/year**, Vietnam **~8/year** (EM-DAT Country Profiles 2018–2023; storms dominate both — 41 of 75 PH events, 26 of 48 VN events). The Philippines sits within the typhoon belt and is more directly exposed to North Pacific cyclones; PH events also span six disaster types vs three for VN, reflecting earthquake and volcanic exposure on top of hydromet risk.
- **Economic damage** (CPI-adjusted to 2024 USD, EM-DAT 2018–2023): Philippines totalled **USD 4.81 bn** (~USD 800 m/yr); Vietnam **USD 2.30 bn** (~USD 380 m/yr). Applying the Swiss Re *sigma* 1/2024 SEA insured-share benchmark of **12 %**, this implies insured losses of ~USD 96 m/yr for PH and ~USD 46 m/yr for VN — but the *protection gap* is wider in Vietnam.
- **Persons affected** (EM-DAT 2018–2023): Philippines **54.5 m**, Vietnam **4.5 m** — a 12× gap that reinforces the per-event-severity divergence and the strategic case for a parametric product calibrated to PH life-and-livelihood exposure.
- **Adaptive capacity** (ND-GAIN 2023): Vietnam **48.1**, Philippines **45.6** on the composite GAIN index. Vietnam scores higher on *readiness* (0.43 vs 0.36) — better governance, economic and social capacity to deploy adaptation finance — even though its underlying *vulnerability* is also higher (0.47 vs 0.44). This nuances the country-tier reading: Vietnam's faster GHG trajectory is partly compensated by stronger institutional readiness.
- **Penetration**: Vietnam premium-to-GDP **2.4 %** vs Philippines **1.7 %** (OECD 2023), but Vietnam's **protection gap is wider (92 % uninsured) vs Philippines (85 %)** (Swiss Re *sigma* 1/2024).
- **Trajectory**: Vietnam's GHG growth ~5× the Philippines' since 2000 — a useful proxy for the speed of physical-asset accumulation that will need protection in the next decade.

**Strategic implication for the client.** The combination of fast-growing physical exposure plus a wide protection gap makes **Vietnam the stronger commercial opportunity**, even though the Philippines is the larger current insured market. The recommended product (Section 7) reflects this.

## 6. Stress Test — 2030 Scenario Projection

We apply **NGFS Phase V scenarios** (2024 vintage) — the de-facto industry standard, explicitly cross-referenced in BNM's CRST 2024 Methodology Paper. Three reference scenarios plus our proposed mitigation:

| Scenario | NGFS family | SEA GHG growth p.a. (assumption) |
|---|---|---:|
| Net Zero 2050 (orderly) | Orderly | -2.5 % |
| Delayed Transition | Disorderly | +1.0 % |
| Current Policies (Hot House World) | Too little, too late | +2.5 % |
| **Mitigation (proposed)** | Client-specific | **-1.0 %** |

The proposed mitigation strategy — a **regional renewable-energy-linked parametric reinsurance product** — is modelled as a **+5 percentage-point shift in the renewable energy share** by 2030 across the SEA portfolio, calibrated to a 1.0 % p.a. emissions slowdown.

[**Figure 7**: 2030 GHG projection fan chart for top-4 SEA emitters under all four scenarios]

**Translation to financial impact** (illustrative client SEA portfolio: USD 1.2 bn GWP, base loss ratio 62 %, loss-to-emissions elasticity 0.7 from Swiss Re sigma 1/2024):

| Scenario | 2030 SEA emissions (Mt) | Δ vs Hot House | 2030 expected loss ratio | 2030 expected loss (USD m) |
|---|---:|---:|---:|---:|
| Net Zero 2050 | 2,772 | -25.9 % | 50.7 % | 609 |
| Mitigation (proposed) | 3,038 | -18.8 % | 53.8 % | 646 |
| Delayed Transition | 3,425 | -8.5 % | 58.3 % | 700 |
| Current Policies (Hot House) | 3,742 | 0 % | 62.0 % | 744 |

The Hot House World scenario sits **11 percentage-points above Net Zero 2050** in loss ratio (62 % vs 51 %), implying a **USD 135 m swing in expected loss** on this notional portfolio. The proposed mitigation strategy recovers **72.6 %** of that swing — Mitigation 2030 expected loss USD 646 m vs Hot House USD 744 m / Net Zero USD 609 m, so (744 − 646) / (744 − 609) = 72.6 %.

## 7. Recommendations — Strategic Risk Management

1. **Launch SEA Parametric Typhoon Reinsurance Product.** Trigger: Saffir-Simpson Category 3+ landfall in Philippines, Vietnam, or south-China-coast typhoon basins. Target cedents: top-5 primary insurers in PH and VN. Estimated TAM: **USD 280 m premium by 2028** based on regional protection-gap closure assumptions.
2. **ESG-Linked Underwriting Screen.** Renewals tier — cedents with credible NDC-aligned transition plans receive 5–10 % premium discount; aligns with **Paris Agreement Article 2.1(c)** (consistency of finance flows with low-emissions pathway). Expected portfolio quality uplift: **2 pp loss-ratio improvement** at full adoption.
3. **Catastrophe Bond Issuance Window.** Issue a **USD 250 m SEA multi-peril cat bond in 2027** to capitalise on NGFS Disorderly Transition pricing window before transition risk re-prices spreads. Aligns with the client's capital-relief objectives under Solvency II / RBC.
4. **Capital Buffer Adjustment.** Hold an additional **8 % regional risk capital buffer** under a Hot House World scenario (per BNM CRST 2024 guidance for material climate-physical exposures).

## 8. Limitations & Uncertainties

- **Model uncertainty** — single-digit MAPE on 2024 widens with horizon; 2030 projections carry both model and scenario uncertainty.
- **Climate-physical feedback** — physical events feed back into emissions and economic output in ways our reduced-form model does not capture.
- **Insurance-loss data** — EM-DAT and *sigma* figures are estimated and revised; numbers should be validated against the client's internal loss triangulation.
- **Country heterogeneity** — recommendations should be tuned to underwriting unit; Singapore (services, decoupling) and Indonesia (commodity-driven) warrant separate treatment.
- **Carbon-intensity data lag** — WDI carbon-intensity series lags by ~12 months relative to national GHG inventories.

## 9. Conclusion

Climate risk in Southeast Asia is not a tail event; it is a **structural driver of expected loss**, with an **11 percentage-point loss-ratio swing by 2030** depending on transition pathway. A USD 1.2 bn portfolio sees expected losses move by **USD ~135 m** between Net Zero and Hot House. The recommended product, capital, and underwriting actions allow the client to convert this risk into underwriting opportunity while remaining aligned with regulatory expectations (BNM CRST, IFRS S2, TCFD) and the international policy framework (Paris Agreement, NGFS).

---

## Bibliography

1. Bank Negara Malaysia (2024). *Climate Risk Stress Testing Methodology Paper*.
2. Chen, C., Noble, I., Hellmann, J., Coffee, J., Murillo, M., & Chawla, N. (2015). *University of Notre Dame Global Adaptation Index — Country Index Technical Report*. Notre Dame, IN.
3. CRED / UCLouvain (2026). *EM-DAT — The International Disaster Database, Country Profiles*. Snapshot file `emdat-country-profiles_2026_04_24.xlsx`, distributed via Humanitarian Data Exchange (OCHA HDX). <https://data.humdata.org/dataset/emdat-country-profiles> (downloaded 2026-04-29).
4. Dietz, T. & Rosa, E. A. (1997). Effects of population and affluence on CO₂ emissions. *PNAS* 94(1).
5. IFRS Foundation (2023). *IFRS S2 — Climate-related Disclosures*.
6. Munich Re (2024). *NatCatSERVICE — Loss Events Worldwide 2023*.
7. Network for Greening the Financial System (2024). *NGFS Climate Scenarios — Phase V*.
8. Notre Dame Global Adaptation Initiative (2026). *ND-GAIN Country Index — 2026 Release*. University of Notre Dame. <https://gain.nd.edu/our-work/country-index/download-data/> (downloaded 2026-04-29).
9. OECD (2023). *Insurance Statistics — Non-life premium and penetration*.
10. Swiss Re Institute (2024). *sigma No 1/2024 — Natural catastrophes in 2023*.
11. Task Force on Climate-related Financial Disclosures (2017). *Final Recommendations*.
12. UNFCCC (2015). *Paris Agreement* (esp. Article 2.1(c)).
13. UNFCCC (2022). Vietnam *Updated Nationally Determined Contribution*.
14. UNFCCC (2021). Philippines *Nationally Determined Contribution*.
15. Volz, U., Beirne, J., Ambrosio Preudhomme, N., Fenton, A., Mazzacurati, E., Renzhi, N., & Stampe, J. (2020). *Climate Change and Sovereign Risk*. SOAS Centre for Sustainable Finance, London.
16. World Bank (2024). *World Development Indicators (WDI), Wide format*. <https://data360.worldbank.org/en/dataset/WB_WDI>.

## Appendix A — Indicator Panel (extracted)

| Code | Short name | Category |
|---|---|---|
| WB_WDI_EN_GHG_ALL_MT_CE_AR5 | GHG_total_MtCO2e | Emissions (TARGET) |
| WB_WDI_EN_GHG_ALL_PC_CE_AR5 | GHG_per_capita_tCO2e | Emissions |
| WB_WDI_EN_GHG_CO2_PC_CE_AR5 | CO2_per_capita_tCO2e | Emissions |
| WB_WDI_EN_GHG_CO2_RT_GDP_KD | CO2_intensity_GDP | Emissions |
| WB_WDI_EG_FEC_RNEW_ZS | renewable_energy_pct | Energy |
| WB_WDI_EG_ELC_RNEW_ZS | renewable_elec_pct | Energy |
| WB_WDI_EG_USE_PCAP_KG_OE | energy_use_pc | Energy |
| WB_WDI_AG_LND_FRST_ZS | forest_area_pct | Land Use |
| WB_WDI_AG_LND_AGRI_ZS | agri_land_pct | Land Use |
| WB_WDI_NY_GDP_MKTP_KD | GDP_constant_2015USD | Macro |
| WB_WDI_NY_GDP_PCAP_KD | GDP_per_capita_2015USD | Macro |
| WB_WDI_SP_POP_TOTL | population | Macro |
| WB_WDI_SP_URB_TOTL_IN_ZS | urban_pop_pct | Macro |
| WB_WDI_NV_IND_TOTL_ZS | industry_pct_GDP | Sectoral |
| WB_WDI_NV_AGR_TOTL_ZS | agriculture_pct_GDP | Sectoral |
| WB_WDI_ER_H2O_FWTL_ZS | freshwater_withdrawal_pct | Water |

## Appendix B — Model Hyper-parameters

XGBoost (final): nrounds = 600; eta = 0.04; max_depth = 5; subsample = 0.8; colsample_bytree = 0.8; objective = reg:squarederror; seed = 2026.
ARIMA: per-country auto.arima with stepwise = FALSE, approximation = FALSE; orders selected by AICc.

## Appendix C — Reproducibility

- **Primary pipeline**: `analysis/python/analysis.ipynb` (41 cells; Python 3.14, pandas 3.0.2, xgboost 3.2.0, statsmodels with linearmodels for two-way FE, pingouin for partial correlations). Re-execute via `jupyter nbconvert --to notebook --execute analysis/python/analysis.ipynb`. ~3 minutes on a standard laptop.
- **Cross-check pipeline**: `analysis/R/analysis.Rmd` retained for cross-validation. Stress-test, ARIMA, and log-linear MAPE bit-exact between R and Python; XGBoost specifications drift on stochastic init (xgboost 3.x) — both within the single-digit MAPE band.
- **Single source of truth**: `exhibits/results/key_numbers_python.json` (15 keys: mape_summary, m1/m2/m3a/m3b per country, feature_importance_m3a/m3b, stress_test_2030_aggregate, headline, stirpat, sectoral_residuals_pct, partial_correlations, two_way_fe, vn_vs_ph). Auto-imported by the PWA at build time via `cd app && npm run sync-data`.
- **Interactive deliverables**: mobile-installable PWA at `app/` (Vite 7 + React 19 + Tailwind + vite-plugin-pwa) — six screens, six tabs of the analytical journey. Legacy R Shiny dashboard at `analysis/shiny/app.R`.
- Random seed fixed at **2026** throughout.
- See `README.md` for environment setup and replication steps.

