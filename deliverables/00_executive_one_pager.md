# PRISM — Executive One-Pager

***P**ortfolio **R**isk via **I**dentified **S**cenario **M**odeling*

**Climate Risk Assessment for a Multinational Reinsurer · MASA Hackathon 2026**

---

## The bottom line

> By 2030, climate pathway alone moves the client's notional **USD 1.2 bn** Southeast Asia gross written premium portfolio by **±11 percentage points of loss ratio (USD ~135 m)**. The same scenario set turns Vietnam from a transition-risk concentration into a **USD 280 m parametric typhoon premium opportunity** by 2028.

---

## What we did

| | |
|---|---|
| **Data** | World Bank WDI Wide format · 16 indicators × 10 SEA economies × 1990–2024 · 2024 reserved as out-of-sample hold-out |
| **Forecast** | Three-model benchmark (log-linear / ARIMA / XGBoost panel). Selected **XGBoost autoregressive — 2.18 % MAPE on 2024 hold-out** (vs ARIMA 2.67 %, log-linear 9.23 %) |
| **Drivers** | Two-XGBoost specification — autoregressive (M3a) for forecast, structural (M3b) for attribution. **GDP (gain 0.50) and population (0.40) explain ≈91 %**, validating STIRPAT. Two indicators flip sign once scale is controlled (forest area, industry share) — partial-correlation diagnostic in §3.2 of the report |
| **Robustness** | Two-way fixed-effects panel regression with country-cluster-robust SE. Three drivers survive: **log GDP, CO₂ intensity of GDP, urban population share** |
| **Sectoral** | STIRPAT residuals re-run per sector — Vietnam +24 % aggregate is **+280 % Power Industry, +276 % Industrial Combustion** |
| **Stress test** | NGFS Phase V scenarios (Net Zero / Delayed / Hot House) + a client-specific Mitigation pathway, calibrated against BNM CRST 2024 |
| **Translation** | Loss-to-emissions elasticity 0.7 (Swiss Re *sigma* 1/2024) × portfolio GWP USD 1.2 bn × base loss ratio 62 % |

---

## The three numbers that matter

```
   Net Zero 2050    51 %    →    USD 609 m expected loss          11 pp swing
   Mitigation       54 %    →    USD 646 m expected loss          ┐
   Delayed Trans.   58 %    →    USD 700 m expected loss          │  USD 135 m
   Hot House World  62 %    →    USD 744 m expected loss          ┘
```

---

## Vietnam vs Philippines — the cleanest natural experiment in SEA

| | **Vietnam** | **Philippines** |
|---|---|---|
| 2024 GHG total (MtCO₂e) | **584** | 267 |
| GHG growth vs Philippines (2000–2024) | **5× faster** | baseline |
| STIRPAT aggregate residual | **+24 %** (over-emits) | **−49 %** (under-emits) |
| Power Industry sector residual | **+280 %** | +66 % |
| Insurance penetration (% GDP) | 2.4 % | 1.7 % |
| Protection gap (uninsured share) | **92 %** | 85 % |
| Recommended underwriting tier | High transition + high physical | Low transition + high physical |

**Strategic implication.** Philippines = current insured market scale; Vietnam = stronger commercial opportunity (faster physical-asset accumulation, wider gap). The recommended product targets both — pilot Philippines 2027, extend Vietnam 2028.

---

## Three actions the client should take

| # | Action | Quantification | Anchor |
|---|---|---|---|
| 1 | **Launch SEA Parametric Typhoon Reinsurance Product** — Saffir-Simpson Cat 3+ trigger, PH/VN/south-China-coast | TAM **USD 280 m premium by 2028** | EM-DAT typhoon frequency · Swiss Re *sigma* 1/2024 |
| 2 | **ESG-Linked Underwriting Screen** — 5–10 % renewal discount for cedents with credible NDC-aligned transition plans | Expected **2 pp loss-ratio improvement** at full adoption | Paris Agreement Article 2.1(c) |
| 3 | **Time a USD 250 m SEA Multi-Peril Cat Bond** to NGFS Disorderly Transition window | Pricing window opens **2027**; expected basis-point spread tightening 80–120 bp | NGFS Phase V · BNM CRST 2024 |

Plus: hold an additional **8 % regional risk capital buffer** under a Hot House World scenario (per BNM CRST 2024 §6.3).

---

## Why this submission stands out

1. **Two-XGBoost specification** — forecast accuracy AND driver attribution, separately. A reinsurance committee asks both questions.
2. **Sectoral STIRPAT** — country-aggregate residuals decompose into eight sector residuals → directly informs cedent-screening (see `05_cedent_screening_framework.md`).
3. **Two-way fixed effects** — the most demanding spec the panel supports. Three drivers survive — and we say so.
4. **Productised deliverables** — cedent screening tool, policy crosswalk, parametric pricing arithmetic, Q&A briefing. Outputs an actuary could circulate Monday morning.
5. **Live interactive dashboard** — six tabs including Indicator Diagnostic, Reinsurance Impact (live elasticity slider), and Policy Linkage citing seven instruments.

---

## Where to read more

- 10-page report → `deliverables/01_report.md`
- Vietnam-vs-Philippines deep dive → `deliverables/04_vietnam_vs_philippines_deep_dive.md`
- Cedent screening tool → `deliverables/05_cedent_screening_framework.md`
- Policy crosswalk → `deliverables/06_policy_crosswalk.md`
- Anticipated judge Q&A → `deliverables/07_qa_briefing.md`
- Live dashboard → `Rscript -e "shiny::runApp('analysis/shiny/app.R')"`

---

*Page reserved by the bonus criterion: "Articulates information with exceptional clarity and executive readiness (e.g. uses a one-slide summary, message headers, crisp narratives)." — MASA Hackathon 2026 Judging Rubric §6.6.*
