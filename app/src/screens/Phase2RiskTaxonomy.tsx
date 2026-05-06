// Phase 2 — Risk Taxonomy. 3-bucket grid (Physical / Transition / Liability)
// populated from `phase_2_taxonomy` JSON. Embeds the Diagnostic screen for the
// pairwise-vs-partial sign-flip section (CLAUDE.md invariant).

import { Card, Eyebrow, Hairline } from '../components/Card';
import { PHASE_2_TAXONOMY, type RiskBucketSeverity } from '../data/keyNumbers';
import { Diagnostic } from './Diagnostic';
import { ScopeBanner } from './_phaseShell';

const SEVERITY_LABEL: Record<RiskBucketSeverity, string> = {
  H: 'High',
  M: 'Moderate',
  L: 'Low',
};
const SEVERITY_TONE: Record<RiskBucketSeverity, 'rust' | 'amber' | 'sage'> = {
  H: 'rust',
  M: 'amber',
  L: 'sage',
};
const TONE_TEXT: Record<'rust' | 'amber' | 'sage', string> = {
  rust: 'text-rust',
  amber: 'text-amber',
  sage: 'text-sage',
};

function prettify(slug: string): string {
  return slug
    .replace(/_d_and_o/g, ' (D&O)')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type Bucket = {
  key: 'physical' | 'transition' | 'liability';
  title: string;
  description: string;
  groups: { label: string; items: string[] }[];
  covered: boolean;
  severity: RiskBucketSeverity;
};

function buildBuckets(): Bucket[] {
  const t = PHASE_2_TAXONOMY;
  return [
    {
      key: 'physical',
      title: 'Physical',
      description:
        'Hazards arising from a changing climate — acute shocks (storms, floods, heatwaves) and chronic shifts (sea-level rise, precipitation patterns).',
      groups: [
        { label: 'Acute', items: t.physical.acute },
        { label: 'Chronic', items: t.physical.chronic },
      ],
      covered: t.physical.covered,
      severity: t.physical.severity,
    },
    {
      key: 'transition',
      title: 'Transition',
      description:
        'Policy, technology, and market shifts as the global economy decarbonises — repriced over portfolios via NGFS scenario perturbation.',
      groups: [{ label: 'Drivers', items: t.transition.drivers }],
      covered: t.transition.covered,
      severity: t.transition.severity,
    },
    {
      key: 'liability',
      title: 'Liability',
      description:
        'Climate-related litigation against directors, officers, and insurers — out of scope for this engagement; flagged for a future phase.',
      groups: [{ label: 'Drivers', items: t.liability.drivers }],
      covered: t.liability.covered,
      severity: t.liability.severity,
    },
  ];
}

export function Phase2RiskTaxonomy() {
  const buckets = buildBuckets();

  return (
    <div className="space-y-6">
      <ScopeBanner />

      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Phase 2 · Engagement</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Risk taxonomy.
          <span className="display tab-num text-amber italic"> Three </span>
          buckets, two in scope.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink lg:text-[16px] lg:max-w-prose">
          A consulting engagement starts by naming the risk surface. Physical and
          transition are quantified end-to-end in this build; liability is named,
          rated, and parked.
        </p>
      </section>

      {/* 3-bucket grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {buckets.map((b) => (
          <BucketCard key={b.key} bucket={b} />
        ))}
      </div>

      {/* Embedded diagnostic — sign-flip story (CLAUDE.md invariant) */}
      <section className="border-t-2 border-ink pt-6">
        <Eyebrow>Phase 2 diagnostic · pairwise vs partial</Eyebrow>
        <p className="mt-2 font-serif italic text-[13px] leading-relaxed text-ink lg:text-[14px] lg:max-w-prose">
          Three indicators flip sign once log-GDP and log-population are
          partialled out. This diagnostic is reported alongside the taxonomy
          rather than collapsed away — see report §3.2.
        </p>
        <div className="mt-5">
          <Diagnostic />
        </div>
      </section>
    </div>
  );
}

function BucketCard({ bucket }: { bucket: Bucket }) {
  const tone = SEVERITY_TONE[bucket.severity];
  return (
    <Card
      tone={bucket.covered ? 'paper' : 'sand'}
      className="flex h-full flex-col"
    >
      <div className="flex items-baseline justify-between">
        <Eyebrow>Bucket</Eyebrow>
        <span
          className={[
            'border px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-eyebrow',
            bucket.covered
              ? 'border-sage/40 bg-sage/10 text-sage'
              : 'border-rule bg-paper text-muted',
          ].join(' ')}
        >
          {bucket.covered ? 'In scope' : 'Out of scope'}
        </span>
      </div>
      <h2 className="display mt-2 text-[28px] leading-[1.05] text-ink">
        {bucket.title}
      </h2>
      <p className="mt-2 text-[12px] leading-snug text-muted">{bucket.description}</p>

      <Hairline className="mt-4" />
      <div className="mt-3 flex items-baseline justify-between">
        <Eyebrow>Severity</Eyebrow>
        <span className={['display tab-num text-[20px] italic', TONE_TEXT[tone]].join(' ')}>
          {SEVERITY_LABEL[bucket.severity]}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {bucket.groups.map((g) => (
          <div key={g.label}>
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              {g.label} · {g.items.length}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {g.items.map((item) => (
                <li
                  key={item}
                  className="border border-rule bg-paper/60 px-2 py-1 text-[11px] text-ink"
                >
                  {prettify(item)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
