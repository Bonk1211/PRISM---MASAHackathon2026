// Real Vietnamese cedent presets — public-domain plausible book mixes derived from
// deliverables/10_vn_cedent_targets.md. Loaded on the Cedent screen as preset chips.

import type { SECTORS as SECTOR_TUPLE } from './cedent';

type Sector = (typeof SECTOR_TUPLE)[number];

export type CedentPreset = {
  id: string;
  ticker: string;     // 2-3 letter monogram, in lieu of icon
  name: string;
  fullName: string;
  country: string;
  oneLiner: string;
  ndcPlanFiled: boolean;
  energyMixPct: number;   // coal % + 0.5 × gas %, override-2 input
  mix: Partial<Record<Sector, number>>;
};

export const CEDENT_PRESETS: CedentPreset[] = [
  {
    id: 'pvi',
    ticker: 'PVI',
    name: 'PVI',
    fullName: 'PetroVietnam Insurance',
    country: 'Vietnam',
    oneLiner: 'Power-heavy book; energy state-affiliate; Hannover Re relationship cedent.',
    ndcPlanFiled: false,
    energyMixPct: 58,
    mix: { 'Power Industry': 55, 'Industrial Combustion': 22, 'Fugitive Energy': 10, Transport: 8, Buildings: 5 },
  },
  {
    id: 'baoviet',
    ticker: 'BVH',
    name: 'Bao Viet',
    fullName: 'Bao Viet Holdings (non-life)',
    country: 'Vietnam',
    oneLiner: 'Diversified non-life; largest VN cedent by GWP; growing renewables share.',
    ndcPlanFiled: true,
    energyMixPct: 42,
    mix: { 'Power Industry': 22, 'Industrial Combustion': 18, Transport: 20, Buildings: 18, Agriculture: 12, 'Industrial Processes': 10 },
  },
  {
    id: 'baominh',
    ticker: 'BMI',
    name: 'Bao Minh',
    fullName: 'Bao Minh Insurance',
    country: 'Vietnam',
    oneLiner: 'Mid-tier multi-line; SOE legacy; Power Sector retention 25 % of book.',
    ndcPlanFiled: true,
    energyMixPct: 48,
    mix: { 'Power Industry': 28, 'Industrial Combustion': 18, Transport: 20, Buildings: 14, Agriculture: 12, 'Industrial Processes': 8 },
  },
  {
    id: 'pjico',
    ticker: 'PJI',
    name: 'PJICO',
    fullName: 'Petrolimex Insurance',
    country: 'Vietnam',
    oneLiner: 'Fuel-distribution affiliate; transport-heavy; Tier-2 retention.',
    ndcPlanFiled: false,
    energyMixPct: 52,
    mix: { Transport: 38, 'Industrial Combustion': 22, 'Power Industry': 18, Buildings: 12, 'Fugitive Energy': 10 },
  },
  {
    id: 'mic',
    ticker: 'MIC',
    name: 'MIC',
    fullName: 'Military Insurance Corp.',
    country: 'Vietnam',
    oneLiner: 'Diversified industrial book; manufacturing-heavy renewals.',
    ndcPlanFiled: true,
    energyMixPct: 36,
    mix: { 'Industrial Combustion': 30, 'Industrial Processes': 25, Transport: 18, 'Power Industry': 15, Buildings: 12 },
  },
];
