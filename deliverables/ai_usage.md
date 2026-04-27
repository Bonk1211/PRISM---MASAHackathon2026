# AI Usage Disclosure

*Required per MASA Hackathon 2026 Participant Handbook, Section 5.5 (AI Usage Policy)*

Team: [TEAM_NAME]

---

## 1. Generative AI tools used

| Tool | Version / model | Purpose |
|---|---|---|
| Anthropic Claude | claude-opus-4 (Apr 2026) | Code scaffolding, report drafting assistance, explanation of statistical methods, refactoring of R/Python pipelines |
| GitHub Copilot (optional — delete row if not used) | latest | Inline code completion during development |
| ChatGPT (optional — delete row if not used) | GPT-4o | Cross-checking of statistical reasoning |

## 2. What we used AI for

- **Code scaffolding.** Generating the initial structure of `R/analysis.Rmd`, `python/analysis.ipynb`, and `shiny_app/app.R`. All AI-generated code was executed, debugged, and modified by team members; we did not commit code we had not run and verified ourselves.
- **Report drafting assistance.** Generating draft prose for the report and slide deck, which the team then edited for accuracy, tone, and length.
- **Methodology explanation.** Asking AI to clarify NGFS scenario design, Swiss Re sigma elasticity assumptions, and the STIRPAT framework, then verifying against primary sources.

## 3. What we did NOT use AI for

- **Final modelling decisions.** Model selection (XGBoost over ARIMA/log-linear) was a team decision based on observed hold-out MAPE — not an AI suggestion accepted blindly.
- **Citations.** Every reference in the bibliography was located and read by a team member; we did not let the AI generate citations without verification.
- **Numerical results.** All numbers in the report come from running our own code on the WDI dataset. No AI-fabricated statistics appear in the submission.

## 4. Validation & accountability statement

The team has **read, executed, and verified all code** in this submission. We have **independently checked all numerical claims and citations** against the underlying data and source documents. Any errors are our own.

The team takes full accountability for the originality and integrity of the content of this submission, including any AI-assisted output.

## 5. Signed

| Name | Role | Signature |
|---|---|---|
| [Member 1] | Team Leader | _________________ |
| [Member 2] | Modelling | _________________ |
| [Member 3] | Visualisation / Dashboard | _________________ |
| [Member 4] | Research / Writing | _________________ |

Date: [DD MMM 2026]
