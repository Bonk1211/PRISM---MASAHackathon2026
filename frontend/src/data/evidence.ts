// Evidence index — every number in the PWA → its source paragraph in the report.
// Manually curated; consumed by EvidenceModal and the Evidence screen.

export type EvidenceEntry = {
  id: string;
  label: string;       // human-friendly tag — e.g. "USD 135 m loss swing"
  value: string;       // formatted display value
  source: string;      // primary source — report section / external citation
  paragraph: string;   // the exact prose from the report or source
  category: 'headline' | 'model' | 'stress' | 'cedent' | 'sectoral' | 'partial' | 'market' | 'policy';
  policyId?: string;
  reportSection?: string;
};

export const EVIDENCE: EvidenceEntry[] = [
  {
    id: 'loss-swing',
    label: 'USD 135 m loss swing',
    value: 'USD 135 m',
    source: 'key_numbers_python.json → headline.loss_swing_usdm',
    reportSection: '01_report.md §6 — 2030 Scenario Stress',
    paragraph:
      'On a USD 1.2 bn notional GWP book at base loss ratio 0.62 with elasticity ε = 0.7 (Swiss Re sigma 1/2024), the gap between the Net Zero 2050 and Hot House World pathway in 2030 is USD 135 m of expected loss — an 11.25 pp loss-ratio swing.',
    category: 'headline',
  },
  {
    id: 'lr-swing',
    label: '11 pp loss-ratio swing',
    value: '+11 pp',
    source: 'key_numbers_python.json → headline.lr_swing_pp',
    reportSection: '01_report.md §6.3',
    paragraph: 'Hot House 62.0 % loss ratio − Net Zero 50.7 % loss ratio = +11.25 pp swing under elasticity 0.7.',
    category: 'headline',
  },
  {
    id: 'mape-xgb',
    label: 'XGBoost 2024 MAPE',
    value: '2.43 %',
    source: 'key_numbers_python.json → mape_summary.XGBoost_M3a',
    reportSection: '01_report.md §4 — Forecast Leaderboard',
    paragraph:
      'M3a panel XGBoost with lag-1 / lag-2 GHG features achieves 2.43 % mean absolute percentage error on the 2024 hold-out across 10 SEA economies. M3b (no lags) is the structural-attribution variant at 9.67 % MAPE.',
    category: 'model',
  },
  {
    id: 'vn-power-residual',
    label: 'Vietnam Power +280 %',
    value: '+280 %',
    source: 'cedent.ts → SECTOR_RESIDUAL_PCT.Vietnam.Power Industry',
    reportSection: '01_report.md §3.4 — Sectoral STIRPAT',
    policyId: 'ngfs-phaseV',
    paragraph:
      'Vietnam Power Industry emits 280 % above the level implied by its scale-controlled STIRPAT regression. This is the single largest sectoral residual in the panel and explains why a Power-heavy VN cedent carries a 13 pp LR swing on its book.',
    category: 'sectoral',
  },
  {
    id: 'lao-power-residual',
    label: 'Lao PDR Power +781 %',
    value: '+781 %',
    source: 'cedent.ts → SECTOR_RESIDUAL_PCT.Lao PDR.Power Industry',
    reportSection: '01_report.md §3.4',
    paragraph:
      'Lao PDR Power Industry residual: +781 %. Driven by the export-led hydro/thermal build-out for cross-border sale to Vietnam and Thailand grids — emissions sit at the producer, not the consumer.',
    category: 'sectoral',
  },
  {
    id: 'brn-fugitive',
    label: 'Brunei Fugitive +4,205 %',
    value: '+4,205 %',
    source: 'cedent.ts → SECTOR_RESIDUAL_PCT.Brunei Darussalam.Fugitive Energy',
    reportSection: '01_report.md §3.4',
    paragraph:
      'Brunei fugitive-energy emissions sit 4,205 % over the scale-implied level — petroleum-state structural feature, not an underwriting signal.',
    category: 'sectoral',
  },
  {
    id: 'sign-flip-forest',
    label: 'Forest area sign-flip',
    value: '−0.466 → +0.564',
    source: 'key_numbers_python.json → partial_correlations[forest_area_pct]',
    reportSection: '01_report.md §3.2 — Partial Correlations',
    paragraph:
      'Pairwise r between forest cover and emissions is −0.466 (more forest → lower emissions, naïve view). Once log-GDP and log-population are partialled out, partial r = +0.564. Interpretation: forest-rich SEA economies actually emit MORE than scale predicts — the LULUCF channel is hidden by pairwise correlation.',
    category: 'partial',
  },
  {
    id: 'sign-flip-industry',
    label: 'Industry % GDP sign-flip',
    value: '−0.148 → +0.440',
    source: 'key_numbers_python.json → partial_correlations[industry_pct_GDP]',
    reportSection: '01_report.md §3.2',
    paragraph:
      'Industry share of GDP shows a weak negative pairwise correlation with emissions (−0.148). Partialling out scale flips the sign to +0.440 — industry-heavy economies emit more per unit of scale, as expected.',
    category: 'partial',
  },
  {
    id: 'sign-flip-energy',
    label: 'Energy/cap sign-flip',
    value: '−0.484 → +0.456',
    source: 'key_numbers_python.json → partial_correlations[energy_use_pc]',
    reportSection: '01_report.md §3.2',
    paragraph:
      'Energy use per capita: pairwise −0.484, partial +0.456. Sign-flip explained by Singapore (low intensity, high emissions per scale) confounding the unconditional view.',
    category: 'partial',
  },
  {
    id: 'vn-protection-gap',
    label: 'Vietnam protection gap 92 %',
    value: '92 %',
    source: 'Swiss Re sigma 1/2024 Box 4',
    policyId: 'sigma-1-2024',
    reportSection: '04_vietnam_vs_philippines_deep_dive.md §3',
    paragraph:
      '92 % of Vietnam\'s economic loss from natural catastrophes 2018-23 was uninsured (Swiss Re sigma 1/2024 SEA panel). Compares to 85 % for the Philippines.',
    category: 'market',
  },
  {
    id: 'capital-buffer-8',
    label: '+8 % capital buffer',
    value: '+8 %',
    source: 'BNM CRST 2024 §6.3',
    policyId: 'bnm-crst-2024',
    reportSection: '01_report.md §7 — Recommendations',
    paragraph:
      'BNM CRST 2024 §6.3 sets the indicative additional risk-capital buffer at +8 % under the Hot House World pathway for SEA reinsurance portfolios with Power-heavy retentions.',
    category: 'policy',
  },
  {
    id: 'gwp-1200',
    label: 'GWP USD 1.2 bn',
    value: 'USD 1.2 bn',
    source: 'key_numbers_python.json → headline.gwp_usdm',
    reportSection: '01_report.md §6.1',
    paragraph: 'Notional gross written premium for the SEA portfolio used in this analysis: USD 1,200 m. Replace with cedent-supplied book figure in production.',
    category: 'headline',
  },
  {
    id: 'elasticity-07',
    label: 'Elasticity ε = 0.7',
    value: '0.7',
    source: 'Swiss Re sigma 1/2024',
    policyId: 'sigma-1-2024',
    reportSection: '01_report.md §6.2',
    paragraph: 'Loss-ratio elasticity to Δ-emissions parameterised at 0.7, with sensitivity range 0.3–1.2 per Swiss Re sigma 1/2024 Box 4 SEA peril mix.',
    category: 'stress',
  },
];

export const EVIDENCE_BY_ID = Object.fromEntries(EVIDENCE.map((e) => [e.id, e]));
