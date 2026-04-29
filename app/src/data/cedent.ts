// Cedent screening framework — mirrors deliverables/05_cedent_screening_framework.md.
// Country tier from STIRPAT residual; sector tier from weighted residuals;
// adaptive tier from ND-GAIN composite (preferred) with GDP-per-capita fallback.

export type Tier = 'A' | 'B' | 'C' | 'D' | 'E';

export const COUNTRY_TIER: Record<string, { tier: Tier; residualPct: number }> = {
  Singapore:        { tier: 'A', residualPct: -12 },
  Philippines:      { tier: 'A', residualPct: -49 },
  Indonesia:        { tier: 'B', residualPct: -19 },
  Thailand:         { tier: 'B', residualPct:   3 },
  Cambodia:         { tier: 'C', residualPct:  13 },
  Vietnam:          { tier: 'C', residualPct:  24 },
  Malaysia:         { tier: 'D', residualPct:  32 },
  'Lao PDR':        { tier: 'D', residualPct:  93 },
  Myanmar:          { tier: 'D', residualPct:  47 },
  'Brunei Darussalam': { tier: 'E', residualPct: 287 },
};

// Sector residuals as % over STIRPAT-implied — used to compute sector tier from cedent's mix.
export const SECTOR_RESIDUAL_PCT: Record<string, Record<string, number>> = {
  Vietnam:    { 'Power Industry': 280, 'Industrial Combustion': 276, 'Industrial Processes': 147, Transport: 8, Agriculture: -5, Waste: -9, Buildings: 12, 'Fugitive Energy': 24 },
  Indonesia:  { 'Power Industry': 77,  'Industrial Combustion': 65,  'Industrial Processes': 30,  Transport: 5, Agriculture: -10, Waste: -8, Buildings: 6, 'Fugitive Energy': 83 },
  Thailand:   { 'Power Industry': 30,  'Industrial Combustion': 90,  'Industrial Processes': 155, Transport: 66, Agriculture: -12, Waste: -5, Buildings: 4, 'Fugitive Energy': 45 },
  Philippines:{ 'Power Industry': 66,  'Industrial Combustion': -8,  'Industrial Processes': -12, Transport: 5, Agriculture: -2, Waste: 3, Buildings: -4, 'Fugitive Energy': -5 },
  Malaysia:   { 'Power Industry': 172, 'Industrial Combustion': 78,  'Industrial Processes': 35,  Transport: 12, Agriculture: -7, Waste: 0, Buildings: 8, 'Fugitive Energy': 154 },
  Singapore:  { 'Power Industry': -25, 'Industrial Combustion': -15, 'Industrial Processes': 255, Transport: -20, Agriculture: -50, Waste: -10, Buildings: -18, 'Fugitive Energy': -10 },
  Cambodia:   { 'Power Industry': 25,  'Industrial Combustion': -10, 'Industrial Processes': 122, Transport: 4, Agriculture: 146, Waste: 5, Buildings: 0, 'Fugitive Energy': -5 },
  Myanmar:    { 'Power Industry': 28,  'Industrial Combustion': -5,  'Industrial Processes': -8,  Transport: 0, Agriculture: 110, Waste: 8, Buildings: 0, 'Fugitive Energy': 12 },
  'Lao PDR':  { 'Power Industry': 781, 'Industrial Combustion': 60,  'Industrial Processes': 420, Transport: -5, Agriculture: 189, Waste: -2, Buildings: 5, 'Fugitive Energy': 35 },
  'Brunei Darussalam': { 'Power Industry': 351, 'Industrial Combustion': 80, 'Industrial Processes': 60, Transport: -10, Agriculture: -50, Waste: -15, Buildings: -25, 'Fugitive Energy': 4205 },
};

export const SECTORS = [
  'Power Industry',
  'Industrial Combustion',
  'Industrial Processes',
  'Transport',
  'Agriculture',
  'Buildings',
  'Waste',
  'Fugitive Energy',
] as const;

// Sector tier from weighted residual (weighted by cedent's GWP mix per sector).
// Bands per 05_cedent_screening_framework.md §4.
export function sectorTier(weightedResidualPct: number): Tier {
  if (weightedResidualPct >= 200) return 'E';
  if (weightedResidualPct >= 100) return 'D';
  if (weightedResidualPct >= 30)  return 'C';
  if (weightedResidualPct >= -20) return 'B';
  return 'A';
}

// Adaptive tier from ND-GAIN composite (2023). Bands per 05 §7 (revised).
export function adaptiveTier(ndgain: number): Tier {
  if (ndgain >= 65) return 'A';
  if (ndgain >= 55) return 'B';
  if (ndgain >= 45) return 'C';
  if (ndgain >= 38) return 'D';
  return 'E';
}

// Composite = mode of (country, sector, adaptive) with overrides.
const ORDER: Tier[] = ['A', 'B', 'C', 'D', 'E'];

export function composite(country: Tier, sector: Tier, adapt: Tier): Tier {
  const tiers: Tier[] = [country, sector, adapt];
  // Mode
  const counts = tiers.reduce<Record<string, number>>((a, t) => ((a[t] = (a[t] ?? 0) + 1), a), {});
  let mode: Tier = ORDER.find((t) => (counts[t] ?? 0) === Math.max(...Object.values(counts))) as Tier;
  // Override 1: Sector D/E forces composite ≥ D
  if (sector === 'D' || sector === 'E') {
    if (ORDER.indexOf(mode) < ORDER.indexOf('D')) mode = 'D';
  }
  return mode;
}

// Premium loading vs reference rate (per §8 of cedent framework)
export const LOADING: Record<Tier, { pct: number; label: string }> = {
  A: { pct: -5, label: 'Discount; preferred renewal' },
  B: { pct:  0, label: 'Standard treaty terms' },
  C: { pct:  8, label: 'Annual climate disclosure clause' },
  D: { pct: 22, label: 'Climate-MDD covenant; mid-term review' },
  E: { pct: 45, label: 'Bespoke wording or facultative-only' },
};
