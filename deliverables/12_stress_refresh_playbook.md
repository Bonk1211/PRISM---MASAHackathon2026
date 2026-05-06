# Stress-Exhibit Quarterly Refresh Playbook

*Hannover Re APAC — SEA Climate Stress Standing Board-Pack Slide*
*Owner: APAC Climate Quant Desk · Sponsor: APAC CRO · Version 1.0 · 2026-05-02*

---

## 1. What this is

A single, standing board-pack slide that re-prices the SEA reinsurance portfolio (USD 1.2 bn GWP, base loss ratio 0.62, emissions-loss elasticity 0.7) under four NGFS Phase V scenarios each quarter. Headline output: the Hot House to Net Zero spread (currently +11 pp / USD 135 m). It productises the PRISM pipeline (R + Python, seed 2026, 3-min runtime) into a recurring deliverable owned by the Climate Quant desk, signed off by the APAC CRO, and filed alongside the regulatory stack (BNM CRST, IFRS S2, Solvency II ORSA).

---

## 2. Refresh triggers

| Trigger | Frequency | Owner |
|---|---|---|
| WDI annual update (April release) | Annual (Q2) | Data Engineering |
| NGFS Phase release (Phase V live; VI expected 2027) | Ad-hoc | Climate Quant |
| BNM CRST methodology revision | Ad-hoc | Regulatory Affairs |
| Portfolio-assumption change (GWP, base LR, elasticity) | Ad-hoc | Pricing Actuary |
| Quarterly board pack | Q1, Q2, Q3, Q4 | Climate Quant |

---

## 3. Refresh checklist

1. Re-pull WDI Wide format to `data/WB_WDI_WIDEF.csv` — Data Eng, 5 min
2. Re-execute `analysis/R/analysis.Rmd` — Climate Quant, 3 min
3. Re-execute `analysis/python/analysis.ipynb` (parity run) — Climate Quant, 3 min
4. Verify `exhibits/results/key_numbers.json` refreshed; confirm seed = 2026 — Climate Quant, 1 min
5. Run parity check vs prior quarter — flag any LR delta > 0.5 pp or expected-loss delta > USD 5 m — Climate Quant, 5 min
6. Update Shiny app + PWA hard-coded constants if portfolio assumptions changed — Risk Tech, 30 min
7. Generate board-pack slide from `exhibits/results/key_numbers.json` template — Climate Quant, 30 min
8. APAC CRO sign-off (logged in Appendix A) — CRO, 15 min
9. File in board pack repository + archive prior quarter — Secretariat, 5 min

End-to-end: ~95 minutes elapsed; ~12 minutes compute.

---

## 4. Output format — 1-slide board-pack template

```
+---------------------------------------------------------------+
| SEA Climate Stress Exhibit — Q[#] 20[##]                      |
+---------------------------------------------------------------+
| Scenario              | 2030 LR | Expected Loss (USD m)       |
| Net Zero 2050         |  50.7%  |    609                      |
| Mitigation (proposed) |  53.8%  |    646                      |
| Delayed Transition    |  58.3%  |    700                      |
| Current Policies (HH) |  62.0%  |    744                      |
+---------------------------------------------------------------+
| HOT HOUSE -> NET ZERO  =  +11 pp  /  USD 135 m                |
+---------------------------------------------------------------+
| Cedent Screen: [GREEN/AMBER/RED]                              |
| Capital Buffer: [+8% held / under review]                     |
| Regulator Submission: [BNM filed / IFRS S2 in prep]           |
+---------------------------------------------------------------+
| Data as of: YYYY-MM-DD | Owner: Climate Quant | Next: YYYY-MM-DD
+---------------------------------------------------------------+
```

---

## 5. Escalation rules

| Condition | Action |
|---|---|
| LR-swing delta > 2 pp QoQ | Escalate to APAC CRO within 24 h |
| Hot House LR > 65% | Trigger Group Capital review (BNM CRST §6.3) |
| NGFS scenario revision published | Freeze prior-quarter exhibit; re-run on new pathways before next board |
| Parity break (R vs Python > 4 dp) | Halt publication; reproduce from clean checkout against seed 2026 |
| Expected-loss delta > USD 25 m QoQ | Pricing Actuary + CRO joint review prior to filing |

---

## 6. Audit trail

- Every JSON refresh stamped with git SHA + ISO-8601 timestamp + seed value, embedded as top-level keys in `exhibits/results/key_numbers.json`.
- Prior 4 quarters retained immutable in `exhibits/results/archive/YYYYQ#/` (read-only).
- Sign-off log in Appendix A of this playbook (Quant lead, CRO, Secretariat).
- Numerical-consistency invariant (CLAUDE.md §"Numerical-consistency invariant") re-verified each refresh: prose in `01_report.md` §6, `00_executive_one_pager.md`, `04_vietnam_vs_philippines_deep_dive.md`, `06_policy_crosswalk.md` §2.5, and Shiny constants must agree to 4 dp.

---

## 7. Regulatory filing alignment

| Framework | Cadence | Refresh feed |
|---|---|---|
| BNM CRST 2024 §6.3 | Annual + ad-hoc on methodology revision | Q2 refresh feeds annual filing; capital add-on tracked each quarter |
| IFRS S2 transition-risk disclosure | Annual (FY-end) | Q4 refresh becomes the disclosed scenario set |
| Solvency II ORSA scenario evidence | Annual | Q3 refresh anchors ORSA narrative; quarterly archive provides audit trail |
| Insurance Commission PH Circular 2024-09 | Annual | Q4 refresh shared with PH cedent governance pack |

---

## Appendix A — Sign-off log (template)

| Quarter | Data-as-of | Quant lead | CRO sign-off | Filed by | Git SHA |
|---|---|---|---|---|---|
| 2026 Q2 |  |  |  |  |  |
| 2026 Q3 |  |  |  |  |  |
| 2026 Q4 |  |  |  |  |  |
| 2027 Q1 |  |  |  |  |  |
