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
| Google Gemini | `gemini-2.5-flash` via `google-genai` SDK | **Live in-app feature.** Cedent and Stress screens of the PWA include an "AI input" panel. Gemini parses an underwriter's free-text request into structured slider values via tool/function calling, then narrates the resulting numbers in 2–3 sentences. Implemented in `serve/agent.py` and `app/src/components/AgentPanel.tsx`. |

## 2. What we used AI for

- **Code scaffolding.** Generating the initial structure of `R/analysis.Rmd`, `python/analysis.ipynb`, and `shiny_app/app.R`. All AI-generated code was executed, debugged, and modified by team members; we did not commit code we had not run and verified ourselves.
- **Report drafting assistance.** Generating draft prose for the report and slide deck, which the team then edited for accuracy, tone, and length.
- **Methodology explanation.** Asking AI to clarify NGFS scenario design, Swiss Re sigma elasticity assumptions, and the STIRPAT framework, then verifying against primary sources.
- **Live PWA feature (Cedent + Stress screens).** Gemini Flash (`gemini-2.5-flash`) acts as a natural-language input parser. The user types prose such as "Vietnamese power cedent, 70% thermal, no NDC plan filed" or "Net Zero 2050 at elasticity 0.9"; the model emits a single forced tool call (`set_cedent_inputs` / `set_stress_inputs`) which is server-side validated and clamped, then a second turn writes a 2–3 sentence narration over the precomputed numbers. The brief permits LLM use in the interactive deliverable; the modelling pipeline (`analysis/python/analysis.ipynb`) remains R/Python-only.

## 3. What we did NOT use AI for

- **Final modelling decisions.** Model selection (XGBoost over ARIMA/log-linear) was a team decision based on observed hold-out MAPE — not an AI suggestion accepted blindly.
- **Citations.** Every reference in the bibliography was located and read by a team member; we did not let the AI generate citations without verification.
- **Numerical results.** All numbers in the report come from running our own code on the WDI dataset. No AI-fabricated statistics appear in the submission.
- **Pipeline numerical outputs in the live feature.** The Cedent + Stress AI panel never generates loss ratios, expected losses, sector residuals, composite tiers, or premium loadings. Those values are computed deterministically by (a) the XGBoost models in `serve/pipeline.py` (seed `RANDOM_STATE = 2026`), (b) the Stress recompute in `serve/agent.py` (which reads the canonical `exhibits/results/key_numbers_python.json`), and (c) the React tier helpers in `app/src/data/cedent.ts`. Gemini only narrates over already-computed values; the system prompt explicitly forbids introducing numbers not present in the payload, and the panel falls back to a templated narration if the LLM call fails.

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
