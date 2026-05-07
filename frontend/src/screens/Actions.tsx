import { useState } from 'react';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { Ticker } from '../components/Ticker';
import { RECOMMENDATIONS, type Recommendation } from '../data/keyNumbers';
import { POLICY_BY_ID } from '../data/policy';

export function Actions() {
  const [active, setActive] = useState<Recommendation | null>(null);

  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Output · §7</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Four actions, <span className="italic">one underwriting cycle</span>.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink">
          Each maps to one of the answers from the analytical journey: product, screen, capital instrument, capital buffer.
        </p>
      </section>

      <ul className="divide-y divide-rule border border-rule bg-paper">
        {RECOMMENDATIONS.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => setActive(r)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-4 px-5 py-4 text-left transition hover:bg-ink/[0.02]"
            >
              <Ticker code={r.ticker} tone={r.ticker === 'PT' ? 'sea' : r.ticker === 'ES' ? 'sage' : r.ticker === 'CB' ? 'amber' : 'rust'} size="lg" />
              <div>
                <h2 className="text-[15px] font-semibold leading-tight text-ink">{r.title}</h2>
                <p className="mt-1 text-[12px] leading-snug text-muted">{r.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                    Target · {r.target}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-sea">
                    {POLICY_BY_ID[r.policyId]?.short ?? r.policyId}
                  </span>
                </div>
              </div>
              <span aria-hidden="true" className="self-center font-mono text-[14px] text-muted">→</span>
            </button>
          </li>
        ))}
      </ul>

      <Card title="Numbers traceability" tone="sand">
        <p className="font-serif text-[14px] italic leading-relaxed text-ink">
          Every figure quoted in this app is in <code className="font-mono not-italic text-[12px]">exhibits/results/key_numbers_python.json</code> or
          <code className="font-mono not-italic text-[12px]"> data/external/external_features_sea.csv</code>, and the prose mirrors
          <code className="font-mono not-italic text-[12px]"> deliverables/01_report.md</code>. Update once, propagate everywhere.
        </p>
      </Card>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} detail`}
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          <button
            aria-label="Close"
            onClick={() => setActive(null)}
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
          />
          <article
            className="relative mx-auto w-full max-w-app rounded-t-[18px] border-t border-rule bg-paper px-5 pb-8 pt-5 shadow-plate"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0))' }}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <div className="flex items-baseline justify-between">
              <Eyebrow>Recommendation</Eyebrow>
              <button
                onClick={() => setActive(null)}
                className="font-mono text-[11px] uppercase tracking-eyebrow text-muted hover:text-ink"
              >
                Close ✕
              </button>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <Ticker code={active.ticker} tone="ink" size="lg" />
              <div>
                <h3 className="display text-[24px] leading-[1.05] text-ink">{active.title}</h3>
                <p className="mt-1 text-[12px] text-muted">{active.detail}</p>
              </div>
            </div>

            <Hairline className="mt-4" />

            <dl className="mt-3 space-y-2 text-[12px]">
              <Row label="KPI" value={active.kpi} />
              <Row label="Target" value={active.target} />
              <Row label="Owner" value={active.owner} />
              <Row label="Milestone" value={active.milestone} />
            </dl>

            <Hairline className="mt-4" />
            <Eyebrow>Policy anchor</Eyebrow>
            <p className="mt-2 text-[13px] text-ink">
              <span className="font-semibold">{POLICY_BY_ID[active.policyId]?.short}</span>
              {' — '}
              {POLICY_BY_ID[active.policyId]?.full}
            </p>
            <p className="mt-1 text-[12px] text-muted">{POLICY_BY_ID[active.policyId]?.relevance}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Cite · {POLICY_BY_ID[active.policyId]?.cite}
            </p>
          </article>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
