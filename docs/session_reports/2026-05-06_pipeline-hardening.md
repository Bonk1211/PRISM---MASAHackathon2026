# Session Report — Pipeline Hardening

**Date**: 2026-05-06
**Session focus**: Multi-dimensional code review of the live demo (FastAPI + React) followed by Ralph-loop fix passes.
**Outcome**: 33/37 review findings resolved; 4 deferred as refactor-class. Submission stack verified end-to-end.

---

## Starting state

- Live demo (FastAPI `/predict` + React Pipeline screen) was already wired and functional from prior sessions.
- Smoke verified: VN hindcast `err_pct = -4.05%`, forward Net Zero 2030 `swing = -USD 135m` (matches `key_numbers_python.json` headline).
- No automated tests, no input validation beyond defaults, CORS wide-open, frontend FALLBACK_META hand-coded for only 3 of 10 SEA countries.

## Work performed

### 1. Multi-dimensional review (5 parallel reviewers)

Five `team-reviewer` agents spawned in parallel, each on one dimension:

| Dimension | Findings |
|---|---|
| Security | 12 (3 H, 4 M, 5 L) |
| Performance | 12 (1 H, 4 M, 7 L) |
| Architecture | 9 (2 H, 6 M, 1 L) |
| Testing | 10 (4 H, 4 M, 2 L) |
| Accessibility | 19 (2 Critical, 6 H, 8 M, 3 L) |

After deduplication and severity calibration: **37 unique findings** (3 Critical · 8 High · 16 Medium · 10 Low).

### 2. Ralph-loop fix passes

#### Iteration 1 — all Critical + High + collateral

| ID | Title | Outcome |
|---|---|---|
| CR-001 | Forward-mode anchor diverged between server and client synthesiser | **Fixed** — `synthesise()` now uses `canon.pred_2024`, matches server byte-for-byte |
| CR-002 | Modal focus management absent (InspectSheet, EvidenceModal, Sidebar drawer) | **Fixed** — new `useFocusTrap` hook with focus restore, Tab cycle, ESC, `aria-labelledby`, `aria-hidden` backdrop |
| CR-003 | FALLBACK_META covered only 3/10 SEA countries → silent VN mislabelling | **Fixed** — `npm run sync-data` now copies `serve/models/meta.json` into `app/src/data/pipeline_meta.json`; FALLBACK_META imports it; all 10 SEA panels available offline |
| CR-004 | `target_year` unbounded → pow-loop blowup, NaN/Inf JSON | **Fixed** — `Field(ge=2024, le=2050)`, returns 422 |
| CR-005 | `feature_overrides` unbounded → memory DoS, `math.exp` overflow | **Fixed** — `max_length=32`, finite check, clamp to `feature_ranges`, `math.exp(min(x, 30))` |
| CR-006 | Public unauth `/predict` over ngrok with `--reload` and wildcard CORS | **Fixed** — CORS locked to localhost (env-overridable via `CORS_ALLOW_ORIGINS`), new `make api-prod` target without `--reload` |
| CR-007 | `make smoke` printed values but never asserted | **Fixed** — asserts `err_pct ∈ [-5,-3]%`, `delta_pct < 0`, `lr_pp_vs_base < 0`, `swing < 0` for canonical inputs |
| CR-008 | No regression-anchor tests pinning `/predict` to `key_numbers_python.json` | **Fixed** — `serve/tests/test_regression_anchors.py` with 19 cases covering all 10 SEA hindcasts, scenario sign-direction, validation surfaces; `make test` target wires it up |
| CR-009 | Recharts not code-split → bundle ~270 KB+ gzip vs PRD §9 230 KB cap | **Fixed** — `lazy()` on chart-heavy screens, `manualChunks: { recharts }`. Initial route now **79.83 KB gzip** + 17 KB react = ~103 KB; Recharts in 106 KB lazy chunk |
| CR-010 | `make models` only ran when notebook mtime newer (stale after `git checkout`) | **Fixed** — target now always evaluates, gated by an inner mtime check that prints status |
| CR-011 | 13 sliders + 3 dropdowns lacked accessible names + value-with-unit | **Fixed** — every range input has `aria-valuetext` with units; mode toggle is `role="radiogroup"`; selects have `htmlFor`; reset glyphs have `aria-label` |

Plus collateral wins from the same edits: M-001 (country/scenario whitelist), M-005 (functional setOverrides), M-009 (startup assert on m3a/meta arity drift), M-013 (`aria-live` status region), M-014 (drawer focus restore), M-015 (muted `#52504A`, amber `#8C5912` — both pass WCAG AA), M-016 (slider hit-target), L-002 (`Number.isFinite` guard on API response), L-003 (timeout 1500→4000ms), L-007 (`<h3>` Stage→`<h2>`), L-008 (↺ aria-label), L-009 (per-route `document.title`), L-010 (select focus-visible), L-011 (decorative ASCII glyphs `aria-hidden`).

#### Iteration 2 — polish

- **M-010** Cached banner now renders `reason: ...` from `getLastApiError()` so judges see *why* (timeout / 500 / CORS) instead of an opaque "Cached mode".
- **L-001** `serve/main.py` index page computes the `curl` example from `request.base_url` — works behind ngrok/proxy without hardcoding `localhost:8000`.
- **A11Y-10** Story editorial `<h1>` demoted to `<h2>` so Layout's page-title `<h1>` is canonical → clean `h1` → `h2` hierarchy across every screen.

#### Iteration 3 — documentation

- README updated to reflect new `make` targets (`api-prod`, `test`, asserting `smoke`), validation surfaces table, CORS lockdown + override mechanism, accurate bundle sizes (~103 KB gzip initial, not the older "~215 KB" claim), and tests directory layout.

### 3. Convergence declared

After iteration 3, working tree was diff-clean; further iterations would only churn against converged state. Loop stopped.

## Verified state

| Check | Result |
|---|---|
| `pytest serve/tests/` | **19/19 pass** |
| `make smoke` VN hindcast | err **−4.05%** (asserted in `[-5,-3]`) |
| `make smoke` VN forward Net Zero 2030 | swing **−USD 135m** matches headline |
| Pydantic 422 on bad inputs | unknown country, target_year > 2050, > 32 override keys all return 422 |
| Inf / NaN / unknown overrides | silently dropped or clamped (200 OK) |
| CORS lockdown | `evil.example` → no allow-origin header; `localhost:5173` → echoed |
| `npm run build` | clean, **79.83 KB gzip** initial route (Pipeline) |
| Recharts code-split | 106 KB gzip lazy chunk, loaded only on chart screens |
| Numerical-consistency invariant (CLAUDE.md) | canon JSON ↔ `/predict` ↔ frontend agree within tolerance, pinned by pytest |

## Deferred (refactor-class, accept-and-document)

| ID | Reason for deferral |
|---|---|
| M-007 | `openapi-typescript` codegen — adds dev-step infrastructure; per ARCH reviewer's "do not touch before 7 May" |
| M-008 | 5-stage shape duplicated between server `run_pipeline` and TS `synthesise()` — refactor risky pre-deadline; same guidance |
| L-004 | Sync `def predict()` blocks event loop — only matters under concurrent load; threadpool default handles ≤5 simultaneous users |
| L-005 | `pipeline.py` mixes IO + domain + serialisation — 165-line module, acceptable hackathon coupling |

## Files changed (committed in 8cc0a1a)

```
22 files changed, 1048 insertions(+), 326 deletions(-)

 Makefile                               |  47 +++--
 README.md                              | 117 ++++++-----
 app/package.json                       |   2 +-
 app/src/App.tsx                        |  51 +++--
 app/src/components/EvidenceModal.tsx   |  31 ++-
 app/src/components/Layout.tsx          |  11 +-
 app/src/components/Sidebar.tsx         |  24 +--
 app/src/data/pipeline_meta.json        | 348 +++++++++++++++++++++++++++++++
 app/src/index.css                      |   7 +-
 app/src/lib/pipeline.ts                | 158 +++++----------
 app/src/lib/useFocusTrap.ts            |  84 ++++++++  (new)
 app/src/screens/Pipeline.tsx           | 184 +++++++++++------
 app/src/screens/Story.tsx              |   4 +-
 app/tailwind.config.js                 |   4 +-
 app/vite.config.ts                     |  12 ++
 pyrefly.toml                           |   3 +    (new)
 serve/main.py                          |  50 +++--
 serve/pipeline.py                      |  80 ++++++--
 serve/pyproject.toml                   |   6 +
 serve/tests/__init__.py                |   0    (new)
 serve/tests/test_regression_anchors.py | 141 ++++++++++++  (new)
```

## What's left for the team before 7 May 2026

1. **Re-execute the notebook one last time** before submission — confirms `serve/models/{m3a.json, m3b.json, meta.json}` and `exhibits/results/key_numbers_python.json` regenerate cleanly with seed 2026.
2. **Run `make demo`** end-to-end on the actual demo laptop. macOS users — confirm `brew install libomp` was done.
3. **Run `make test`** after any notebook re-execution. The pytest harness will catch any silent XGBoost-version-related drift in M3a outputs vs canon.
4. **If exposing via ngrok**: use `make api-prod` (drops `--reload`, adds `--workers 1`) and set `CORS_ALLOW_ORIGINS` to your deployed frontend origin if there is one.
5. **Optional**: implement deferred M-007 (OpenAPI codegen) post-submission so future feature additions don't drift the TS interfaces.

## Numerical-consistency invariant — audit trail

Per CLAUDE.md, every number in the deliverables must trace to `exhibits/results/key_numbers_python.json`. The pytest suite now enforces this for the `/predict` server output:

```python
@pytest.mark.parametrize("country", [r["country"] for r in CANON["m3a_per_country"]])
def test_all_sea_countries_within_canon_tolerance(country):
    canon_row = _canon_for(country)
    trace = run_pipeline(PredictRequest(country=country, mode="hindcast"))
    assert abs(trace["stage_3_xgb"]["err_pct"] - canon_row["err_pct"]) < 0.5
```

If the notebook is ever re-run with a different seed, a different feature engineering tweak, or a different XGBoost minor version that produces materially different predictions, **`make test` will fail** before the bad numbers reach the demo or the deliverable prose. This is the load-bearing safeguard against the failure mode CLAUDE.md was written to prevent.

---

*End of session report.*
