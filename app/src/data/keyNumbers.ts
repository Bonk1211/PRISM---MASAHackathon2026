// Single source of truth for headline numbers shown in the app.
// Mirrors values in `exhibits/results/key_numbers.json` and the figures quoted
// in `deliverables/01_report.md`. Update both together when re-running pipelines.

export const PORTFOLIO = {
  gwpUsdM: 1200,        // notional Hannover Re SEA portfolio (USD m)
  baseLossRatio: 0.62,  // current expected loss ratio
  elasticity: 0.7,      // loss-to-emissions elasticity, Swiss Re sigma 1/2024
};

export const MAPE = {
  log_linear: 9.23,
  ARIMA: 2.67,
  XGBoost: 2.18,
};

// Selected from key_numbers.json (per-country XGBoost forecast vs actual 2024)
export const FORECAST_2024 = [
  { country: 'Indonesia',  pred: 1310.4, actual: 1323.78, errPct: -1.01 },
  { country: 'Vietnam',    pred:  581.4, actual:  584.26, errPct: -0.49 },
  { country: 'Thailand',   pred:  421.8, actual:  422.39, errPct: -0.14 },
  { country: 'Malaysia',   pred:  335.1, actual:  332.17, errPct:  0.88 },
  { country: 'Philippines', pred: 269.5, actual:  266.60, errPct:  1.09 },
  { country: 'Myanmar',    pred:  122.8, actual:  117.79, errPct:  4.25 },
  { country: 'Singapore',  pred:   75.4, actual:   76.09, errPct: -0.91 },
  { country: 'Cambodia',   pred:   50.2, actual:   49.83, errPct:  0.74 },
  { country: 'Lao PDR',    pred:   42.0, actual:   41.55, errPct:  1.08 },
  { country: 'Brunei Darussalam', pred: 11.7, actual: 11.87, errPct: -1.43 },
];

export const DRIVERS = [
  { feature: 'Population (log)',   gain: 0.54, kind: 'scale' },
  { feature: 'GDP (log)',          gain: 0.31, kind: 'scale' },
  { feature: 'CO₂ intensity / GDP', gain: 0.06, kind: 'tech' },
  { feature: 'Industry % GDP',     gain: 0.04, kind: 'tech' },
  { feature: 'Renewable energy %', gain: 0.03, kind: 'tech' },
  { feature: 'Forest area %',      gain: 0.02, kind: 'land' },
];

// EM-DAT Country Profiles (HDX snapshot 2026-04-24), 2018–2023, ISO3 = VNM/PHL.
export const EMDAT_VN_PH = {
  vietnam: {
    events: 48,
    perYear: 8.0,
    storms: 26,
    floods: 21,
    other: 1,
    affectedM: 4.5,
    deaths: 620,
    damageUsdBn2024: 2.30,
  },
  philippines: {
    events: 75,
    perYear: 12.5,
    storms: 41,
    floods: 13,
    other: 21, // earthquakes + volcanic + mass movement + drought
    affectedM: 54.5,
    deaths: 2008,
    damageUsdBn2024: 4.81,
  },
  insuredShareSigma: 0.12, // Swiss Re sigma 1/2024 SEA benchmark
};

// ND-GAIN Country Index 2026 release, 2023 latest values
export const NDGAIN_2023 = [
  { country: 'Singapore',         iso3: 'SGP', gain: 70.6, vuln: 0.389, ready: 0.800 },
  { country: 'Malaysia',          iso3: 'MYS', gain: 56.9, vuln: 0.367, ready: 0.506 },
  { country: 'Brunei Darussalam', iso3: 'BRN', gain: 56.7, vuln: 0.404, ready: 0.538 },
  { country: 'Thailand',          iso3: 'THA', gain: 52.7, vuln: 0.435, ready: 0.489 },
  { country: 'Indonesia',         iso3: 'IDN', gain: 48.4, vuln: 0.430, ready: 0.398 },
  { country: 'Vietnam',           iso3: 'VNM', gain: 48.1, vuln: 0.468, ready: 0.429 },
  { country: 'Philippines',       iso3: 'PHL', gain: 45.6, vuln: 0.444, ready: 0.356 },
  { country: 'Lao PDR',           iso3: 'LAO', gain: 42.5, vuln: 0.486, ready: 0.336 },
  { country: 'Cambodia',          iso3: 'KHM', gain: 40.5, vuln: 0.481, ready: 0.292 },
  { country: 'Myanmar',           iso3: 'MMR', gain: 36.9, vuln: 0.514, ready: 0.252 },
];

// 2030 stress test outcome computed in 01_report.md §6.2.
export const STRESS_2030 = [
  { scenario: 'Net Zero 2050',     family: 'Orderly',          growth: -0.025, emissionsMt: 2772, lr: 0.507, lossUsdM: 609 },
  { scenario: 'Mitigation',        family: 'Client-specific',  growth: -0.010, emissionsMt: 3038, lr: 0.538, lossUsdM: 646 },
  { scenario: 'Delayed Transition', family: 'Disorderly',       growth:  0.010, emissionsMt: 3425, lr: 0.583, lossUsdM: 700 },
  { scenario: 'Current Policies',  family: 'Hot House World',  growth:  0.025, emissionsMt: 3742, lr: 0.620, lossUsdM: 744 },
];

export const HEADLINE = {
  lossSwingUsdM: 135,        // 744 - 609
  lrSwingPp: 11,             // 62 - 51
  mapeXGBPct: 2.18,
  vnVsPhGhgGrowthMultiple: 5,
};

export const RECOMMENDATIONS = [
  {
    id: 'parametric',
    title: 'SEA Parametric Typhoon Product',
    detail: 'Trigger: Saffir-Simpson Cat-3+ landfall in PH/VN/S-China coast. Target: top-5 primary insurers in PH and VN.',
    target: 'TAM ≈ USD 280 m premium by 2028',
    icon: '🌀',
  },
  {
    id: 'esg-screen',
    title: 'ESG-Linked Underwriting Screen',
    detail: 'Cedents with credible NDC-aligned transition plans receive 5–10 % premium discount. Aligned with Paris Article 2.1(c).',
    target: '+2 pp loss-ratio improvement at full adoption',
    icon: '🎯',
  },
  {
    id: 'cat-bond',
    title: 'Cat Bond Issuance — 2027 Window',
    detail: 'USD 250 m SEA multi-peril bond, timed to NGFS Disorderly Transition spread-widening window. Solvency II Art. 309 capital relief.',
    target: 'Lock spreads 12–18 months pre-repricing',
    icon: '📈',
  },
  {
    id: 'capital-buffer',
    title: 'Capital Buffer +8 %',
    detail: 'Hold an additional 8 % regional risk-capital buffer under Hot House scenario. Per BNM CRST 2024 §6.3.',
    target: 'Regulator-aligned',
    icon: '🛡️',
  },
];
