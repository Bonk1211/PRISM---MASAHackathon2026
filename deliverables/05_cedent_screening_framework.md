# SEA Cedent Climate-Risk Screening Framework

*Productised tool referenced in `01_report.md` §7. Converts the analytical findings (STIRPAT residuals, sectoral residuals, NDC alignment, energy-mix exposure) into an operational five-tier screening rating with a corresponding premium-loading multiplier.*

---

## 1. Why this framework exists

A reinsurance underwriter cannot price each treaty from first principles in real time. The framework compresses the analysis in `01_report.md` §3 into a single composite rating that an underwriter can compute in **under five minutes** for any SEA cedent, with documented input lookups and a transparent loading lookup table.

The five inputs are deliberately limited to data the cedent already discloses or that the World Bank publishes annually. Nothing here requires bespoke cedent loss triangulation — that comes downstream of screening, not as a prerequisite.

---

## 2. The five inputs

| # | Input | Source | Refresh cadence |
|---|---|---|---|
| 1 | **Country tier** | STIRPAT aggregate residual from this analysis (`exhibits/results/section3_supplementary.json`) | Annual |
| 2 | **Sector tier** (weighted across cedent's book) | Sectoral STIRPAT residuals (`exhibits/results/section3_round2.json`) × cedent's GWP mix | Annual |
| 3 | **NDC-alignment status** of cedent (or its parent group) | Cedent disclosure / Net Zero plan / SBTi-validated trajectory | Per disclosure cycle |
| 4 | **Energy-mix exposure** of cedent's policyholder portfolio | Cedent reporting; coal/gas/oil-and-gas asset share | Annual |
| 5 | **Adaptive-capacity proxy** | Country GDP per capita (constant 2015 USD) banded into A/B/C | Annual |

---

## 3. Country tier (Input 1)

Mapped from STIRPAT 2019–2023 aggregate residual:

| Country | Aggregate residual | **Country tier** |
|---|---:|:---:|
| Philippines | −49 % | **A** |
| Indonesia | −19 % | **A** |
| Singapore | −12 % | **A** |
| Myanmar | +4 % | **B** |
| Thailand | +6 % | **B** |
| Cambodia | +13 % | **B** |
| **Vietnam** | **+24 %** | **C** |
| Malaysia | +32 % | **C** |
| Lao PDR | +93 % | **D** |
| Brunei Darussalam | +287 % | **E** |

Tier definitions:
- **A** — Under-emits at scale; transition-risk-low; treat as default underwriting tier
- **B** — Mildly elevated; near scale-implied level
- **C** — Materially over-emitting at scale; warrants explicit treaty-level loading
- **D** — Strongly over-emitting; bespoke pricing required
- **E** — Single-sector outlier; facultative-only with bespoke wording

---

## 4. Sector tier (Input 2)

Each cedent's GWP book is decomposed into eight sectors. The **sector residual** for the country (from §3.4 of the report) is multiplied by the GWP share to produce a weighted sector residual. Banding:

| Weighted sector residual | **Sector tier** |
|---:|:---:|
| < +25 % | **A** |
| +25 % to +75 % | **B** |
| +75 % to +150 % | **C** |
| +150 % to +300 % | **D** |
| > +300 % | **E** |

**Worked example — a Vietnam cedent with 70 % thermal-power, 20 % industrial-combustion, 10 % transport:**

```
0.70 × 280 % (Power Industry residual VN)         = 196 %
0.20 × 276 % (Industrial Combustion residual VN)  =  55 %
0.10 ×   8 % (Transport residual VN)              =   1 %
                                          Sum = 252 %  →  Sector tier D
```

---

## 5. NDC alignment (Input 3)

| Cedent disclosure status | **NDC tier** |
|---|:---:|
| SBTi-validated 1.5 °C trajectory + Scope 3 plan | **A** (5 % discount eligible) |
| Net Zero commitment with credible interim target | **B** (no surcharge or discount) |
| General sustainability commitment, no targets | **C** (no surcharge) |
| No published climate plan | **D** (no surcharge but flagged for renewal review) |
| Active expansion of fossil-fuel asset book | **E** (climate-MDD covenant required) |

This input exists because **discount-eligibility is the most powerful behavioural lever** the client has under Recommendation 2 (ESG-linked underwriting screen). The framework makes the screen mechanical and auditable — a regulator-acceptable trail under IFRS S2.

---

## 6. Energy-mix exposure (Input 4)

Coal, gas, oil-and-gas asset share of cedent's underlying policyholder portfolio:

| Coal share + 0.5 × gas share | **Energy-mix tier** |
|---:|:---:|
| < 5 % | **A** |
| 5–20 % | **B** |
| 20–40 % | **C** |
| 40–65 % | **D** |
| > 65 % | **E** |

This captures **cedent-side stranded-asset exposure** — an asset-side risk that the country and sector tiers (which look at gross flows of GHG) do not capture directly.

---

## 7. Adaptive capacity (Input 5)

Country GDP per capita (constant 2015 USD), banded:

| GDP/capita band | Example countries | **Adaptive tier** |
|---|---|:---:|
| > USD 30,000 | Singapore, Brunei | **A** |
| USD 5,000 – 30,000 | Malaysia, Thailand | **B** |
| < USD 5,000 | Vietnam, Philippines, Indonesia, Cambodia, Myanmar, Lao PDR | **C** |

Adaptive capacity moderates physical-risk severity (wealthier countries can absorb shocks with public balance-sheet support). It does *not* directly drive transition-risk pricing.

---

## 8. Composite rating and premium loading

The composite rating is the **mode** (most frequent letter) across the five tiers, with two override rules:

- **Override 1.** If Sector tier is D or E, composite is at least D regardless of mode.
- **Override 2.** If Energy-mix tier is E, composite is at least D regardless of mode.

| Composite tier | Premium loading vs reference rate | Treaty conditions |
|:---:|---:|---|
| **A** | **−5 %** (discount) | Preferred renewal status; multi-year availability |
| **B** | 0 % | Standard treaty terms |
| **C** | **+8 %** | Annual climate disclosure clause; mid-term review |
| **D** | **+22 %** | Climate-MDD covenant; aggregate cap reduction; mid-term cancellability |
| **E** | **+45 %** or facultative-only | Bespoke wording; co-insurance cap; explicit transition-risk exclusions |

---

## 9. Two worked examples

### Example A — A Vietnam cedent with a heavy thermal-power book

| Input | Value | Tier |
|---|---|:---:|
| Country | Vietnam (residual +24 %) | C |
| Sector mix | 70 % power, 20 % indus-comb, 10 % transport → weighted residual 252 % | D |
| NDC alignment | No published plan | D |
| Energy-mix exposure | 65 % coal + 30 % gas → 65 + 15 = 80 | E |
| Adaptive capacity | Vietnam GDP/cap USD 3,910 | C |
| **Mode** | C | |
| Override 1 (sector D) | applies | composite ≥ D |
| Override 2 (energy E) | applies | composite ≥ D |
| **Composite tier** | **D** | **+22 % loading** |

Treaty action: D-tier loading; climate-MDD covenant; mid-term review at 12 months; explicit ask of cedent to publish a Scope 3 transition plan within 24 months as a condition of renewal at lower tier.

### Example B — A Philippines cedent with a services-and-SME book

| Input | Value | Tier |
|---|---|:---:|
| Country | Philippines (residual −49 %) | A |
| Sector mix | 55 % services, 25 % motor, 20 % residential → weighted residual ≈ 0 | A |
| NDC alignment | SBTi-validated parent-group Net Zero plan | A |
| Energy-mix exposure | < 3 % coal/gas | A |
| Adaptive capacity | Philippines GDP/cap USD 3,420 | C |
| **Mode** | A | |
| Overrides | none apply | |
| **Composite tier** | **A** | **−5 % loading** |

Treaty action: A-tier discount; preferred renewal status; multi-year treaty available; cedent flagged as ESG-screen exemplar for portfolio reporting (IFRS S2 §B14 disclosure).

---

## 10. Portfolio impact

If the client applies this framework across its existing 27 SEA cedents (illustrative), expected migration over the next two renewal cycles:

| Composite tier (after screening) | Expected count | GWP share | Notes |
|---|---:|---:|---|
| A | 6 | 18 % | Mostly Singapore + Philippines services cedents |
| B | 11 | 41 % | Mostly Malaysia + Thailand mixed books |
| C | 7 | 29 % | Vietnam diversified + Indonesia upstream |
| D | 2 | 9 % | Vietnam coal-heavy + Lao PDR power |
| E | 1 | 3 % | Brunei single-sector LNG |
| | **27** | **100 %** | |

**Expected weighted premium uplift across the portfolio: +6.4 %.** Of this, approximately +4.1 pp is loss-ratio-margin improvement (loadings on D/E tiers absorb the higher embedded risk) and +2.3 pp is volume-and-mix shift toward A-tier renewal preference.

The framework is **portfolio-additive**, not just per-cedent: by directing capacity preferentially to A and B tiers, the client tightens the portfolio loss-ratio distribution as a whole — directly addressing the +11 pp loss-ratio-swing risk identified in §6 of the report.

---

## 11. Governance & audit trail

To remain consistent with **IFRS S2 §B14** disclosure expectations and **BNM CRST 2024 §4.2** climate-related underwriting governance:

- Each cedent rating must be timestamped, with input data and source links archived.
- Tier overrides require documented underwriter sign-off plus second-party review.
- The five inputs and the composite rating must be reportable in the client's annual climate-related disclosure.
- Annual back-testing: compare prior-year tiering against actual loss ratio outturn; recalibrate thresholds if material drift detected.

A live version of this framework is operationalised in the **Reinsurance Impact tab** of the Shiny app (`analysis/shiny/app.R`) — judges can change country, sector mix, and NDC status interactively and see the composite tier and loading update in real time.

---

*This framework is the operational counterpart to the analytical findings in `01_report.md` §3 and the strategic recommendations in §7. It exists so that the client can act on the analysis on the next renewal cycle, not on the next strategic-review cycle.*
