# Indonesia — Counterfactual Application of the PRISM Framework

*Counterfactual to `04_vietnam_vs_philippines_deep_dive.md`. Proves the cedent-screening + loss-ratio methodology generalises beyond a two-country case study. Every number traces to a source file cited inline. Portfolio assumptions (GWP USD 1.2 bn, base LR 0.62, elasticity 0.7) = `keyNumbers.ts:PORTFOLIO`.*

---

## 1. Why Indonesia

Indonesia is the natural counterfactual to the VN vs PH pairing. It is the **largest absolute SEA emitter** (1,323.78 Mt CO₂e actual 2024, vs Vietnam 584.26 Mt and Philippines 266.60 Mt; `FORECAST_2024`), runs the **opposite STIRPAT direction to Vietnam** (aggregate residual −19 % Tier A vs VN +24 % Tier C; `COUNTRY_TIER`), and exhibits a **multi-peril hazard signature** that neither VN (typhoon-flood) nor PH (typhoon-multi-peril-Pacific) replicates — Indonesia's EM-DAT 2018–2023 record (`external_features_sea.csv`) shows volcanic, earthquake, flood, and occasional typhoon co-loaded onto a single national book. Insurance market is **deeper than Vietnam, less mature than the Philippines** (largest non-life GWP base in ASEAN by absolute volume; established cedents like Asuransi Sinar Mas, Tugu, MNC Insurance). If the framework still produces a meaningful pricing differential here, it generalises beyond a two-country case study.

---

## 2. Apply STIRPAT — Indonesia vs VN+PH

| Sector | IDN residual | VN residual | PH residual | Source |
|---|---:|---:|---:|---|
| Power Industry | **+77 %** | +280 % | +66 % | `SECTOR_RESIDUAL_PCT` |
| Industrial Combustion | **+65 %** | +276 % | −8 % | `SECTOR_RESIDUAL_PCT` |
| Industrial Processes | **+30 %** | +147 % | −12 % | `SECTOR_RESIDUAL_PCT` |
| Fugitive Energy | **+83 %** | +24 % | −5 % | `SECTOR_RESIDUAL_PCT` |
| Buildings | **+6 %** | +12 % | −4 % | `SECTOR_RESIDUAL_PCT` |
| Transport | **+5 %** | +8 % | +5 % | `SECTOR_RESIDUAL_PCT` |
| Agriculture | **−10 %** | −5 % | −2 % | `SECTOR_RESIDUAL_PCT` |
| Waste | **−8 %** | −9 % | +3 % | `SECTOR_RESIDUAL_PCT` |
| **Aggregate** | **−19 % (Tier A)** | +24 % (Tier C) | −49 % (Tier A) | `COUNTRY_TIER` |

Two findings. First, Indonesia's headline Tier-A status **masks two latent transition hotspots**: Power (+77 %) and Fugitive Energy (+83 %) — both upstream-coal/gas concentrations characteristic of PLN-aligned thermal generation and oil-and-gas extraction. Second, IDN's sectoral residuals are **directionally aligned with Vietnam** (Power, IndCombustion, Fugitive all over-emitting) but at roughly one-quarter the intensity. Indonesia is a **scale story moderated by adaptation effort**, where Vietnam is a **growth story unmoderated by adaptation effort**.

---

## 3. Apply cedent screen — IDN Power-heavy worked example

Hypothetical cedent: 60 % Power Industry, 25 % Industrial Combustion, 15 % Transport.

```
Indonesia weighted residual:
0.60 × 77 % (Power)              = 46.2 %
0.25 × 65 % (IndCombustion)      = 16.3 %
0.15 ×  5 % (Transport)          =  0.8 %
                          Sum    = 63.3 %  →  Sector tier B  (per `sectorTier`, +25..+75 → B)
```

| Input | Value | Tier |
|---|---|:---:|
| Country | Indonesia (residual −19 %) | A (`COUNTRY_TIER`) |
| Sector mix | Weighted residual 63.3 % | **B** (`sectorTier`) |
| Adaptive | ND-GAIN 48.4 (`NDGAIN_2023`) | C (`adaptiveTier`, 45–55 band) |
| **Mode of {A, B, C}** | no repeats — defaults to first listed by ORDER frequency rule | **A** (counts equal, A wins ORDER tie-break per `cedent.ts:composite`) |
| Override (sector D/E?) | sector is B — not triggered | — |
| **Composite** | **A** | **−5 % discount** (`LOADING.A`) |

**Counterfactual comparison.** A VN cedent with identical mix:

```
Vietnam weighted residual:
0.60 × 280 % + 0.25 × 276 % + 0.15 × 8 %  =  168 + 69 + 1.2  = 238 %  →  Sector tier D
```

With VN country tier C, ND-GAIN 48.1 → adaptive C, mode = C, **but** Sector tier D triggers Override 1 → composite **D**, **+22 % loading** (`LOADING.D`). The same business mix re-prices **27 percentage points** apart between Indonesia (−5 %) and Vietnam (+22 %) — the framework is not country-agnostic but it correctly rewards Indonesia's lower-intensity sectoral footprint.

A PH cedent with identical mix produces sector tier B (0.60×66 + 0.25×−8 + 0.15×5 ≈ 38.5 %), country A, adaptive C → composite A → **−5 %**. IDN and PH price equivalently on this Power-heavy mix; VN does not. This is the diagnostic the methodology is built to surface.

---

## 4. Apply stress test — IDN-only loss-ratio swing

Indonesia represents an illustrative **30 % share of the USD 1.2 bn notional book** (IDN-allocated GWP ≈ USD 360 m). *Note: GWP allocation is illustrative — Hannover Re does not disclose country-level SEA splits.* Applying the four NGFS Phase V scenario growth bands (`STRESS_2030`) directly to Indonesia's actual 2024 emissions baseline (1,323.78 Mt; `FORECAST_2024`) compounded over 6 years (2024 → 2030):

| Scenario | Annual growth | IDN 2030 emissions (Mt) | Δ vs Current | IDN LR | IDN expected loss (USD m) |
|---|---:|---:|---:|---:|---:|
| Net Zero 2050 | −0.025 | 1,138.2 | −14.0 % | 0.530 | 191 |
| Mitigation | −0.010 | 1,246.1 | −5.9 % | 0.594 | 214 |
| Delayed Transition | +0.010 | 1,405.5 | +6.2 % | 0.647 | 233 |
| Current Policies (Hot House) | +0.025 | 1,535.8 | +16.0 % | 0.689 | 248 |

Loss-ratio applied per `PORTFOLIO.elasticity = 0.7` with base LR 0.62: ΔLR = 0.62 × (1 + 0.7 × Δemissions / baseline). **IDN-only Hot House → Net Zero loss-ratio swing = +15.9 pp, ≈ USD 57 m on the USD 360 m IDN slice.** Indonesia alone contributes ~42 % of the headline USD 135 m regional swing despite being 30 % of GWP — a function of its absolute scale dominating the SEA emissions base.

---

## 5. Strategic conclusion

**Indonesia is a portfolio diversifier, not a flagship target.** The country sits in Tier A (−19 % residual) — the framework treats it as default-priced — but its **Power (+77 %) and Fugitive Energy (+83 %) residuals are the second-highest in SEA after Vietnam and Lao PDR**, signalling latent stranded-asset risk underneath a benign aggregate headline. The **multi-peril hazard signature** (Indonesia EM-DAT 2018–2023 derived from `external_features_sea.csv`: 126 events, ~28.2 m people affected cumulatively, ~6,997 deaths, ~USD 6.1 bn cumulative damage at 2024 CPI) means a parametric typhoon product designed for VN/PH coastlines is the **wrong peril** — Indonesia's losses are dominated by earthquake, volcanic, and flood, none of which correlate with Saffir-Simpson triggers.

**Recommended IDN-specific product: Renewable-energy-linked treaty discount** for cedents with credible coal-phaseout commitments. Mechanism: tie the Tier-A discount (−5 %) to an additional −3 to −5 pp loading rebate conditional on the cedent's underlying policyholder portfolio shifting >20 % of its energy-mix exposure (`cedent_screening_framework §6`) out of coal within 36 months. This leverages the +77 % Power residual (highest single transition lever in IDN) as a behavioural pricing instrument, while the adaptive tier (C; ND-GAIN 48.4) is used to scale the deferment window — IDN has the institutional readiness to deliver, but not at PH/SG speed. Pair with a **multi-peril cat-XL layer** sized off the 2018–2023 average (≈USD 1.0 bn damage/yr × 12 % insured share ≈ USD 122 m annual implied insured loss), distinct from the VN typhoon-only treaty design.

The methodology generalises. IDN, VN, and PH each generate a coherent and **distinct** pricing recommendation from the same five inputs — a case study would not.

---

*Cross-references: `01_report.md` §3.4, §6; `04_vietnam_vs_philippines_deep_dive.md` (parallel structure); `05_cedent_screening_framework.md` §3, §4, §7, §8; `exhibits/results/key_numbers.json` (`m3_per_country.Indonesia`, `stress_test_2030_aggregate`); `frontend/src/data/keyNumbers.ts` (`FORECAST_2024`, `NDGAIN_2023`, `STRESS_2030`, `PORTFOLIO`); `frontend/src/data/cedent.ts` (`COUNTRY_TIER.Indonesia`, `SECTOR_RESIDUAL_PCT.Indonesia`, `LOADING`); `data/external/external_features_sea.csv` (Indonesia EM-DAT 2018–2023, derived sums).*
