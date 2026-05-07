// Policy crosswalk — eight instruments from deliverables/06_policy_crosswalk.md.
// Used by Actions (anchor each rec to one) and Evidence (browse by policy).

export type PolicyRef = {
  id: string;
  short: string;
  full: string;
  jurisdiction: 'Global' | 'EU' | 'Malaysia' | 'Vietnam' | 'Indonesia' | 'Singapore';
  cite: string;
  relevance: string;
};

export const POLICY_REFS: PolicyRef[] = [
  {
    id: 'paris-2-1c',
    short: 'Paris 2.1(c)',
    full: 'Paris Agreement Article 2.1(c)',
    jurisdiction: 'Global',
    cite: 'UNFCCC 2015',
    relevance: 'Aligns financial flows with low-emission, climate-resilient pathways. Anchors ESG-screened underwriting.',
  },
  {
    id: 'bnm-crst-2024',
    short: 'BNM CRST 2024',
    full: 'BNM Climate Risk Stress Test 2024',
    jurisdiction: 'Malaysia',
    cite: 'BNM CRST 2024 §6.3',
    relevance: 'Sets capital-buffer expectations under NGFS Hot House World. Anchors +8 % regional risk-capital recommendation.',
  },
  {
    id: 'ngfs-phaseV',
    short: 'NGFS Phase V',
    full: 'NGFS Climate Scenarios Phase V (2024)',
    jurisdiction: 'Global',
    cite: 'NGFS Phase V (Nov 2024)',
    relevance: 'Industry-standard scenario set. All four pathways used for the 2030 stress test.',
  },
  {
    id: 'sigma-1-2024',
    short: 'sigma 1/2024',
    full: 'Swiss Re sigma 1/2024',
    jurisdiction: 'Global',
    cite: 'Swiss Re Institute, Box 4',
    relevance: 'Source for SEA insurance penetration, protection-gap and elasticity (ε = 0.7) parameters.',
  },
  {
    id: 'ojk-spi',
    short: 'OJK SPI',
    full: 'OJK Sustainable Finance Roadmap II',
    jurisdiction: 'Indonesia',
    cite: 'OJK 2021–2025',
    relevance: 'Indonesian sustainable-finance taxonomy; gates ESG-linked product approval in IDX market.',
  },
  {
    id: 'mas-trm',
    short: 'MAS TRM',
    full: 'MAS Environmental Risk Management Guidelines',
    jurisdiction: 'Singapore',
    cite: 'MAS, Dec 2020',
    relevance: 'Sets governance, risk-assessment and disclosure expectations for SG insurers and reinsurers.',
  },
  {
    id: 'mof-vn-decree',
    short: 'MOF VN 21/2023',
    full: 'Vietnam MOF Decree 21/2023/ND-CP',
    jurisdiction: 'Vietnam',
    cite: 'MOF Decree 21 (May 2023)',
    relevance: 'Vietnam non-life insurance capital and reserve framework. Affects Tier-1 cedent capacity.',
  },
  {
    id: 'eu-cbam',
    short: 'EU CBAM',
    full: 'EU Carbon Border Adjustment Mechanism',
    jurisdiction: 'EU',
    cite: 'Reg. (EU) 2023/956',
    relevance: 'Embeds carbon cost into SEA exporter cash-flow risk. Indirectly tightens Power-heavy cedent loss-ratio path.',
  },
];

export const POLICY_BY_ID = Object.fromEntries(POLICY_REFS.map((p) => [p.id, p]));
