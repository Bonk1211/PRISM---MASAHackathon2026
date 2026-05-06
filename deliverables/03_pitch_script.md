# Grand Final Pitch Script — 15 Minutes

*Word-for-word delivery script aligned to `02_pitch_deck_outline.md`. Timer marks at the right margin show cumulative minutes:seconds at the start of each block. Line cues "[P1]" / "[P2]" / "[P3]" / "[P4]" identify the speaker. The goal is not literal recitation — it is to give every speaker a defensible **opening sentence and closing sentence** for each slide so transitions are clean and total time lands at 14:30 ± 0:15.*

---

## Speaker map

| Slides | Owner | Time |
|---|---|---|
| 1–4 (setup) | **P4** — Storyteller / project manager | 2:00 |
| 5–9 (data + model) | **P1** — Modelling lead | 5:00 |
| 10–11 (stress test) | **P2** — Industry research lead | 3:00 |
| 12–14 (recommendations + demo) | **P3** + **P4** | 4:00 |
| 15 + Q&A handoff | Whole team | 0:30 + 10:00 Q&A |

Total speaking time: 14:30. Buffer for transitions: 0:30. Total slot: 15:00.

---

## Slide 1 — Cover (00:00 → 00:15)

**[P4]** Good morning. We are Team [TEAM_NAME] from [University]. Our submission is **PRISM** — *Portfolio Risk via Identified Scenario Modeling* — a climate-risk assessment for a multinational reinsurer. The line that anchors everything we are about to show you is on the screen: *climate is now a structural driver of Southeast Asia reinsurance loss — and here is how Hannover Re wins it.*

*[Pause 1 sec.]*

---

## Slide 2 — One-slide executive summary (00:15 → 01:00)

**[P4]** Four numbers, one slide.

**One.** Vietnam has overtaken Thailand to become Southeast Asia's number-two emitter — five hundred and eighty-four million tonnes of CO₂-equivalent in 2024.

**Two.** Our XGBoost forecast achieves two-point-one-eight percent MAPE on a 2024 hold-out — beating ARIMA at two-point-six-seven and a log-linear baseline at nine-point-two-three.

**Three.** A Hot House World pathway costs the client *eleven percentage points* of loss ratio by 2030 — that is roughly 135 million US dollars on a 1.2 billion notional portfolio.

**Four.** We recommend three actions, anchored to a 280 million dollar premium opportunity by 2028.

*Everything for the next 13 minutes is the path from those four numbers back to the client.*

---

## Slide 3 — The brief (01:00 → 01:30)

**[P4]** The brief asks four questions: which indicators best explain regional GHG dynamics; what is the most defensible 2024 forecast; how do climate trends translate into natural-disaster claims, and where is the strongest underwriting opportunity; and what is the 2030 financial impact of a proposed mitigation strategy.

We map every minute of this presentation to one of those four questions. We are not going to walk you through the dataset — we are going to walk you through the *answer*.

---

## Slide 4 — Why SEA now (01:30 → 02:00)

**[P4]** Three numbers in big type.

**Two percent.** Southeast Asia insurance penetration of GDP, half the OECD level. That is the size of the protection gap.

**Eighty-five percent.** Of regional disaster losses uninsured. That is the *commercial opportunity*.

**Twenty twenty-four.** Bank Negara Malaysia issued its Climate Risk Stress Testing Methodology, mandating NGFS-aligned scenario analysis. That is the *regulatory tailwind*.

The combination — large gap, large opportunity, regulatory pull — is structural, not cyclical. Now we look at how to act on it. Over to [P1].

---

## Slide 5 — Approach in one picture (02:00 → 02:45)

**[P1]** Thanks. The pipeline on this slide is everything we built. World Bank WDI on the left — sixteen-hundred indicators, two-hundred-and-seventeen economies, going back to 1960. We curate that down to a sixteen-indicator panel covering ten Southeast Asian economies. Three candidate models — log-linear, ARIMA, XGBoost. We select on out-of-sample 2024 MAPE. We then translate the selected forecast through SHAP into per-country drivers, into a stress test, into a financial impact. Everything is reproducible — R and Python in parallel, random seed fixed at 2026. End to end, it runs in three minutes on a laptop. Both implementations agree to four decimal places.

---

## Slide 6 — Drivers: scale dominates (02:45 → 03:30)

**[P1]** Two numbers. Pairwise correlation of GHG with GDP — point seven seven. With population — point seven six. The STIRPAT framework — Dietz and Rosa, 1997 — gives population and GDP coefficients of point five eight and point five four with R-squared point nine four. Population and GDP alone explain ninety-four percent of cross-country variation in emissions globally. *Scale is the story.*

But — and this is where we earn our presentation — population and GDP are not actionable risk factors for an underwriter. The relevant question is *which indicators carry information after the scale effect is removed*?

---

## Slide 7 — Vietnam ≠ Philippines (03:30 → 04:30)

**[P1]** Vietnam and Philippines. Same physical-risk hazard — both in the West Pacific typhoon belt. But three things diverge.

Emissions trajectory — Vietnam grows roughly *five times* faster than the Philippines since 2000. Insurance penetration — Vietnam two-point-four percent, Philippines one-point-seven. Protection gap — *ninety-two percent uninsured in Vietnam, eighty-five in the Philippines.*

That gives us the cleanest natural experiment in Southeast Asia for our client. We deep-dive both in the appendix document `04_vietnam_vs_philippines_deep_dive.md` — including parametric pricing arithmetic for each country.

The headline: Philippines is the larger current insured market. Vietnam is the *stronger commercial opportunity* over the next decade.

---

## Slide 8 — Forecast: XGBoost wins (04:30 → 05:30)

**[P1]** Three models. Log-linear — nine-point-two-three percent MAPE on the 2024 hold-out. ARIMA — two-point-six-seven percent. XGBoost — *two-point-one-eight*.

We use XGBoost. We keep ARIMA as a transparency cross-check, not because it is competitive on accuracy. The 2024 actual is held out — no leakage. We validate further with five-fold blocked time-series cross-validation, and a sensitivity test that excludes 2020 and 2021 — regional MAPE moves by less than one percentage point. The COVID structural break is real but it is not driving the result.

---

## Slide 9 — What drives emissions (05:30 → 07:00)

**[P1]** This is the slide that separates us from teams that just show R-squared.

We report **two XGBoost specifications**. The autoregressive one — with lag-1 and lag-2 emissions as features — is what wins on accuracy. But its feature importance is dominated by lagged GHG, which is mathematically expected and commercially uninformative.

So we re-run XGBoost without the lag features — the *structural* model. Population at the top with gain point five four; GDP next with point three one. That is STIRPAT in action. Industry share, carbon intensity, energy use refine at the margin.

A reinsurance committee asks two questions — what is the best forecast, and what is driving the number. We give them two models and we are explicit about which answers which.

We then run a partial-correlation diagnostic — controlling for GDP and population. Two of our sixteen indicators *flip sign* — forest area and industry share. Most teams will report pairwise correlations and stop. We don't. The diagnostic is interactive in our Shiny app.

And we run a two-way fixed-effects panel regression with country-cluster-robust standard errors. Of seven candidate structural drivers, only three survive — log GDP, CO₂ intensity of GDP, and urban population share. We report this transparently. Population is mostly absorbed by country fixed effects. Renewables carry cross-sectional information only. *We are honest about what survives the most demanding spec.*

Over to [P2].

---

## Slide 10 — 2030 stress test (07:00 → 08:30)

**[P2]** Thanks. We use NGFS Phase V scenarios — the de facto industry standard, explicitly cross-referenced in BNM CRST 2024.

Four scenarios. Net Zero 2050 — orderly transition, two-and-a-half percent annual emissions decline. Delayed Transition — disorderly, one percent annual increase. Current Policies — Hot House World, two-and-a-half percent annual increase. And our client-specific Mitigation pathway — calibrated to one percent decline, modelled as a five-percentage-point shift in renewable energy share by 2030.

What you see on this fan chart is the four-scenario projection for total Southeast Asia emissions through 2030. The Hot House and Net Zero pathways diverge by *thirty-five percent* by 2030. That divergence is the headline.

---

## Slide 11 — Translating to loss ratio (08:30 → 10:00)

**[P2]** Now the financial translation. Three assumptions, transparent.

First, portfolio gross written premium — we use one-point-two billion US dollars as a notional figure. Second, base loss ratio — sixty-two percent, industry baseline. Third, loss-to-emissions elasticity — point seven, from Swiss Re sigma 1/2024.

Four numbers come out.

Net Zero 2050 — fifty-point-seven percent loss ratio, six hundred and nine million dollars expected loss.
Mitigation — fifty-three-point-eight percent, six hundred and forty-six million.
Delayed Transition — fifty-eight-point-three percent, seven hundred million.
Hot House World — sixty-two percent, seven hundred and forty-four million.

The headline number is the *swing*. **Eleven percentage points of loss ratio between Hot House and Net Zero. One hundred and thirty-five million dollars on a 1.2 billion portfolio.** The proposed mitigation strategy recovers **about seventy-three percent** of that swing — ninety-eight million dollars of the one-hundred-and-thirty-five-million-dollar swing (Mitigation 2030 expected loss six hundred and forty-six million versus Hot House seven hundred and forty-four million and Net Zero six hundred and nine million).

That swing is the conversation we should be having with the client. Over to [P3].

---

## Slide 12 — Recommendation 1: Parametric typhoon (10:00 → 11:00)

**[P3]** Three recommendations. The first is a SEA Parametric Typhoon Reinsurance Product.

Trigger: Saffir-Simpson Cat 3+ landfall in Philippines, Vietnam, or south-China-coast typhoon basins. Index from the Joint Typhoon Warning Center. Three-phase rollout — pilot Philippines 2027, extend Vietnam 2028, full SEA basin 2029. Year-three GWP target eighty-nine million dollars; cumulative by 2030 *two hundred and eighty million dollars*.

Why this works — closes the protection gap exactly where it is widest, on the hazard exposure that is most concentrated in Hannover Re's Strategic Partner footprint.

We have the per-country product specifications worked out — Vietnam uses a composite trigger combining wind speed and central pressure deficit because Vietnam's loss-relevant cyclones often sit just below the Cat-3 wind threshold. Philippines uses a simpler wind-only trigger because the historic loss base supports it. Full pricing arithmetic in the appendix document.

---

## Slide 13 — Recommendations 2 and 3 (11:00 → 12:30)

**[P3]** Recommendation two — an *ESG-linked underwriting screen*. Cedents with credible NDC-aligned transition plans receive a five-to-ten percent renewal discount. This aligns with Paris Agreement Article 2.1(c), which commits parties to making finance flows consistent with low-emissions pathways. We have built a five-tier cedent screening framework — country, sector, NDC alignment, energy-mix exposure, adaptive capacity — that operationalises this in five minutes per cedent. Live in our dashboard; documented in `05_cedent_screening_framework.md` with worked examples for a Vietnam coal cedent at tier D and a Philippines services cedent at tier A.

Recommendation three — a 250 million dollar SEA multi-peril cat bond, issued in 2027 to capitalise on the NGFS Disorderly Transition pricing window before transition risk re-prices spreads. Aligned with Solvency II Article 309 capital relief.

And a fourth supporting action — an additional eight percent regional risk capital buffer under a Hot House World scenario, per BNM CRST 2024 §6.3. Direct adoption of the regulator's own guidance.

---

## Slide 14 — Live dashboard demo (12:30 → 13:00)

**[P3]** Thirty seconds — let me show you what is live.

*[Switches to Shiny app — Indicator Diagnostic tab.]*

This is the Indicator Diagnostic. I'll toggle the "control for log GDP" switch. Watch the partial correlations re-rank — there's the forest-area sign flip we showed on slide 9, live.

*[Switches to Reinsurance Impact tab.]*

This is the financial impact calculator. I'll drag the elasticity slider from point three to point seven — base case — to one-point-two. Eleven percentage points becomes nineteen. The headline number is conditional on the elasticity assumption, and the dashboard makes that conditioning visible.

*[Switches to Policy Linkage tab.]*

And this is the Policy Linkage tab — every recommendation cross-references seven instruments: Paris Agreement, NGFS Phase V, BNM CRST, IFRS S2, TCFD, UNFCCC NDCs, ASEAN Strategy. The bonus criterion in the rubric explicitly rewards this kind of policy-instrument linkage.

Back to [P4].

---

## Slide 15 — What we'd do next + Q&A handoff (13:00 → 14:30)

**[P4]** To close — three honest things.

What our analysis cannot do today — capture climate-physical feedback into the macro drivers themselves. A coupled Integrated Assessment Model would address this; it is what we would build for production.

What we would build next — country-specific catastrophe modules that integrate cedent-side loss triangulation against the macro signals, plus a quarterly refresh cadence anchored to BNM CRST reporting.

What we recommend right now, for the next renewal cycle — apply the cedent screening framework, lock the parametric typhoon pilot terms, hold the eight-percent capital buffer as a precaution.

The full submission — ten-page report, the appendix documents, and the live dashboard — is reproducible end-to-end with the seed fixed at 2026.

We thank Hannover Re as Strategic Partner, and the MASA organising committee for the brief.

We have ten minutes for your questions.

*[Total elapsed: 14:30. Q&A starts.]*

---

## Transitions — quick lookup

| Between | Cue line |
|---|---|
| P4 → P1 (slide 4 → 5) | "Now we look at how to act on it. Over to [P1]." |
| P1 → P2 (slide 9 → 10) | "We are honest about what survives the most demanding spec. Over to [P2]." |
| P2 → P3 (slide 11 → 12) | "That swing is the conversation we should be having with the client. Over to [P3]." |
| P3 → P4 (slide 14 → 15) | "Back to [P4]." |

---

## Recovery cues — if you forget your line

| Slide | One-sentence safety line |
|---|---|
| 2 | "The four numbers on this slide are what the next thirteen minutes prove." |
| 6 | "Population and GDP explain ninety-four percent of variation — but they aren't actionable, so we go further." |
| 9 | "Two XGBoost models because a reinsurance committee asks two questions." |
| 11 | "Eleven percentage points of loss ratio. One hundred and thirty-five million dollars. That's the conversation." |
| 12 | "Two hundred and eighty million dollars premium opportunity by 2030 — closing the gap exactly where it is widest." |
| 15 | "Reproducible end-to-end. Seed fixed at 2026. We have ten minutes for your questions." |

---

## Pre-presentation checklist (15 mins before)

- [ ] Laptop charged + on stage power
- [ ] Shiny app pre-loaded in browser tab; Indicator Diagnostic tab is the default landing tab (saves 3 sec on slide 14)
- [ ] HDMI / display test confirmed
- [ ] Backup PDF of slides on a USB stick
- [ ] Q&A briefing (`07_qa_briefing.md`) printed; one copy per speaker
- [ ] Water on the lectern
- [ ] Phone on silent
- [ ] [P1] presses "play" on a 14:30 timer at slide 1; visible to all speakers

---

*Transitions matter more than literal words. If you remember nothing else, remember the **four headline numbers** on slide 2 and the **eleven-percentage-point swing** on slide 11. Everything else is supporting context.*
