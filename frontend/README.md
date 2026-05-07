# PRISM — SEA Climate Risk PWA

*Portfolio Risk via Identified Scenario Modeling*

Mobile-first React PWA that walks a user through the MASA Hackathon 2026
submission's analytical journey:

1. **Story** — the headline (USD 135 m loss-ratio swing on the notional USD 1.2 bn SEA portfolio)
2. **Model** — STIRPAT drivers + 2024 hold-out forecast leaderboard (XGBoost 2.18 % MAPE)
3. **Hot Spots** — Vietnam vs Philippines on real EM-DAT 2018-2023 + ND-GAIN 2023
4. **Stress** — pick an NGFS Phase V scenario; loss ratio and expected loss re-price live
5. **Cedent** — pick country + sector mix → composite tier + premium loading

Numbers are sourced from `exhibits/results/key_numbers.json` and
`data/external/external_features_sea.csv` at the repo root, ported into
`src/data/keyNumbers.ts` and `src/data/cedent.ts`.

## Stack

- **Vite 7** + **React 19** + **TypeScript**
- **Tailwind CSS** for mobile-first styling
- **react-router-dom** with hash routing (works under any static host sub-path)
- **Recharts** for inline charts
- **vite-plugin-pwa** + **Workbox** for service-worker, manifest, offline shell
- All dependencies pinned in `package.json`

## Local development

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173 (auto-binds to LAN)
```

To preview the production build (with the service worker active):

```bash
npm run build
npm run preview      # http://localhost:4173
```

## Installing as a PWA on a phone

The PWA is installable from any HTTPS origin (or `http://localhost`).
Two practical paths during the hackathon:

### Option A — share over LAN (fastest)

1. `npm run dev`. Vite prints both a `Local:` and a `Network:` URL — copy the Network one.
2. On the phone (same Wi-Fi), open the Network URL in **Safari (iOS)** or **Chrome (Android)**.
3. Tap **Share → Add to Home Screen** (iOS) or the install prompt that appears in Chrome's URL bar.
4. The app opens in fullscreen, with its own icon and offline cache.

> iOS requires HTTPS for full PWA features (offline). Over plain HTTP/LAN the app still works but the service worker may be skipped — fine for a demo.

### Option B — host the static build

```bash
npm run build
# Push the contents of frontend/dist/ to any static host, e.g.:
#   - GitHub Pages         (vite base = './' is already set)
#   - Vercel/Netlify drag-drop
#   - `npx serve dist`     (then expose via ngrok for HTTPS)
```

Then visit the hosted URL on the phone and **Add to Home Screen**.

## Project layout

```
frontend/
├── public/
│   ├── favicon.svg
│   ├── pwa-192.png  pwa-512.png  pwa-512-maskable.png  apple-touch-icon.png
├── src/
│   ├── components/      # Layout, BottomNav, Card, StatBig
│   ├── data/            # keyNumbers.ts (headline figures), cedent.ts (tier logic)
│   ├── screens/         # Story, Model, HotSpots, Stress, Cedent, Actions
│   ├── App.tsx          # HashRouter
│   └── main.tsx         # SW registration
├── vite.config.ts       # PWA manifest + Workbox config
└── tailwind.config.js
```

## Updating numbers

If the analytical pipeline changes (`analysis/R/analysis.Rmd` or
`analysis/python/analysis.ipynb`), the headline figures are regenerated in
`exhibits/results/key_numbers.json`. **Mirror those changes in
`src/data/keyNumbers.ts`** to keep the app aligned. The same applies to
EM-DAT and ND-GAIN values in `data/external/external_features_sea.csv`.

Per the repo's numerical-consistency invariant (see top-level `CLAUDE.md`),
the deliverables, JSON exhibits, and this app should always tell the same
story.
