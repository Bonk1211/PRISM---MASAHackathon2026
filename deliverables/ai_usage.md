# AI Usage Disclosure

*Required per MASA Hackathon 2026 Participant Handbook, Section 5.5 (AI Usage Policy)*

Team: [TEAM_NAME]

---

## 1. Posture — minimise, then review

Our default was **not** to use generative AI. We treated it as a narrow assistant
for boilerplate and a rephrasing tool, never as a source of truth. Every piece
of generative-AI output that survived into this submission — code, prose,
explanations, narration — was **read, executed where applicable, and edited by
a human team member before commit**. Nothing was pasted in unreviewed.

The headline analytical work — feature engineering, model selection, hold-out
validation, NGFS scenario calibration, partial-correlation sign-flip
diagnostic, sector residual mapping, cedent tiering rules, the USD 135 m loss
swing — is the team's own. No AI made a modelling decision for us.

## 2. Generative AI tools used

| Tool | Version / model | Where it appears |
|---|---|---|
| Anthropic Claude | claude-opus-4 | Light code scaffolding (file skeletons, Tailwind boilerplate) and prose copy-edits. Never accepted unverified. |
| YTL ILMU (`nemo-super`) | OpenAI-compatible | **Live in-app feature only.** Powers the PRISM scoping chatbot (`backend/scoping.py`) and the natural-language input parser on the Pricing/Cedent screens (`backend/agent.py`). Tool-calling only — emits structured slider values, never invents numbers. |

We did not use any other generative-AI tool in this submission.

## 3. What AI was used for — and the review gate

- **Code scaffolding.** Initial file skeletons (component shells, FastAPI route
  stubs) were drafted with Claude. Every file was then **run, debugged, and
  refactored by a team member**; we did not commit code we had not executed
  and read end-to-end. Type-checking (`tsc`) and the 19-anchor regression
  suite (`make test`) provide a hard gate against drift.
- **Prose copy-edits.** Sentence-level rephrasing of the report, the executive
  one-pager, and microcopy. Claims, numbers, and references were written by
  the team first, then tightened. **Every paragraph was re-read and edited
  before commit.**
- **Methodology rubber-ducking.** We occasionally asked an LLM to restate the
  STIRPAT framework, NGFS scenario logic, or Swiss Re sigma elasticity in
  plain English to check our own understanding — then verified against
  primary sources (Swiss Re Sigma 1/2024, NGFS Phase V documentation, World
  Bank WDI metadata). The verified primary source is what we cite.
- **Live PWA feature.** ILMU `nemo-super` runs two narrow flows inside the
  app: (a) the scoping chatbot that pins five cedent-profile axes via forced
  tool calls; (b) the Pricing/Cedent natural-language parser that converts
  prose like "Vietnamese power cedent, 70% thermal, no NDC plan" into
  validated slider values. The model **only emits structured tool calls**;
  numbers are computed deterministically by the Python pipeline downstream.
  The brief explicitly permits LLM use in the interactive deliverable; the
  modelling pipeline (`analysis/python/analysis.ipynb`) stays Python-only.

## 4. What we did NOT use AI for

- **Modelling decisions.** Choice of XGBoost over ARIMA / log-linear, the dual
  M3a (autoregressive) + M3b (structural) specification, lag selection,
  hold-out year, seed value (`RANDOM_STATE = 2026`) — all team decisions
  driven by observed hold-out MAPE.
- **Numerical results.** Every number in the report (USD 135 m loss swing,
  +11 pp loss-ratio delta, 2.4 % MAPE, partial-correlation coefficients,
  sector residuals, country tiers) is produced by running our own code on
  the WDI panel. Single source of truth: `exhibits/results/key_numbers_python.json`.
  No AI-fabricated statistics appear anywhere in the submission.
- **Pipeline numerical outputs in the live PWA feature.** The chatbot and
  pricing parser never generate loss ratios, expected losses, residuals,
  composite tiers, or loadings. Those values are computed deterministically
  by (a) the XGBoost models in `backend/pipeline.py`, (b) the stress
  recompute in `backend/agent.py` reading canonical
  `key_numbers_python.json`, and (c) the React tier helpers in
  `frontend/src/data/cedent.ts`. The system prompt explicitly forbids
  introducing numbers not present in the payload, and the panel falls back
  to a templated narration if the LLM call fails or hallucinates.
- **Citations.** Every reference in the bibliography was located and read by
  a team member. AI was never asked to produce citations.
- **Final wording of headline claims.** The pitch deck headline, the report's
  Executive Summary §2, and the Hannover Re memo cover were written from
  scratch by a team member.

## 5. Validation & accountability statement

The team has **read, executed, and verified all code** in this submission.
We have **independently checked all numerical claims and citations** against
the underlying data and source documents. Every line of generative-AI
content was reviewed by a human team member before being committed.

We take full accountability for the originality and integrity of this
submission, including any AI-assisted output. Any errors are our own.

## 6. Signed

| Name | Role | Signature |
|---|---|---|
| [Member 1] | Team Leader | _________________ |
| [Member 2] | Modelling | _________________ |
| [Member 3] | Visualisation / Dashboard | _________________ |
| [Member 4] | Research / Writing | _________________ |

Date: [DD MMM 2026]
