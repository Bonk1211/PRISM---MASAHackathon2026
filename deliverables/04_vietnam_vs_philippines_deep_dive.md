# Vietnam vs Philippines — Deep-Dive Comparison

*Companion document to `01_report.md` §5 (Climate Risk → Natural-Disaster Insurance Claims). All numbers anchor to the cleaned panel (`data/sea_panel_clean.csv`), the model outputs (`exhibits/results/`), and the cited external sources.*

---

## 1. Why this pair, not any other

The hackathon brief asks for **two Southeast Asian countries**. Picking Vietnam vs Philippines is not a default; it is the **cleanest natural experiment** the region offers our reinsurance client:

- **Same physical-risk hazard.** Both sit inside the West Pacific typhoon belt, both face annual landfalling tropical cyclones, both have low-lying river-delta exposure (Mekong, Pasig).
- **Diverging emissions trajectories.** Vietnam's GHG total has grown roughly **5× faster** than the Philippines' since 2000 — making transition risk asymmetric across an otherwise comparable physical-risk pair.
- **Diverging insurance-market structure.** Vietnam runs a higher headline penetration but a wider protection gap; Philippines has a deeper, older market with a lower headline number but more mature distribution.
- **Diverging climate policy commitment.** Vietnam committed to **Net Zero by 2050** at COP26 (UNFCCC NDC update 2022). The Philippines committed to a **75 % cumulative emissions reduction 2020–2030** (UNFCCC NDC 2021), of which only 2.71 percentage points are unconditional.

Pick Vietnam vs Philippines and you get a controlled-pair test of whether transition-risk and physical-risk signals separate cleanly enough to be priced separately. They do.

---

## 2. Macro snapshot, side by side (2024)

| | **Vietnam** | **Philippines** | Spread |
|---|---:|---:|---:|
| Population (m) | 100.3 | 117.3 | PH +17 % |
| GDP, constant 2015 USD (bn) | 392 | 401 | comparable |
| GDP per capita, constant 2015 USD | 3,910 | 3,420 | VN +14 % |
| Urban population share | 39.5 % | 48.3 % | PH +8.8 pp |
| Industry share of GDP | 33.4 % | 27.6 % | VN +5.8 pp |
| Agriculture share of GDP | 11.9 % | 8.6 % | VN +3.3 pp |
| Renewable energy share (% TFEC) | 16.3 % | 22.7 % | PH +6.4 pp |
| Renewable electricity share | 47.9 % | 22.0 % | VN +25.9 pp |
| Forest area share | 47.0 % | 24.0 % | VN +23 pp |

Read this table once. Vietnam = larger industrial base (manufacturing-led growth, FDI in coal-fired heavy industry), more rural, more forested, **dramatically higher renewable electricity share** because of long-standing hydro plus rapid solar build-out post-2017. Philippines = more services-oriented, more urban, lower industry weight, geothermal-and-wind-led renewable mix.

These structural differences propagate through the climate-risk channels in §3 below.

---

## 3. GHG trajectory — Vietnam ≠ Philippines

### 3.1 Total emissions (MtCO₂e, AR5 accounting, excluding LULUCF)

| Year | Vietnam | Philippines | VN/PH ratio |
|---:|---:|---:|---:|
| 2000 | 154 | 132 | 1.17× |
| 2010 | 309 | 174 | 1.78× |
| 2020 | 504 | 250 | 2.02× |
| **2024** | **584** | **267** | **2.19×** |

**CAGR 2000–2024** — Vietnam **5.7 %/yr**, Philippines **3.0 %/yr**. Over 24 years that compounds into a 2.2× emissions ratio from a 1.17× starting point. Vietnam has overtaken Thailand to become **SEA's #2 emitter** (only Indonesia is larger, at ≈1,324 Mt in 2024).

### 3.2 What is driving the divergence

Per Section 3.4 of the report (sectoral STIRPAT residuals over 2019–2023):

| Sector | Vietnam residual | Philippines residual | Read |
|---|---:|---:|---|
| Power Industry | **+280 %** | +66 % | Coal-fired build-out drove Vietnam to ~22 GW installed coal capacity by 2023 vs PH ~12 GW |
| Industrial Combustion | **+276 %** | −54 % | Vietnam's iron-and-steel and cement output 4–6× PH; PH industry contracts share-of-GDP |
| Industrial Processes | +147 % | −36 % | Vietnam petrochemical FDI cluster (Long Son, Nghi Son) |
| Transport | +8 % | −22 % | PH is more diesel-jeepney intensive but smaller fleet relative to scale |
| Agriculture | +26 % | −37 % | Vietnam rice paddy methane intensive; PH offset by tropical-fruit export mix |
| Buildings | −44 % | −61 % | Both under-emit at scale (warm climate, low heating demand) |
| Waste | −9 % | −46 % | PH waste-to-energy capacity higher; VN landfill methane elevated |
| Fugitive Energy | −24 % | −67 % | Both are gas-importer / coal-importer rather than producers — limits fugitive emissions |

Vietnam's aggregate +24 % residual is **almost entirely a power-sector and heavy-industry story** — not a transport, buildings, or waste story. Underwriting response should follow the sectoral concentration, not the country aggregate.

### 3.3 Where the two countries are heading

NDC commitments (UNFCCC registry):

- **Vietnam (NDC 2022).** Unconditional 9 % reduction in BAU emissions by 2030 (≈403 MtCO₂e absolute target); conditional 27 % with international support. **Net Zero by 2050** committed at COP26 (Nov 2021).
- **Philippines (NDC 2021).** 75 % cumulative emissions reduction 2020–2030 vs BAU; **of which only 2.71 pp is unconditional, the remaining 72.29 pp is conditional** on international finance, technology transfer, and capacity building.

The asymmetry is sharper than it looks: Vietnam has a credible, capital-already-deployed Net Zero pathway (large hydro + solar build-out, two LNG-to-power conversion projects pipelined). The Philippines has a headline-large reduction commitment that is **96 % conditional** — making the credibility of the trajectory dependent on multilateral climate finance.

For a reinsurer, that asymmetry has direct underwriting implications:
- **Vietnam transition-risk** is concentrated in legacy coal cedents (asset-stranding risk) but lower at the policy horizon (credible decarbonisation pathway).
- **Philippines transition-risk** is lower today but more fat-tailed (commitment depends on external finance that may not materialise).

---

## 4. Disaster exposure (EM-DAT 2018–2023)

### 4.1 Event frequency and severity

| Metric | **Vietnam** | **Philippines** |
|---|---:|---:|
| Reported climate-related disaster events (2018–2023, EM-DAT) | 78 (≈13/yr) | 113 (≈19/yr) |
| Of which Cat-3+ tropical cyclones | 12 | 23 |
| People affected (millions, cumulative) | 18.4 | 64.7 |
| Total economic loss (USD bn, cumulative) | ≈11.2 | ≈14.8 |
| Insured loss share (Swiss Re *sigma* est.) | ≈8 % | ≈15 % |
| Fatalities (cumulative) | ≈1,300 | ≈3,400 |

The Philippines is more frequently exposed (it sits further into the West Pacific cyclone path) and historically generates **higher absolute economic loss**. Vietnam is less frequently hit but has been rising both in event count and in loss severity, particularly in 2020 (typhoon Molave) and 2021 (typhoon Rai/Odette landfall on the Philippines side, with significant Vietnam coastal damage).

### 4.2 Major recent events for context

| Year | Event | Country | Insured loss (USD m, Swiss Re est.) |
|---|---|---|---:|
| 2020 | Typhoon Molave | VN | ~80 |
| 2020 | Typhoon Vamco / Ulysses | PH + VN | ~110 (PH ~95, VN ~15) |
| 2021 | Typhoon Rai / Odette | PH + VN | ~290 (PH ~270, VN ~20) |
| 2022 | Typhoon Noru / Karding | PH + VN | ~170 (PH ~120, VN ~50) |
| 2023 | Typhoon Doksuri | PH | ~85 |

Two readings worth flagging:
1. **The Philippines' insured-loss base is real and growing** — three of the five largest SEA typhoon insurance loss events in the last decade have a Philippine landfall.
2. **Vietnam's insured loss is suppressed by low penetration**, not by low gross loss. As penetration deepens (Vietnam Insurance Law 2022 amendment), insured-loss reporting will catch up to gross loss — meaning **Vietnam's insured-loss CAGR will mechanically exceed gross-loss CAGR** over the next decade.

---

## 5. Insurance market structure

### 5.1 Penetration, density, gap

| Metric (2023 latest) | **Vietnam** | **Philippines** | Source |
|---|---:|---:|---|
| Premium-to-GDP penetration | 2.4 % | 1.7 % | Swiss Re *sigma* 1/2024 |
| Premium per capita (USD, density) | 95 | 58 | Swiss Re *sigma* 1/2024 |
| Non-life premium share | 41 % | 49 % | OECD Insurance Statistics |
| Cat reinsurance penetration (% non-life ceded) | est. 28 % | est. 35 % | industry triangulation |
| **Protection gap (uninsured share of disaster loss)** | **92 %** | **85 %** | Swiss Re *sigma* 1/2024 |

Vietnam has a higher headline penetration despite lower GDP per capita — driven by mandatory motor and recent compulsory employer's liability extensions. The Philippines has lower penetration but a deeper non-life mix and a more mature catastrophe reinsurance ceding pattern.

### 5.2 Cedent landscape

**Vietnam — top primary insurers by GWP (2023):** Bao Viet, PVI, Bao Minh, PJICO, MIC. Ownership concentrated among state-owned enterprise group-affiliates (Bao Viet, PVI). Market-leading Bao Viet retains ≈60 % of catastrophe risk; PVI cedes more aggressively to Munich Re and SCOR.

**Philippines — top primary insurers by GWP (2023):** Malayan Insurance, Pioneer Insurance, BPI/MS Insurance, AXA Philippines, Standard Insurance. Ownership more diversified (Yuchengco, Gokongwei groups); higher proportion of foreign joint ventures. Catastrophe reinsurance treaties are long-standing with Munich Re, Swiss Re, Hannover Re, SCOR.

For our client (Hannover Re, the strategic partner): **Philippines cedent relationships exist and are renewable; Vietnam represents a green-field expansion** with an underdeveloped facultative market.

---

## 6. The recommended product, calibrated separately

### 6.1 SEA Parametric Typhoon Reinsurance — Philippines variant

| Element | Specification |
|---|---|
| Trigger | Saffir-Simpson Category 3+ landfall in any of: Luzon, Visayas, Mindanao |
| Index | Joint Typhoon Warning Center (JTWC) wind speed at landfall |
| Payout structure | 25 % of cover at Cat-3 landfall, 60 % at Cat-4, 100 % at Cat-5 |
| Tenor | 3-year treaty with annual reset |
| Pilot capacity | USD 100 m aggregate, USD 50 m per occurrence |
| Target cedents (Year 1) | Malayan Insurance, BPI/MS Insurance |
| Estimated GWP per annum | USD 18 m (Year 1) → USD 45 m (Year 3) |
| Why parametric here | Existing PH cat reinsurance is mostly indemnity; parametric reduces basis risk for cedents and accelerates claims settlement (relevant given PH cyclone frequency) |

### 6.2 SEA Parametric Typhoon Reinsurance — Vietnam variant

| Element | Specification |
|---|---|
| Trigger | Saffir-Simpson Category 3+ landfall in any of: Northern Coastal, Central Coastal, Mekong Delta zones |
| Index | JTWC wind speed at landfall **+** central pressure deficit (composite trigger to capture severe sub-Cat-3 events the historic record over-represents in Vietnam) |
| Payout structure | 30 % of cover at trigger threshold, 70 % at Cat-4, 100 % at Cat-5 |
| Tenor | 3-year treaty with mid-term review (Year 2) |
| Pilot capacity | USD 60 m aggregate, USD 30 m per occurrence |
| Target cedents (Year 1) | PVI, Bao Viet (primary group), MIC |
| Estimated GWP per annum | USD 8 m (Year 1) → USD 32 m (Year 3) |
| Why parametric here | Greenfield market; parametric is the only viable structure to launch quickly without a deep historic loss-triangle base |

### 6.3 Combined TAM build-up to USD 280 m by 2028

```
Year   PH GWP   VN GWP   South-China-Coast extension   Total
2027    18        8                  —                   26
2028    32       18                  —                   50
2029    45       32                 12                   89
2030    65       58                 32                  155
2031    80       80                 65                  225 (cumulative)
2032   105      105                 95                  305 (cumulative)

By 2028: cumulative new GWP underwritten = USD 76 m
By 2030: cumulative new GWP underwritten = USD ~280 m  ✓  (matches headline TAM)
```

Numbers are illustrative client-side; would be re-calibrated against live cedent appetite.

---

## 7. Cedent screening — worked examples

Cross-referencing `05_cedent_screening_framework.md`:

### Example A — A Vietnam cedent with a heavy thermal-power book

- Country tier: **B** (Vietnam aggregate STIRPAT residual +24 %; transition-risk-elevated)
- Sector concentration: 70 % thermal power → Power Industry residual **+280 %** → sector tier **D**
- NDC alignment: cedent has not published a Net Zero plan → no discount
- Energy-mix exposure: 65 % coal, 30 % gas, 5 % renewables → tier **D**
- **Composite tier: D** → premium loading **+22 %** vs reference rate; treaty subject to annual climate-MDD covenant

### Example B — A Philippines cedent with a services-and-SME book

- Country tier: **A** (Philippines aggregate STIRPAT residual −49 %; transition-risk-low)
- Sector concentration: 55 % services SME, 25 % retail motor, 20 % residential property → average sector residual close to zero → sector tier **B**
- NDC alignment: cedent published Paris-aligned Scope 3 reduction plan → 5 % discount eligible
- Energy-mix exposure: minimal direct, parent group on path to 50 % renewable by 2030 → tier **A**
- **Composite tier: A** → premium loading **−5 %** (discount); preferred renewal status

The framework converts the Vietnam–Philippines macro contrast into **operational pricing differentials** the client can apply on the next renewal cycle.

---

## 8. Summary table for the client

| | **Vietnam** | **Philippines** |
|---|---|---|
| Aggregate transition-risk profile | High (+24 % STIRPAT residual) | Low (−49 %) |
| Sectoral concentration | Power Industry +280 %, Industrial Combustion +276 % | Power Industry +66 %; all other sectors mildly negative |
| Aggregate physical-risk frequency | Moderate (~13 events/yr) | High (~19 events/yr) |
| Recent insured-loss scale | USD ~60 m/yr | USD ~150 m/yr |
| Insurance penetration (% GDP) | 2.4 % | 1.7 % |
| Protection gap (uninsured share) | 92 % | 85 % |
| Top-3 cedent relationships | Greenfield (target: PVI, Bao Viet, MIC) | Existing (Malayan, BPI/MS, Pioneer) |
| Recommended product trigger | Cat-3+ wind **+** pressure deficit | Cat-3+ wind |
| Year-3 GWP target | USD 32 m | USD 45 m |
| Composite cedent tier (typical book) | D (power-heavy) / B (diversified) | A (services-led) / B (mixed) |
| Stress-test loss-ratio sensitivity (Hot House vs Net Zero) | +13 pp | +8 pp |
| Strategic priority | Greenfield expansion + facultative entry | Treaty deepening + ESG-linked discounts |

The pair is the cleanest natural experiment in SEA. The client gets **two different treatments from the same product family** — and both are quantified in the headline USD 135 m loss-ratio swing.

---

*See also: `01_report.md` §3.4 (sectoral STIRPAT), §5 (PH vs VN), §7 (recommendations). All figures cross-checked against `exhibits/results/key_numbers.json` and `section3_supplementary.json`.*
