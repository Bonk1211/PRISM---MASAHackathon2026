# Vietnam vs Philippines — Deep-Dive Comparison

*Companion to `01_report.md` §5. Every number traces to a source file cited inline. Sigma 12 % insured-share = `EMDAT_VN_PH.insuredShareSigma`; portfolio assumptions (GWP USD 1.2 bn, base LR 0.62, elasticity 0.7) = `keyNumbers.ts:PORTFOLIO`.*

---

## 1. Why this pair, not any other

Vietnam and Philippines share the **West-Pacific typhoon belt** — same hazard, same landfall geometry — which holds the physical-risk peril roughly constant. They diverge on every other dimension that matters to a reinsurer: **transition profile** (VN aggregate STIRPAT residual +24 % vs PH −49 %; `COUNTRY_TIER`), **adaptive readiness** (VN ND-GAIN 48.1 vs PH 45.6; `NDGAIN_2023`), and **market depth** (VN penetration ~2.4 % vs PH ~1.7 %, Swiss Re *sigma* 1/2024). The pair is the cleanest natural experiment in SEA for separating physical-risk from transition-risk pricing.

---

## 2. Physical risk — EM-DAT 2018–23

| Metric | Vietnam | Philippines | Source |
|---|---:|---:|---|
| Reported events (6 yrs) | 48 | 75 | `EMDAT_VN_PH.{vn,ph}.events` |
| Events per year | 8.0 | 12.5 | `EMDAT_VN_PH.{vn,ph}.perYear` |
| Storms | 26 | 41 | `EMDAT_VN_PH.{vn,ph}.storms` |
| Floods | 21 | 13 | `EMDAT_VN_PH.{vn,ph}.floods` |
| Other (quake / volcanic / mass-mvmt / drought) | 1 | 21 | `EMDAT_VN_PH.{vn,ph}.other` |
| People affected (m, cumulative) | 4.5 | 54.5 | `EMDAT_VN_PH.{vn,ph}.affectedM` |
| Fatalities (cumulative) | 620 | 2,008 | `EMDAT_VN_PH.{vn,ph}.deaths` |
| Economic damage (USD bn, 2024-CPI) | 2.30 | 4.81 | `EMDAT_VN_PH.{vn,ph}.damageUsdBn2024` |
| **Implied insured loss / yr (sigma 12 %)** | **USD 46 m** | **USD 96 m** | derived: damage × 0.12 ÷ 6 |

PH carries **2.1× the cumulative damage and 12× the affected count** in the same window. PH peril mix is multi-peril (21 non-storm/flood events vs 1 in VN) — a PH treaty is structurally different from a VN typhoon-only treaty.

---

## 3. Transition risk — STIRPAT sectoral residuals

| Sector | Vietnam residual | Philippines residual | Source |
|---|---:|---:|---|
| Power Industry | **+280 %** | **+66 %** | `SECTOR_RESIDUAL_PCT` |
| Industrial Combustion | **+276 %** | **−8 %** | `SECTOR_RESIDUAL_PCT` |
| Industrial Processes | +147 % | −12 % | `SECTOR_RESIDUAL_PCT` |
| Fugitive Energy | +24 % | −5 % | `SECTOR_RESIDUAL_PCT` |
| Buildings | +12 % | −4 % | `SECTOR_RESIDUAL_PCT` |
| Transport | +8 % | +5 % | `SECTOR_RESIDUAL_PCT` |
| Agriculture | −5 % | −2 % | `SECTOR_RESIDUAL_PCT` |
| Waste | −9 % | +3 % | `SECTOR_RESIDUAL_PCT` |
| **Aggregate** | **+24 %** (Tier C) | **−49 %** (Tier A) | `COUNTRY_TIER` |

VN's aggregate is almost entirely a **Power + Industrial-Combustion story** — a coal-build-out and heavy-industry FDI cluster. PH under-emits at scale across every sector except Power. Underwriting must follow the sectoral concentration, not the headline.

---

## 4. Adaptive capacity — ND-GAIN 2023

| Metric | Vietnam | Philippines | Source |
|---|---:|---:|---|
| ND-GAIN composite (0–100) | **48.1** | **45.6** | `NDGAIN_2023` |
| Vulnerability pillar (0–1, ↓ better) | 0.468 | 0.444 | `NDGAIN_2023` |
| Readiness pillar (0–1, ↑ better) | **0.429** | **0.356** | `NDGAIN_2023` |
| Adaptive tier (per `cedent.ts:adaptiveTier`) | C | C | derived |

PH is **less vulnerable** (0.444 < 0.468) but **less ready** (0.356 < 0.429). VN edges PH on the composite because its readiness gap (+0.073) outweighs its vulnerability gap (+0.024) — VN has the policy and economic capacity to deploy adaptation finance at scale; PH's adaptation depends more on multilateral support. This is the same condition that makes VN viable for early parametric-product launch.

---

## 5. Market structure

| Metric (2023) | Vietnam | Philippines | Source |
|---|---:|---:|---|
| Premium / GDP penetration | 2.4 % | 1.7 % | Swiss Re *sigma* 1/2024 |
| Protection gap (uninsured share) | **92 %** | **85 %** | Swiss Re *sigma* 1/2024 |
| Cedent landscape | Greenfield (PVI, Bao Viet, MIC) | Established (Malayan, BPI/MS, Pioneer) | OECD Insurance Stats 2023 |

VN runs a higher penetration headline but a **wider protection gap** — the wider commercial opening for new product. PH is the deeper, more renewable book.

---

## 6. Cedent screening — worked examples (per `05_cedent_screening_framework.md`)

### Example A — VN cedent, diversified non-power book

- Country tier: **C** (`COUNTRY_TIER.Vietnam`, residual +24 %)
- Sector mix: 30 % motor, 30 % property, 25 % marine, 15 % power → weighted residual = 0.15×280 + 0.85×~5 = **~46 %** → Sector tier **B** (`sectorTier`)
- Adaptive tier: **C** (ND-GAIN 48.1)
- Mode of {C, B, C} = **C** → **+8 % loading**, annual climate-disclosure clause (`LOADING.C`)

### Example B — PH cedent, services-and-SME book

- Country tier: **A** (`COUNTRY_TIER.Philippines`, residual −49 %)
- Sector mix: 55 % services, 25 % motor, 20 % residential → weighted residual ≈ **0 %** → Sector tier **A**
- Adaptive tier: **C** (ND-GAIN 45.6)
- Mode of {A, A, C} = **A** → **−5 % discount**, preferred renewal (`LOADING.A`)

The framework converts the macro contrast into a **13-pp pricing differential** the client can apply at next renewal.

---

## 7. Loss-ratio sensitivity — Power-heavy book in each country

Hot House → Net Zero swing: aggregate emissions delta = +35 % (744 / 609 − 1; `STRESS_2030`); LR swing = **+11 pp**, **USD 135 m** on the USD 1.2 bn book (`HEADLINE.lossSwingUsdM`).

Allocating to a **Power-heavy book (70 % Power, 30 % Industrial-Combustion)** in each country, weighting the regional swing by the Power+IndCombustion sectoral residual ratio (VN 0.7×280 + 0.3×276 = **278.8** vs PH 0.7×66 + 0.3×−8 = **43.8**; `SECTOR_RESIDUAL_PCT`):

| Book | Sector-weighted residual | Implied LR swing | Share of headline USD 135 m |
|---|---:|---:|---:|
| VN Power-heavy | +278.8 % | **+13.0 pp** | ~USD 78 m |
| PH Power-heavy | +43.8 % | **+2.0 pp** | ~USD 12 m |

**VN contributes ~6.5× more loss-ratio sensitivity per dollar of Power-heavy GWP** than PH. The headline USD 135 m is disproportionately a Vietnam-power story.

---

## 8. Strategic conclusion

**Vietnam = primary new-product target.** Greenfield cedent base, widest protection gap (92 %), highest readiness, and a Power-sector residual (+280 %) that makes ESG-screen discounts the highest-leverage behavioural lever. Launch parametric typhoon (Cat-3+ wind + pressure-deficit composite trigger) into PVI / Bao Viet / MIC; pair with the +8 % Tier-C loading and a climate-MDD covenant on coal-heavy sub-books. **Philippines = capital-discipline + multi-peril optimisation.** Existing treaty relationships, Tier-A pricing on services-led cedents, and a multi-peril hazard signature (21 non-storm events 2018-23) argue for deepening cat-XL capacity and offering A-tier discount as a renewal-retention tool, not for greenfield expansion.

---

*Cross-references: `01_report.md` §3.4 (sectoral residuals), §5 (PH vs VN), §6 (loss ratio), §7 (recommendations); `05_cedent_screening_framework.md` (tier logic); `exhibits/results/key_numbers.json` (`stress_test_2030_aggregate`); `frontend/src/data/keyNumbers.ts` (`EMDAT_VN_PH`, `NDGAIN_2023`, `STRESS_2030`, `HEADLINE`); `frontend/src/data/cedent.ts` (`COUNTRY_TIER`, `SECTOR_RESIDUAL_PCT`, `LOADING`).*
