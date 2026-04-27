# Grand Final Pitch Deck — Outline (15-min slot)

**Format guidance:** 13–15 slides; **message headers** (each title states the conclusion of that slide); "answer-first" pyramid principle structure. One slide = one idea. Build with Person 4 (Storyteller) leading; visuals from Person 3.

---

### Slide 1 — Cover
- Team name, members, university, hackathon logo, date
- One-line tagline: *"Climate is now a structural driver of SEA reinsurance loss — here's how Hannover Re wins."*

### Slide 2 — One-Slide Executive Summary (judges' favourite)
- 4 bullet points, each with a number:
  1. Vietnam overtook Thailand to become SEA's #2 emitter (584 Mt CO₂e, 2024)
  2. Our XGBoost forecast achieves [X.X]% MAPE on a 2024 hold-out
  3. A Hot House World pathway costs the client +4–8 pp loss ratio by 2030
  4. We recommend three actions worth ~USD 280 m premium opportunity

### Slide 3 — The Brief
- "You are an actuarial consultant to a multinational reinsurer..."
- Map to four questions: Drivers / Forecast / Claims / Stress test
- Frame the engagement, not the dataset.

### Slide 4 — Why SEA Now
- Three numbers in big type:
  - **2.0 %** SEA insurance penetration (vs ~5 % OECD)
  - **85 %** disaster losses uninsured
  - **2024** BNM CRST methodology mandates NGFS-aligned stress testing
- Conclusion: timing is structural, not cyclical.

### Slide 5 — Approach in One Picture
- Pipeline diagram: WDI → Indicator panel (16 vars) → 3 candidate models → SHAP → Stress test → Loss translation
- Note "all code reproducible in R + Python"

### Slide 6 — Drivers: GDP & Population Dominate
- Correlation heatmap (small, top-right)
- Two lead numbers: **r = 0.93** (GDP), **r = 0.91** (population)
- One sentence: "Decoupling has not yet arrived in SEA — scale effect dominates."

### Slide 7 — Vietnam ≠ Philippines
- Side-by-side line charts: emissions trajectory, insurance penetration, protection gap
- Punch line: *Vietnam grows 5× faster, has wider protection gap → strongest commercial opportunity*

### Slide 8 — Forecast: XGBoost Wins
- Bar chart: MAPE by model (M1: 9.23%, M2 ARIMA: 2.67%, M3 XGBoost: **2.18%**) → **M3 selected**
- Caveat: held out 2024, blocked time-series CV, sensitivity-tested without COVID years
- Footnote on STIRPAT framework

### Slide 9 — What Drives Emissions: Population × GDP
- Two-panel: structural feature importance (left) + Vietnam force plot (right)
- One callout: *"Population (54%) + GDP (31%) explain 85% of structural variation — STIRPAT in action"*
- Footnote: *"Forecast model uses lagged emissions; structural model isolates drivers — both reported"*
- This is the slide that separates us from teams that just show R²

### Slide 10 — 2030 Scenario Stress Test
- Fan chart: 4 scenarios for Vietnam (or all SEA aggregate)
- NGFS Net Zero / Disorderly / Hot House + Mitigation
- Anchor: "Calibrated to NGFS Phase V + BNM CRST 2024"

### Slide 11 — Translating to Loss Ratio
- Big number: **+11 pp loss ratio** swing (Net Zero 51% → Hot House 62%)
- Big number 2: **USD 135 m** swing in expected loss on USD 1.2 bn GWP
- Mini-table: emissions Δ → loss ratio → expected loss in USD m
- Source: Swiss Re sigma 1/2024 elasticity

### Slide 12 — Recommendation 1: Parametric Typhoon Reinsurance
- Trigger: Saffir-Simpson Cat 3+; PH/VN/south-China-coast
- TAM: USD 280 m premium by 2028
- Why this works: closes protection gap where it's widest

### Slide 13 — Recommendations 2 & 3
- ESG-Linked Underwriting Screen (Paris Agreement Article 2.1(c) alignment)
- 2027 Cat Bond issuance window (USD 250 m)
- Capital buffer: +8 % under Hot House (BNM CRST aligned)

### Slide 14 — Live Dashboard Demo (30 seconds)
- Switch to the Shiny app: change country → toggle scenario → loss-ratio updates live
- This is the **bonus criterion** in motion

### Slide 15 — What we'd do next + Q&A
- Limitations (model uncertainty, no climate-physical feedback loop)
- Roadmap: integrate cedent loss data, build country-specific catastrophe modules
- "We'd love your questions" (10-min Q&A)

---

## Speaker time allocation (~15 min)

| Slides | Owner | Time |
|---|---|---|
| 1–4 (Setup) | Person 4 | 2 min |
| 5–9 (Data + model) | Person 1 | 5 min |
| 10–11 (Stress test) | Person 2 | 3 min |
| 12–14 (Recs + demo) | Person 3 + Person 4 | 4 min |
| 15 + Q&A | Whole team | 1 min + 10 min Q&A |

## Q&A preparation — likely judge questions

1. **Why XGBoost over a simpler model?** → Outperforms on hold-out + SHAP gives per-country decomposition; we kept ARIMA as a transparency cross-check.
2. **Why these two SEA countries?** → Both typhoon-exposed; sharply diverging emissions trajectory and protection gap; cleanest natural experiment in the region.
3. **How does this map to BNM CRST?** → Scenario set (Net Zero / Disorderly / Hot House) mirrors BNM's exact reference scenarios; loss-ratio translation follows BNM's medium-term elasticity guidance.
4. **What's the main weakness of your analysis?** → Reduced-form: no climate-physical feedback into the macro drivers. We flag this in §8 and would address with a coupled IAM in production.
5. **How would you implement Recommendation 1?** → Three-phase rollout: (1) pilot with 2 cedents in PH 2027; (2) extend to VN 2028; (3) full SEA basin 2029. Premium target USD 280 m by year-3.
6. **How sensitive are your loss-ratio numbers?** → Loss-to-emissions elasticity drives the swing; the dashboard lets us re-run with elasticity 0.3–1.2 in real time. Range is 3–10 pp under Hot House.
