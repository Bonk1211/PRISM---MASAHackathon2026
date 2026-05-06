# Product Requirements Document — PRISM SEA Climate Risk PWA

**Version** 2.0 (Champion) · **Date** 2026-05-05 · **Owner** PRISM team · **Status** Implementation spec for Grand Final

> **What changed from v1.0.** Five new screens (Diagnostic, Sectoral, Compare, Brief, Evidence). One scripted "wow moment" choreographed for the live demo. QR-code install affordance so judges leave the room with the app on their phone. Trace-back layer that shows the source of every number. Explicit mapping of every screen to the MASA judging rubric so we capture the full 10% bonus weighting plus reinforce the four core 20% pillars.

---

## 1. Why this version exists

The v1.0 PWA already passes the bar. v2.0 is engineered to *win* — it converts the 10% bonus criterion into a structural advantage and uses the app to amplify, not replicate, the report. Three principles guide every decision below:

1. **One memorable moment.** A judge who remembers a single 5-second interaction from your demo will rank you higher than one who remembers seven competent screens. We engineer that moment in §7 (Demo choreography) and reinforce it in the Stress screen design (§6.6).
2. **Trace-back over breadth.** Every number has a "why" button. A judge tapping "+280% Power Industry" sees the underlying STIRPAT regression equation, the sample size, the residual ranking, and the *report section* the number lives in. Bigger competitive moat than another chart.
3. **Judge-portable.** A judge who installs the PWA on their own phone during your pitch carries your story home. We engineer the install-on-tap path in §8.

---

## 2. Outcomes that determine "won"

| Outcome | How the PWA contributes | How we measure |
|---|---|---|
| **20% Problem Framing** | Story screen frames USD 135m / 11pp swing in 3 seconds | Cold viewer can answer "what's the headline?" in <10s |
| **20% Modelling** | Diagnostic + Model screens show the 3 sign-flips and dual-XGBoost spec | Judge can articulate "why two models, not one?" after seeing it |
| **20% Financial Impact** | Stress screen recomputes loss ratio on tap | Judge taps Stress 2+ times during demo |
| **20% Strategic Recs** | Cedent screen prices a hypothetical book in real time | Judge changes country during demo (high-engagement signal) |
| **20% Storyline & Presentation** | One scripted demo path; bottom-nav allows non-linear backup | Pitch hits all 4 anchor screens in 90 seconds |
| **+10% Bonus (interactive + policy + executive)** | All ten screens; Brief screen exports executive memo; QR install | All 3 sub-criteria simultaneously satisfied per rubric §6.6 |

**Definition of "won":** at the end of the live demo, ≥1 judge has installed the PWA on their personal phone.

---

## 3. Goals (with hard targets)

| Goal | Hard target | Why it matters |
|---|---|---|
| Single-thumb demo on a phone | All flows ≤ 2 taps from any screen | Demo flow stays in viewer's muscle memory |
| Numerical fidelity | Every figure traces to `key_numbers_python.json` to 4 dp | If a judge spot-checks a number against the report, it matches |
| Bundle size | ≤ 230 KB gzip (vs v1.0 191 KB) | More screens, no slower; engineering discipline |
| First paint | < 1.0 s on iPhone 13 over 4G | Demo doesn't pause on a load spinner |
| Tap → recompute | < 80 ms (vs v1.0 100 ms) | Feels native, not webby |
| Offline | Lighthouse PWA score 100 | Judges' offline phones still work |
| Install path | QR code → install ≤ 8 s on iOS Safari | Judges actually keep it |
| Every number traceable | Tap any number → source modal in 1 tap | Differentiator vs all other teams |
| Accessibility | WCAG AA on all screens (contrast 4.5:1 body, 3:1 large; touch 44×44px) | Regulator persona is real |

---

## 4. Personas, with explicit jobs-to-be-done

| Persona | Needs to be able to... | Critical screens |
|---|---|---|
| **Hackathon judge (analytical)** | Stress-test our claim; check one specific number | Story → Diagnostic → Stress |
| **Hackathon judge (commercial)** | See if recommendations are real; price a cedent | Story → Cedent → Brief |
| **Hannover Re APAC CRO** | Decide whether the cedent framework is operationalisable | Cedent → Sectoral → Brief (memo export) |
| **BNM/OJK regulator** | Verify NGFS scenario alignment + capital implication | Stress → Evidence (policy linkage) |
| **Cedent CFO (e.g., PVI)** | See own country profile and exposure to renewals | Hot Spots → Cedent → Compare |
| **Internal team during pitch** | Jump to any screen without losing place | Bottom nav (always visible) |

A v1.0 user persona had four entries. v2.0 has six because two new screens (Brief, Evidence) serve the regulator and the CFO directly — those personas can't be served by Stress + Cedent alone.

---

## 5. User journey

```
                     ┌──────────────────────────────────────────┐
                     │            STORY (entry)                  │
                     │   USD 135m / 11pp / QR-install-here       │
                     └─────────────────┬─────────────────────────┘
                                       │
       ┌───────────────────────────────┼─────────────────────────────────┐
       ▼                               ▼                                 ▼
   MODEL (5%)                    DIAGNOSTIC (NEW, 15%)             HOT SPOTS (10%)
  MAPE + drivers                  3 sign-flips                     VN vs PH stats
       │                               │                                 │
       └────────────┬──────────────────┴────────────────┬────────────────┘
                    ▼                                   ▼
         SECTORAL (NEW, 10%)                       COMPARE (NEW, 5%)
         8x10 residual heatmap                     2-country side-by-side
                    │                                   │
                    └────────────────┬──────────────────┘
                                     ▼
                              STRESS (anchor, 20%)
                              Live NGFS recompute  ← the wow moment
                                     │
                                     ▼
                              CEDENT (anchor, 20%)
                              Live tier scoring
                                     │
                                     ▼
                              ACTIONS (10%)
                              4 recommendations
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                    BRIEF (NEW)          EVIDENCE (NEW)
                  Export memo PDF         Trace-back layer
```

Percentages = relative time-on-screen weighting in the demo. Stress and Cedent are anchor screens (each 20%).

---

## 6. Functional requirements — eleven screens

### 6.1 Story (`/`) — entry & install

**Same as v1.0** plus:

- **QR install affordance**: a small "Install on your phone" card that, on a desktop browser, shows a QR code linking to the hosted demo URL. On a phone, it shows the "Add to Home Screen" gesture animation. **This is how judges leave with your app installed.**
- **Last-updated stamp**: small text at the bottom — "Data as of 25 Apr 2026 · seed 2026 · Python pipeline v1.0" — signals reproducibility without taking screen real estate.

### 6.2 Model (`/model`) — accuracy & drivers

**Same as v1.0**, with the addition of a small "Why does the lag-1 feature dominate gain in M3a?" inline explainer. This pre-empts a likely judge question.

### 6.3 Diagnostic (`/diagnostic`) — sign-flip diagnostic ⭐ NEW

The methodological differentiator from §3.2 of the report, made interactive.

**Inputs:** view-mode toggle (Both / Pairwise only / Partial only). 
**Output:** horizontal bar chart of 11 indicators; sign-flipped indicators rendered in `rust`; non-flipped in `sea`/`grey`. 
**Tap-on-bar:** opens a modal showing pairwise *r*, partial *r*, p-value, sample size, and a one-line interpretation ("Forest-rich SEA economies emit MORE than predicted — LULUCF channel hidden by pairwise"). 
**Anchor copy:** "3 indicators flip sign once scale is controlled." (big rust-red number)

This screen takes the report's most distinctive analytical move and makes it tactile. **No competing team will have this.**

### 6.4 Hot Spots (`/hotspots`) — VN vs PH

Same as v1.0, with one addition: each stat tile is tap-able. Tapping the "92%" protection-gap figure for Vietnam opens an Evidence modal showing the source (Swiss Re sigma 1/2024 Box 4) plus the equivalent figure for the Philippines for comparison.

### 6.5 Sectoral (`/sectoral`) — STIRPAT residual heatmap ⭐ NEW

The visual that anchors "Vietnam is a power-sector story". Replaces having to flip back to Figure 4 of the report PDF.

**Layout:** 10×8 heatmap (10 SEA countries × 8 sectors). Cell colour: red for >50%, deep red for >150%, white near zero, green for negatives. Cell value: residual percentage in white text on coloured background. 
**Tap-on-cell:** opens a modal with the country, sector, residual, sample size of the underlying STIRPAT regression, and the sector's NDC alignment status for that country. 
**Highlight overlay:** a "Hot cell" toggle that dims everything except cells with residual > +150%, putting Vietnam Power (+280%), Vietnam IndCombustion (+276%), Lao PDR Power (+781%) and Brunei Fugitive (+4,205%) in the spotlight.

### 6.6 Stress (`/stress`) — the wow moment ⭐ ENGINEERED

**This is the screen the demo is built around.** Three changes from v1.0:

- **Live elasticity slider** below the scenario buttons. Range 0.3 to 1.2 (Swiss Re sensitivity range). The Loss Ratio number recomputes on every tick of the slider. This is the **5-second moment** the demo orbits around.
- **Capital-implication tile**: just below the LR number, a tile reads "Hold +X% additional capital under this scenario" — formula tied to BNM CRST 2024 §6.3. As scenario changes, capital tile changes.
- **Compare-to-baseline ribbon**: a small banner at the bottom that always reads "Δ vs Hot House: USD ±Xm". Persistent across all scenario picks; gives a reference point.

### 6.7 Cedent (`/cedent`) — composite-tier scoring

Same as v1.0, with three additions:

- **Save profile**: a "Save this cedent" button (top-right) stores the country, mix, NDC status to localStorage with a name. The Brief screen (§6.10) consumes saved profiles to generate an executive memo.
- **Energy-mix override**: a 5th input slider (coal % + 0.5 × gas %) that activates Override 2 from `05_cedent_screening_framework.md` §6 — closes the gap to the printed scorecard.
- **Real cedent presets**: five chip buttons named for actual SEA cedents — PVI, Bao Viet, Bao Minh, PJICO, MIC — each loading a public-domain-derived plausible book mix from `10_vn_cedent_targets.md`. Tapping "PVI" loads a Power-heavy book. **This is the moment a Hannover Re judge realises this is operational, not academic.**

### 6.8 Compare (`/compare`) — two-country side-by-side ⭐ NEW

Pick any two countries from a chip strip. The screen renders all key metrics side-by-side: 2024 GHG total, STIRPAT residual, ND-GAIN, insurance penetration, protection gap, dominant peril, and the recommended underwriting tier from the framework.

Default: Vietnam vs Philippines. The country-comparison case study from §5 of the report, made interactive in 2 taps.

### 6.9 Actions (`/actions`) — strategic recommendations

Same as v1.0, with each card now tap-able:

- Tap a recommendation → opens a modal with KPI, owner, milestone date, and the policy anchor (e.g., "Paris Article 2.1(c)"). Tap the policy anchor → opens the Evidence screen at the relevant section.

### 6.10 Brief (`/brief`) — executive memo export ⭐ NEW

The bonus-criterion executive-readiness screen. Renders an editable executive memo (the same format as `09_hannover_re_executive_memo.md`) populated from saved cedent profiles + selected scenario + chosen recommendations. Three CTAs:

- **Copy to clipboard** — text format, ready to paste into Outlook
- **Download as PDF** — using browser print-to-PDF
- **Share via WhatsApp/SMS** — for the Asia-Pacific Hannover Re team

This is the screen that makes a CRO say "I could send this to my CEO tomorrow."

### 6.11 Evidence (`/evidence`) — trace-back layer ⭐ NEW

A search-and-browse screen for the source of every number in the PWA. Three views:

- **By number**: search "USD 135 m" → shows every screen where it appears + the source paragraph in `01_report.md`
- **By policy**: tap "BNM CRST 2024" → shows every recommendation, capital figure, scenario alignment that cites it
- **By data source**: tap "World Bank WDI" → shows the 16-indicator panel + indicator codes + download timestamp

This screen is where a sceptical judge goes after the demo to satisfy themselves the analysis is real. It's also a courtesy to a regulator persona who needs an audit trail.

---

## 7. The scripted demo (90 seconds, choreographed)

Champion teams choreograph their demo to the second. This is the script for slide 14 of the pitch deck.

| Time | Speaker says... | Screen action |
|---|---|---|
| 0:00 | "Let me show you the live dashboard." | Phone mirrored to projector. App at Story screen. |
| 0:05 | "USD 135 million swing on a USD 1.2 billion book — pull this up on your own phone via this QR code." | Point at QR code on Story screen. |
| 0:15 | "Here's our methodological differentiator — three indicators flip sign once we control for scale." | Tap Diagnostic. Toggle "Both → Partial". |
| 0:30 | "Vietnam's +24% over-emission is really a +280% power-sector story." | Tap Sectoral. Tap "Hot cells" toggle. Vietnam-Power lights up. |
| 0:45 | **THE WOW MOMENT.** "Watch this. Net Zero — drag elasticity from 0.7 to 1.2 — loss ratio goes from 51% to 56%." | Tap Stress, drag scenario, then drag elasticity slider. Numbers update live. |
| 1:05 | "Now let's price an actual cedent. PVI — Vietnam, Power-heavy, no NDC plan." | Tap Cedent → PVI preset. Composite tier shows D, +22% loading. |
| 1:20 | "And we can produce the executive memo for Hannover Re APAC right here." | Tap Brief. Memo populated. Show "Copy to clipboard" button. |
| 1:30 | "We'd love your questions." | Return to Story. End of demo. |

**Three rules for the speaker:**

1. Don't narrate the navigation ("now I tap Stress…") — narrate the finding ("look at the swing").
2. Hand the phone to the nearest judge between 0:45 and 1:05 if possible. Tactile contact = lasting memory.
3. If anything breaks, jump to Story → bottom nav → next screen. Never apologise for the app on stage.

---

## 8. The QR-install path (judge keeps the app)

The Story screen renders a QR code that resolves to the production hosted URL (e.g., `https://prism-sea.vercel.app`). On any judge's phone:

1. Judge points camera at QR code → URL detected
2. Tap "Open in Safari" / "Open in Chrome"
3. PWA loads (offline-capable already after first load due to service worker)
4. iOS: Safari shows the share-sheet hint; Android: Chrome shows install banner
5. Judge taps "Add to Home Screen" → PRISM icon appears
6. Total time: 5–8 seconds

**Engineering**: the QR code is generated client-side using `qrcode.react` (~3 KB gzip) so we don't depend on a third-party service that might be blocked at the venue.

---

## 9. Non-functional requirements

Same as v1.0 plus:

| Category | New / changed |
|---|---|
| **Bundle size** | Hard cap 230 KB gzip (allows 11 screens at v1.0 budget) |
| **Performance** | Tap → recompute < 80 ms (was 100 ms); LCP < 1.0 s on 4G |
| **Offline** | First-load works on plane Wi-Fi; subsequent loads are 100% offline |
| **Accessibility** | WCAG AA verified; Lighthouse score ≥ 95 |
| **Browsers** | Safari iOS 16+, Chrome Android 10+, Edge 100+, Firefox 100+ |
| **Telemetry** | Local-only event tracking via `localStorage`. Capture: screen visits, slider drags, scenario picks. Display in a `/admin/usage` route only the team can access (URL fragment-keyed). Used to debug demo issues, not for analytics. |
| **Print** | Brief screen has a print stylesheet so `Ctrl+P` produces a clean memo |

---

## 10. Data model — extended from v1.0

Same source-of-truth pattern as v1.0 (everything traces to `key_numbers_python.json`) plus three additions:

| Constant | Source | Used by | New? |
|---|---|---|---|
| `PARTIAL_CORR` | `key_numbers_python.json` → `partial_correlations` | Diagnostic | Yes |
| `SECTORAL_HEATMAP` | `key_numbers_python.json` → `sectoral_residuals_pct` | Sectoral | Yes |
| `EVIDENCE_INDEX` | new file `app/src/data/evidence.ts` — manually curated mapping of every number → report section | Evidence | Yes |
| `CEDENT_PRESETS` | `10_vn_cedent_targets.md` (5 named cedents) | Cedent | Yes |
| `POLICY_REFS` | `06_policy_crosswalk.md` (8 instruments) | Actions, Evidence | Yes |
| `DEMO_SCRIPT` | this PRD §7 | `/admin/script` (speaker reference) | Yes |

The Evidence index is the only manually curated structure — everything else is derived from existing pipeline outputs.

---

## 11. Tech stack — unchanged from v1.0

Vite 7 + React 19 + TypeScript 5.6 + Tailwind 3.4 + react-router-dom 7 + Recharts + vite-plugin-pwa.

**Two additions:**

- `qrcode.react` (~3 KB gzip) — for the install QR code
- `react-to-print` (~2 KB gzip) — for the Brief screen export

Both are widely-maintained, MIT-licensed, dependency-light. Neither breaks the bundle target.

---

## 12. Architecture — extended from v1.0

```
app/
├── public/                    Icons (192, 512, 512-maskable, apple-touch, favicon, qr-test)
├── scripts/
│   ├── sync-data.mjs          Auto-syncs key_numbers_python.json
│   └── lighthouse.mjs         Runs Lighthouse CI before each release ⭐ NEW
├── src/
│   ├── App.tsx                HashRouter w/ 11 routes (was 6)
│   ├── main.tsx               registerSW + telemetry initialisation
│   ├── lib/                   ⭐ NEW
│   │   ├── telemetry.ts       LocalStorage event tracking
│   │   ├── pdf.ts             Brief-screen export wrapper
│   │   └── qr.ts              QR code helper
│   ├── components/
│   │   ├── Layout.tsx         Header + main + bottom nav (responsive 7/11 tabs)
│   │   ├── BottomNav.tsx      Now responsive: shows 5 main + "More" overflow on iPhone SE
│   │   ├── Card.tsx           
│   │   ├── StatBig.tsx        
│   │   ├── EvidenceModal.tsx  ⭐ NEW — tap any number → source modal
│   │   ├── QRInstall.tsx      ⭐ NEW — Story-screen install affordance
│   │   └── BriefMemo.tsx      ⭐ NEW — formatted memo for Brief screen
│   ├── data/
│   │   ├── keyNumbers.ts      
│   │   ├── cedent.ts          
│   │   ├── evidence.ts        ⭐ NEW — number → source mapping
│   │   ├── policy.ts          ⭐ NEW — 8 policy instruments
│   │   └── presets.ts         ⭐ NEW — 5 named cedent presets
│   └── screens/
│       ├── Story.tsx          + QR install affordance
│       ├── Model.tsx          
│       ├── Diagnostic.tsx     ⭐ NEW
│       ├── HotSpots.tsx       + tap-to-evidence on stat tiles
│       ├── Sectoral.tsx       ⭐ NEW
│       ├── Compare.tsx        ⭐ NEW
│       ├── Stress.tsx         + elasticity slider (the wow moment)
│       ├── Cedent.tsx         + Save profile, energy-mix slider, real cedent presets
│       ├── Actions.tsx        + tap-to-policy on each rec
│       ├── Brief.tsx          ⭐ NEW
│       └── Evidence.tsx       ⭐ NEW
├── vite.config.ts             
└── tailwind.config.js         
```

Eleven screens, four new components, three new data files. All within the v1.0 architectural pattern — no framework changes, no global-state library, no backend.

---

## 13. Visual design

Same brand palette as v1.0 (ink / sea / amber / rust / sage / sand). Two additions:

- **Numbers-with-units have a unified component**: every "USD 135m", "11 pp", "62 %" uses `<StatBig>`. Hierarchy enforced.
- **Tap-target halo**: any element that's tap-able to open an Evidence modal has a 1px subtle ring. Trains the user fast.

---

## 14. Acceptance criteria — to declare ready for Grand Final

| # | Criterion | Method |
|---|---|---|
| 1 | All 11 screens reachable from bottom nav (or "More" menu) | Manual smoke test on iPhone 13, Pixel 7 |
| 2 | All 11 screens render under 1.0 s LCP on 4G | Lighthouse CI in script |
| 3 | Stress recompute < 80 ms per slider tick | DevTools Performance tab |
| 4 | Cedent composite tier updates < 80 ms per input change | Same |
| 5 | Bundle ≤ 230 KB gzip after build | `vite build` output |
| 6 | PWA installable on iOS Safari 16+, Android Chrome 110+ | Manual on test devices |
| 7 | Headline numbers match `key_numbers_python.json` to 4 dp | Snapshot test in CI |
| 8 | QR code renders to correct production URL | Scan from second phone |
| 9 | Brief screen exports PDF identical to `09_hannover_re_executive_memo.md` template | Visual diff |
| 10 | Demo script (§7) executes in 90 ± 5 seconds | Stopwatch rehearsal |
| 11 | Tap on any number opens Evidence modal with correct source | Audit 30 random numbers |
| 12 | WCAG AA contrast verified on all screens | Stark or axe DevTools |

---

## 15. Distribution plan

**Three demo paths**, in order of preference:

1. **Public hosted URL** (Vercel / Netlify / Cloudflare Pages) → QR code on Story screen → judges install in 5 seconds. **This is the primary demo path.**
2. **LAN URL via `npm run dev`** → if venue Wi-Fi is shared between laptop and phones. Backup path.
3. **Static `dist/`** on a USB stick → laptop with `npx serve` running locally. Last-resort path if both above fail.

**Pre-Grand-Final checklist:**

- [ ] Production URL deployed and reachable from outside the venue's Wi-Fi
- [ ] QR code on Story screen scanned successfully on iPhone + Android (3 attempts each)
- [ ] Lighthouse run on production URL: PWA = 100, Performance ≥ 95, Accessibility ≥ 95
- [ ] Demo run end-to-end on the actual demo phone (not a simulator) — 3 times
- [ ] Demo script (§7) timed; 90 seconds ±5

---

## 16. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Venue Wi-Fi blocks the production URL** | Pre-cache on demo phone before the day; PWA works offline after first load |
| **Service worker caches a stale build** | `clientsClaim: true` + `skipWaiting: true` (already in v1.0); plus a build-stamp tile on Story shows the deploy hash |
| **Phone-to-projector mirroring fails** | Backup: open the PWA on the laptop browser at half-window width with a phone-bezel overlay (CSS provided) |
| **Judge asks "where does that number come from?"** | Every number is tap-to-Evidence — answer in real time |
| **Judge asks an off-script question** | Bottom nav lets you go anywhere in 1 tap; no need to "go back" |
| **Critical bug discovered the morning of Grand Final** | Roll back to v1.0 production URL — keep both deployed in parallel |
| **Recharts + React 19 type drift** | Pin `recharts@2.15.x`; document any TS workarounds in repo `KNOWN_ISSUES.md` |

---

## 17. Post-Grand-Final extension paths (out of scope)

| Direction | Effort |
|---|---|
| Multi-language support (Bahasa Malaysia, Vietnamese, Indonesian) | 1 week |
| Server-backed cedent profile sharing | 2 weeks (would require auth) |
| White-label theme for cedent self-screening tool | 3 days |
| IndexedDB persistence (instead of localStorage) for richer cedent profiles | 1 week |
| Live API into the analysis pipeline (rebuild data file on R/Python pipeline run) | 4 days |

These are **not** in the v2.0 scope. They exist here only to be ready to answer if a judge asks "how would you extend this?"

---

## 18. Implementation order — five days from this PRD

The schedule assumes one full-time developer with the v1.0 codebase already in front of them.

| Day | Focus | Output |
|---|---|---|
| **Day 1** | Diagnostic + Sectoral + Compare screens | 3 new screens visible in nav |
| **Day 2** | Stress upgrade (elasticity slider, capital tile) + Cedent upgrade (real presets, energy-mix, save profile) | The wow moment is rehearsable |
| **Day 3** | Brief + Evidence screens + Evidence modal everywhere | Trace-back layer complete |
| **Day 4** | QR install + Story refresh + accessibility pass + Lighthouse CI | Production-grade |
| **Day 5** | Deploy to Vercel + 3× demo rehearsal + bug-bash | Grand Final ready |

If the team has less than five days, ship the screens in this order: **Diagnostic → Stress upgrade → Cedent upgrade → Sectoral → Brief → QR install → everything else**. The first four are 80% of the bonus-criterion uplift.

---

## 19. Why this is a winning PRD

1. **Engineers a memorable moment.** The 5-second elasticity-slider drag on Stress is the screenshot the judges will remember.
2. **Goes beyond the brief.** The brief asks for "interactive app + policy linkage + executive readiness". v2.0 delivers all three explicitly: Evidence (policy linkage), Brief (executive readiness), Stress + Cedent + Diagnostic (interactive).
3. **Trace-back as moat.** Tap any number → see source. No competing team will have this.
4. **Judge takes it home.** The QR install path means your story stays on a judge's phone overnight.
5. **Scripted demo.** 90 seconds choreographed to the second; no on-stage improvisation.
6. **Real cedents.** PVI, Bao Viet, Bao Minh, PJICO, MIC presets — operational signal, not academic.
7. **Eleven screens, no slower than six.** Bundle target tighter than v1.0.

---

*Cross-references: `01_report.md` (full report), `09_hannover_re_executive_memo.md` (memo template Brief screen mirrors), `06_policy_crosswalk.md` (Evidence policy index), `10_vn_cedent_targets.md` (real cedent presets), `key_numbers_python.json` (numerical source of truth).*

*Status: Implementation spec — execute in order described in §18. Ready for Grand Final on 6 June 2026.*
