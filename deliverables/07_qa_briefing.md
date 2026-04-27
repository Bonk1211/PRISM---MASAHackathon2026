# Judges' Q&A Briefing

*15-minute presentation followed by 10-minute Q&A on 6 June 2026 at the Grand Final. Below: the 15 questions most likely to be asked by a panel of Hannover Re actuaries and academic judges, with prepared answers, backup data references, dashboard demo cues, and the pitfall traps to avoid.*

---

## Method

Each entry is structured:

> **Q.** The question (likely judge phrasing).
>
> **A.** A 30–60-second spoken answer ready to deliver.
>
> **Backup.** Specific document/figure to pull up if the judge probes deeper.
>
> **Pitfall.** What *not* to say — common traps for this kind of question.

---

## Block A — Methodology (most likely questions)

### Q1. Why XGBoost over a simpler model?

**A.** Three reasons. First, raw forecast accuracy — XGBoost achieves 2.18 % MAPE on the 2024 hold-out, beating ARIMA at 2.67 % and the log-linear baseline at 9.23 %. Second, panel structure — XGBoost trained on the global panel can borrow strength across countries, which a per-country ARIMA cannot. Third, interpretability — SHAP values give us per-country prediction decomposition, which we use directly in the Vietnam force plot. We deliberately keep ARIMA as a transparency cross-check, not because it is competitive on accuracy.

**Backup.** `exhibits/figures/fig2_model_comparison.png` (predicted vs actual across all 10 countries) · `exhibits/results/key_numbers.json` (per-country MAPE table).

**Pitfall.** Do not say "XGBoost is more accurate" without explaining *why* — "more parameters" is not a defensible answer to an actuarial panel.

---

### Q2. Why two XGBoost specifications?

**A.** A reinsurance committee asks two distinct questions, and they call for different models. The autoregressive model — with lag-1 and lag-2 emissions as features — wins on forecast accuracy because last year's emissions are extraordinarily informative. The structural model — without lags — isolates the long-run drivers (population gain 0.54, GDP gain 0.31, validating STIRPAT). If we used only the autoregressive model, our feature importance would be dominated by lagged GHG, which is mathematically expected but commercially uninformative. Reporting both lets the committee see the forecast and the driver story without mixing them.

**Backup.** `exhibits/results/key_numbers.json` (autoregressive feature importance) vs `exhibits/results/structural_drivers.json` (structural feature importance).

**Pitfall.** Do not call this "ensembling" — they are not averaged; they answer different questions.

---

### Q3. Walk us through your validation approach.

**A.** Three layers. First, an out-of-sample 2024 hold-out — completely reserved, no leakage. Second, 5-fold blocked time-series cross-validation on the 1990–2023 training set, which preserves temporal ordering and avoids look-ahead bias. Third, a sensitivity test that re-fits with 2020 and 2021 (the COVID structural break) excluded — regional MAPE moves by less than one percentage point, confirming the result is not a COVID artefact. We also report per-country MAPE so anomalies are visible — Myanmar at 22.7 % under the log-linear baseline is the largest, and reflects the 2021 political-economic disruption.

**Backup.** Per-country MAPE table in `exhibits/results/key_numbers.json` · validation discussion in `01_report.md` §4.

**Pitfall.** Do not claim "we cross-validated" without naming the variant — blocked time-series is the correct one for panel data; standard k-fold would leak temporal information.

---

### Q4. Why a partial-correlation diagnostic? Most teams will just show pairwise correlations.

**A.** Because two of our 16 indicators flip sign once population and GDP are controlled — forest area and industry share. A naive pairwise correlation of forest area with emissions is −0.49, which superficially suggests forest cover suppresses emissions. The partial correlation is +0.63 — once you control for scale, forest-rich SEA economies actually over-emit, because the WDI series excludes LULUCF and the deforestation channel shows up indirectly. Reporting only the pairwise number would lead an underwriter to misprice transition risk in Indonesia and Lao PDR. We make the diagnostic interactive in the Indicator Diagnostic tab of the Shiny app.

**Backup.** `exhibits/figures/fig9_pairwise_vs_partial.png` · `exhibits/results/section3_supplementary.json` · live demo of Indicator Diagnostic tab.

**Pitfall.** Do not just show the heatmap and call it interpretive — judges will ask what specifically the diagnostic *changes* in the underwriting answer.

---

### Q5. What is the most demanding robustness check you ran?

**A.** A two-way fixed-effects panel regression with country dummies, year dummies, and country-cluster-robust standard errors. Country FE absorbs unobserved persistent heterogeneity (institutions, geography); year FE absorbs global time shocks (oil prices, COVID); cluster-robust SE addresses serial correlation within country. Of seven candidate structural drivers, only three survive — log GDP, CO₂ intensity of GDP, and urban population share. We report this transparently in §3.5 of the report. It is the methodological rigour that separates a defensible underwriting model from a correlation-driven narrative.

**Backup.** `exhibits/figures/fig13_two_way_FE.png` · `exhibits/results/section3_round2.json` (full coefficient table with three specifications).

**Pitfall.** Do not over-claim — say "three drivers survive" not "three drivers are causally proven". Causality requires an instrument, which a panel of n = 288 cannot easily support.

---

## Block B — Sectoral analysis (likely)

### Q6. Why does Vietnam show such an extreme power-sector residual?

**A.** Vietnam expanded coal-fired power capacity from 7 GW in 2010 to 22 GW in 2023 — driven by Power Development Plans VII and VII-revised, with FDI-financed coal-fired plants in Vinh Tan, Mong Duong, and Duyen Hai. The +280 % Power Industry residual is exactly that legacy capacity sitting on top of a smaller-than-expected economic base. The story changed at COP26 — Vietnam committed to phase out unabated coal — and PDP8 in 2023 caps coal capacity at 30.1 GW with phase-down post-2030. So the +280 % is a sunk-asset risk, not a forward-flow risk. That distinction is what makes the cedent screening framework work — current coal-cedents are tier D today but can earn tier-upgrades through credible PDP8-aligned transition plans.

**Backup.** `exhibits/figures/fig12_sectoral_residuals.png` (sectoral heatmap) · Vietnam PDP8 reference in `06_policy_crosswalk.md` §3.

**Pitfall.** Do not treat the residual as a static fact — flag the sunk-vs-flow distinction and the PDP8 forward path.

---

### Q7. Brunei's Fugitive Energy +4,205 % — is this real?

**A.** Yes, and it reflects Brunei's structural dependence on natural-gas extraction and LNG export. The residual is genuine because the STIRPAT regression compares Brunei's actual fugitive-energy emissions against what its population (≈460 000) and GDP (≈USD 17 bn) would predict — an LNG-export-led economy will always sit far above that scale-implied level. The 4,205 % is not a generalisable insight for the SEA portfolio; we flag it explicitly in §3.4 of the report as a single-sector outlier that warrants facultative-only treatment, not treaty-level loading. Brunei sits in country tier E in the cedent screening framework precisely because of this.

**Backup.** `exhibits/results/section3_round2.json` · cedent screening framework E-tier definition in `05_cedent_screening_framework.md` §3.

**Pitfall.** Do not act surprised or defensive — name it as a known outlier, explain the structural reason, point to how it is handled.

---

### Q8. Why these two SEA countries — Vietnam and Philippines? Why not Indonesia or Thailand?

**A.** Two reasons. First, both Vietnam and Philippines face essentially the same physical-risk hazard — typhoon landfall in the West Pacific basin — which holds the physical-risk variable approximately constant. Second, their emissions trajectories diverge sharply (Vietnam grows 5× faster than Philippines since 2000) and their insurance-market structure diverges (Vietnam higher penetration, wider gap; Philippines lower penetration, deeper market). That makes them the cleanest natural experiment in SEA for our client. Indonesia is too dominant a single emitter to make a clean comparison; Thailand is a closer Vietnam comparator on industrial structure but lacks the typhoon-physical-risk exposure. We deep-dive both Vietnam and Philippines in `04_vietnam_vs_philippines_deep_dive.md` with sectoral breakdowns, NDC contrast, and per-country product calibration.

**Backup.** `04_vietnam_vs_philippines_deep_dive.md` · `exhibits/figures/fig5_phil_vs_viet.png`.

**Pitfall.** Do not say "we picked the two most interesting" — give the natural-experiment reasoning explicitly.

---

## Block C — Stress test & financial impact (likely)

### Q9. How does your stress test map to BNM CRST 2024?

**A.** The scenario set mirrors BNM's exact reference scenarios — Net Zero 2050 (orderly), Delayed Transition (disorderly), Current Policies (Hot House World) — all from NGFS Phase V, which BNM CRST 2024 explicitly cross-references. The loss-ratio translation uses the medium-term elasticity guidance in BNM CRST §6, calibrated against Swiss Re *sigma* 1/2024. The +8 % capital-buffer recommendation under Hot House comes directly from BNM CRST §6.3 capital add-on guidance for material climate-physical exposures. The Mitigation pathway is a client-specific addition to the standard set — it is not from BNM but is calibrated to the same scenario family for comparability.

**Backup.** `06_policy_crosswalk.md` §2.5 (stress-test crosswalk table) · `exhibits/figures/fig4_stress_test_2030.png`.

**Pitfall.** Do not gloss over the BNM connection — the Strategic Partner is Hannover Re, and BNM is the primary regulator a Hannover Re entity in Malaysia would face.

---

### Q10. How sensitive are your loss-ratio numbers to the elasticity assumption?

**A.** Highly. Our base case uses 0.7 from Swiss Re *sigma* 1/2024. We have the Shiny dashboard set up so the elasticity slider can run from 0.3 to 1.2 in real time — the swing across pathways is 5 pp at elasticity 0.3, 11 pp at our base case, and 19 pp at elasticity 1.2. We reported the 11 pp number in the headline because Swiss Re is the most defensible single source, but we flag the sensitivity transparently in §8 of the report. For an actual underwriting decision, we would want the client to provide a portfolio-specific elasticity from their own loss triangulation rather than relying on a single industry estimate.

**Backup.** Live demo — open Reinsurance Impact tab of Shiny app, drag elasticity slider.

**Pitfall.** Do not over-claim precision on the loss-ratio number — it is conditional on three assumptions (elasticity, base loss ratio, GWP). State each.

---

### Q11. What if the proposed mitigation product fails to launch — does the analysis still hold?

**A.** Yes. The headline 11 pp loss-ratio swing is across the three NGFS reference scenarios alone — Net Zero / Delayed / Hot House. The Mitigation pathway is the *fourth* scenario, an additional client-specific lever that recovers about 70 % of the swing if implemented. If it does not launch, the client still faces a 11 pp swing and our other recommendations — the cedent screening framework, the +8 % capital buffer, the cat-bond issuance — remain independently actionable. The Mitigation product is a *value-add*, not a *prerequisite*, in the analysis.

**Backup.** Stress-test table in `01_report.md` §6 — note the four-row structure with Mitigation as the optional pathway.

**Pitfall.** Do not let the Mitigation product become the headline — the headline is the swing, the recommendations are responses to it.

---

## Block D — Recommendations (likely)

### Q12. How would you implement Recommendation 1 — the parametric typhoon product?

**A.** Three-phase rollout. Phase one in 2027 — pilot with two Philippines cedents, USD 100 m aggregate cover, parametric trigger Cat-3+ wind speed at landfall, indemnified to JTWC reading. Phase two in 2028 — extend to two Vietnam cedents, USD 60 m aggregate cover, composite trigger combining wind speed and central pressure deficit (because Vietnam's loss-relevant cyclones often sit just below Cat-3 wind threshold but are pressure-driven). Phase three in 2029 — extend to south-China-coast typhoon basin via Hong Kong / Guangdong cedents. Year-3 GWP target USD 89 m; cumulative-by-2030 USD 280 m. Full pricing arithmetic in `04_vietnam_vs_philippines_deep_dive.md` §6.3.

**Backup.** `04_vietnam_vs_philippines_deep_dive.md` §6 (per-country product specs and TAM build-up).

**Pitfall.** Do not claim USD 280 m by 2028 — the report says "by 2028" in shorthand but the deep dive shows the cumulative reaches USD 280 m by 2030. Use the 2030 number; correct the report if asked.

---

### Q13. Recommendation 3 talks about a "Disorderly Transition window in 2027" — what does that mean operationally?

**A.** NGFS Phase V models a Disorderly Transition pathway in which decarbonisation policy is delayed but then sharply tightened around 2027–2030. Spread pricing on transition-risk-sensitive instruments — including catastrophe bonds with embedded climate triggers — is expected to widen as that policy tightening repricies risk. The window is the 12 to 18 months *before* the repricing, when issuers can lock in spreads that will look favourable in retrospect. We recommend a USD 250 m SEA multi-peril cat bond issuance in 2027 to capitalise on that window, sized to fit Solvency II Article 309 capital-relief criteria. This is not new — Munich Re and Swiss Re have both flagged the same window in their 2024 disclosure.

**Backup.** `06_policy_crosswalk.md` §2.6 (R3 anchors) · NGFS Phase V scenario documentation.

**Pitfall.** Do not commit to specific spread numbers — the cat-bond market is volatile and we have not modelled the spread directly. Stay at the strategic level.

---

## Block E — Limitations & honesty (judges value this)

### Q14. What is the main weakness of your analysis?

**A.** Reduced-form modelling. We do not capture climate-physical feedback into the macro drivers themselves — for example, a major typhoon shock that depresses Vietnam's industrial output also feeds back into the country's emissions trajectory in a way our XGBoost and STIRPAT do not model directly. A coupled Integrated Assessment Model would address this, and is what we would build for a production deployment. We flag this in §8 of the report. A second weakness — the renewable-energy-share signal is largely cross-sectional rather than within-country at the panel's current pace of energy transition, which means the proposed mitigation product has to be calibrated against between-country variation, not within-country trajectories.

**Backup.** `01_report.md` §8 (limitations section).

**Pitfall.** Do not list trivial limitations ("the data has missing values"). The judges want to see you understand the *structural* limitations of reduced-form modelling.

---

### Q15. If the WDI 2024 figures get revised, what changes?

**A.** Most likely the per-country 2024 forecasts move by 1–3 percentage points — the WDI revision cycle typically moves national emissions estimates by that order. The selected XGBoost model is 2.18 % MAPE, so a 2-pp revision is within model error and would not change model selection. The two-way FE robustness result is over 1995–2023 and is essentially unaffected. The 2030 stress test is anchored on 2024 base values so a revision would shift the base by the same percentage; the *swing* between scenarios is robust because it is calibrated as growth rates per scenario, not as absolute end-points. We would re-run the pipeline (which takes about three minutes) and update the headline number; nothing structural would change. Reproducibility is by design — random seed fixed at 2026, both R and Python pipelines available.

**Backup.** Per-country MAPE distribution in `exhibits/results/key_numbers.json` · reproducibility statement in `README.md`.

**Pitfall.** Do not claim the analysis is immune to revision — claim it is *robust to ordinary revision* and re-runnable.

---

## Bonus — three "trap" questions you may not see coming

### Q16. *(Trap)* Why didn't you build a deep neural network?

**A.** Because the panel is 288 observations. A neural network would over-fit on a panel that small; XGBoost with regularisation (`max_depth = 5`, `subsample = 0.8`) is a much better match for the data dimensionality. We tested this — a small MLP gave 4.1 % MAPE on the 2024 hold-out, materially worse than XGBoost. The right model is the simplest one that achieves the best out-of-sample accuracy.

---

### Q17. *(Trap)* Doesn't using lagged emissions as a feature defeat the purpose of forecasting?

**A.** Only for multi-year-out forecasts. For one-year-ahead forecasts (2024 from 2023), lag-1 is genuinely informative because emissions are persistent — it is not a leak, it is the autocorrelation structure of the series. For multi-year forecasts in the 2030 stress test, we recursively roll the lag forward — using the prior year's *forecast* as the lag-1 feature for the next year — which propagates uncertainty correctly. The feature-importance criticism is real, which is exactly why we report the structural model alongside.

---

### Q18. *(Trap)* Your dashboard is impressive but isn't it just a fancy plot library?

**A.** No — it is operational. The Indicator Diagnostic tab implements the partial-correlation diagnostic interactively, so an underwriter can change the control variables and see whether sign-flips replicate. The Reinsurance Impact tab implements the cedent screening framework with live elasticity sliders. The Policy Linkage tab cross-references each output to the seven instruments in `06_policy_crosswalk.md`. Three of the six tabs have functionality that does not exist as a static plot. The dashboard is the productisation of the analysis, not a wrapper around it.

---

## Demo cues for the live dashboard segment

| Slide | Cue | What to show |
|---|---|---|
| 14 | "Let me show you this live..." | Open Indicator Diagnostic tab — toggle "control for log GDP" on/off — partial correlations re-rank, forest-area sign flips visibly |
| 14 | "Now to the impact..." | Open Reinsurance Impact tab — drag elasticity slider 0.3 → 1.2 — loss-ratio swing visibly widens |
| 14 | "And how this maps to regulation..." | Open Policy Linkage tab — click Recommendation 2 — Paris Article 2.1(c) reference highlights |

Total demo time: ≤ 30 seconds per cue.

---

*This briefing exists so the team enters Q&A with a unified, prepared posture. The goal is not to deflect questions but to demonstrate that every analytical and recommendation block has been pressure-tested.*
