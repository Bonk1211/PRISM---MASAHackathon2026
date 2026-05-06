# Product Requirements Document — PRISM SEA Climate Risk PWA

**Version** 1.0 · **Date** 2026-05-02 · **Owner** PRISM team · **Status** Built, ready for demo

## 1. Background & Problem

MASA Hackathon 2026 brief asks teams to convert World Bank WDI data into actionable insight for **Hannover Re**'s SEA reinsurance book. The analytical pipeline (R Markdown + Python notebook + Shiny app) produces 13 figures, 5 deliverables, and a USD 135 m loss-ratio finding — but judges read PDFs and laptop dashboards. **A reinsurance underwriter on a phone has no entry point.**

The PWA closes that gap: a 5-screen mobile journey that lets a non-technical viewer (CRO, broker, judge) walk through the same story the report tells, with live re-pricing.

## 2. Goals

| Goal | Metric |
|------|--------|
| Single-thumb demo on a phone | All flows reachable in ≤ 2 taps from any screen |
| Numerical fidelity to report | Every headline figure traces to `exhibits/results/key_numbers.json` |
| Offline + installable | PWA passes Lighthouse install criteria; works from Home Screen |
| Demo-grade speed | First paint < 1 s on mid-tier phone; bundle ≤ 250 KB gzip |
| Re-pricing interaction | Stress + Cedent screens recompute < 100 ms per input change |

## 3. Non-Goals

- Real-time data ingestion (numbers are baked in at build time).
- Authentication, multi-user state, server backend.
- Editing the underlying analytical model.
- Native iOS/Android app store distribution.

## 4. Users & Personas

| Persona | Need | Screen weight |
|---------|------|---------------|
| **Hackathon judge** | 90-second skim of the story | Story, Stress |
| **Reinsurance underwriter (Hannover Re)** | Quick read on cedent-screening logic | Cedent, Hot Spots |
| **Insurance regulator (BNM, OJK)** | Verify NGFS scenario stress link | Stress, Actions |
| **Internal team** | Show 1-tap from any presentation slide | All 6 |

## 5. User Journey

```
Story (headline) → Model (drivers + accuracy) → Hot Spots (VN vs PH)
   → Stress (NGFS scenario picker) → Cedent (composite tier) → Actions
```

Each screen ends with implicit context for the next. Bottom-nav lets the viewer jump non-linearly.

## 6. Functional Requirements

### 6.1 Story screen (`/`)
- Headline tile: USD 135 m loss-ratio swing.
- 3 stat tiles: portfolio GWP (USD 1.2 bn), base loss ratio (62 %), elasticity (0.7).
- Journey overview list linking to remaining 4 screens.
- CTA → Actions screen.

### 6.2 Model screen (`/model`)
- Horizontal bar of XGBoost feature gain (DRIVERS dataset, kind-coloured: scale/tech/land).
- 3 MAPE tiles: XGBoost 2.18 %, ARIMA 2.67 %, log-linear 9.23 %.
- Grouped bar: 2024 actual vs predicted, 10 SEA countries.
- Side note explaining M3a vs M3b dual specification.

### 6.3 Hot Spots screen (`/hotspots`)
- VN ↔ PH segmented toggle.
- EM-DAT 2018-23 metrics: events, storms/floods/other split, affected, deaths, damage USD bn (2024-CPI), implied insured loss/yr at sigma 12 %.
- ND-GAIN 2023 ranking — horizontal bar, 10 SEA countries, VN red / PH teal.
- Strategic-read card explaining VN commercial opportunity.

### 6.4 Stress screen (`/stress`)
- 4 NGFS Phase V scenario buttons (Net Zero 2050, Mitigation, Delayed Transition, Current Policies).
- Live recompute on tap:
  - 2030 loss ratio (% with 1 dp)
  - Expected loss (USD m)
  - Δ vs Hot House (USD m + pp loss-ratio swing)
- Bar chart of 2030 expected loss by scenario; selected scenario at full opacity, others dimmed.
- Translation-to-capital card linking to BNM CRST 2024 §6.3 +8 % buffer recommendation.

### 6.5 Cedent screen (`/cedent`)
- Country chip strip (10 SEA countries).
- 4 GWP-mix presets (Power-heavy, Diversified, Manufacturing-led, Agri-led).
- 8 sector sliders (Power, Industrial Combustion, Transport, Buildings, Agriculture, Industrial Processes, Waste, Other).
- "Normalise to 100 %" button.
- NDC alignment checkbox (downgrades A/B → C if unchecked, per §5).
- Composite tier display: A–E letter, country/sector/adaptive sub-tiers, weighted residual %, premium loading %.

### 6.6 Actions screen (`/actions`)
- 4 recommendation cards from RECOMMENDATIONS dataset:
  1. Roll out cedent screening framework
  2. Loss-ratio stress test as standing exhibit
  3. Vietnam catastrophe-bond programme
  4. Adaptive-capacity-linked premium discount

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Mobile-first** | Designed for 375 px viewport; max-width 480 px |
| **Safe areas** | Respects notches/home indicator (iOS `env(safe-area-inset-*)`) |
| **Touch targets** | ≥ 44 × 44 px |
| **Offline** | Service worker pre-caches index, JS, CSS, icons; runtime cache for images |
| **Install** | Web App Manifest with 192/512/512-maskable icons + Apple touch icon |
| **Browsers** | Safari iOS 16+, Chrome Android 10+, evergreen desktop |
| **Accessibility** | Semantic HTML, contrast ≥ 4.5:1 on body text, label associations on all inputs |
| **Performance** | LCP < 1 s on iPhone 13 over WiFi; bundle ≤ 250 KB gzip (current: 191 KB) |
| **Build** | `npm run build` < 30 s; `npm run preview` reproducible |

## 8. Data Model

Single source of truth: `app/src/data/keyNumbers.ts` and `app/src/data/cedent.ts`. Both ported by hand from `exhibits/results/key_numbers.json` and `data/external/external_features_sea.csv`. Per CLAUDE.md numerical-consistency invariant, any analytical change triggers a re-port.

| Constant | Source | Used by |
|----------|--------|---------|
| `PORTFOLIO` | report §6 | Story, Stress |
| `MAPE` | `key_numbers.json` | Model |
| `FORECAST_2024` | XGBoost M3a hold-out | Model |
| `DRIVERS` | XGBoost M3b feature gain | Model |
| `EMDAT_VN_PH` | `external_features_sea.csv` | Hot Spots |
| `NDGAIN_2023` | `external_features_sea.csv` | Hot Spots, Cedent |
| `STRESS_2030` | NGFS Phase V × elasticity | Stress |
| `COUNTRY_TIER`, `SECTOR_RESIDUAL_PCT`, `LOADING` | `05_cedent_screening_framework.md` | Cedent |
| `RECOMMENDATIONS` | `01_report.md` §7 | Actions |

## 9. Tech Stack

- **Vite 7** + **React 19** + **TypeScript 5.6**
- **Tailwind CSS 3.4** mobile-first
- **react-router-dom 7** with HashRouter (sub-path agnostic for static hosts)
- **Recharts 3.8** for charts
- **vite-plugin-pwa 1.2** + **Workbox 7** for service worker / manifest
- **PIL/Pillow** offline pipeline for icon rasterisation

## 10. Architecture

```
app/
├── public/                    icons + favicon (5 files)
├── src/
│   ├── App.tsx                HashRouter w/ 6 routes
│   ├── main.tsx               registerSW({ immediate: true })
│   ├── components/            Layout, BottomNav, Card, StatBig
│   ├── data/                  keyNumbers.ts, cedent.ts
│   └── screens/               Story, Model, HotSpots, Stress, Cedent, Actions
├── vite.config.ts             VitePWA manifest + Workbox config
└── tailwind.config.js         PRISM palette
```

State is local-only via `useState` + `useMemo`. No global store needed — every screen is independently rehydratable from its data module.

## 11. Visual Design

- **Palette** ink #0B1F33 (primary), sea #0E7C86 (accent), amber #E5A23E (warn), rust #C0392B (alert), sage #5DAE8B (favourable), sand #F4F1EA (surface).
- **Typography** Tailwind defaults, `text-[11px]` to `text-7xl` scale.
- **Card system** rounded-2xl, ink/sand/paper tones, soft shadow.
- **Charts** axis lines off, fontSize 9–10 px, no gridlines, single accent colour per series.

## 12. Acceptance Criteria

- [x] All 5 numbered screens reachable from bottom nav.
- [x] Stress recompute updates LR, expected loss, Δ within 100 ms.
- [x] Cedent composite tier and loading update on country / mix / NDC change.
- [x] `npm run build` exits 0; SW + manifest + 4 icons emitted.
- [x] `npm run preview` returns 200 on `/`.
- [x] Bundle ≤ 250 KB gzip (191 KB).
- [x] PWA installable on iOS Safari and Chrome Android (manifest + SW present).
- [x] Headline numbers match `key_numbers.json` to 4 dp.

## 13. Distribution

Two demo paths:
- **A — LAN.** `npm run dev`, scan Network URL on phone, Add to Home Screen.
- **B — Static host.** `npm run build`, deploy `app/dist/` to GitHub Pages / Vercel / Netlify; share HTTPS URL.

iOS requires HTTPS for full PWA features (offline). Plain LAN HTTP works for in-room demo with limited service-worker.

## 14. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Numbers drift from analytical pipeline | CLAUDE.md numerical-consistency invariant; data files thin and clearly sourced |
| Service worker cached stale build at demo | `registerSW({ immediate: true })` + Workbox `clientsClaim` |
| Phone offline at venue | PWA pre-caches all 10 entries (618 KiB) — works fully offline |
| Vite/PWA peer-dep churn | All deps pinned in `package.json` |
| Recharts + React 19 type drift | Tooltip formatters use untyped `(v) => ...` + `Number(v)` cast |

## 15. Out-of-Scope / Future Work

- Live API into `key_numbers.json` (rebuild data file on R/Python pipeline run).
- Country-level deep-dive screens beyond VN/PH.
- Multi-language (BM, VN, ID).
- White-label theming for cedent self-screening tool.
- IndexedDB persistence of user-saved cedent profiles.

## 16. Timeline

| Stage | Status |
|-------|--------|
| Scaffold (Vite + Tailwind + PWA) | Done |
| 6 screens + data ports | Done |
| Build green + smoke test | Done |
| README + install guide | Done |
| **Demo-ready for 7 May 2026 deadline** | Done |
| Grand Final 6 Jun 2026 polish | Pending |
