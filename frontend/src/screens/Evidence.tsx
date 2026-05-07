import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { EvidenceModal } from '../components/EvidenceModal';
import { EVIDENCE, EVIDENCE_BY_ID } from '../data/evidence';
import { POLICY_REFS } from '../data/policy';

// Source token → display label + hue. Source strings in EVIDENCE entries are
// long ("key_numbers_python.json → headline.loss_swing_usdm") so we bucket
// them by primary provider for the chart.
const SOURCE_BUCKETS: { label: string; hue: string; match: (s: string) => boolean }[] = [
  { label: 'WDI / pipeline JSON', hue: '#0E7C86', match: (s) => /key_numbers_python|wdi|world bank/i.test(s) },
  { label: 'EM-DAT',              hue: '#8B2E1F', match: (s) => /em-?dat|cred/i.test(s) },
  { label: 'ND-GAIN',             hue: '#3F8A66', match: (s) => /nd-?gain|notre dame/i.test(s) },
  { label: 'Swiss Re sigma',      hue: '#B8761C', match: (s) => /swiss re|sigma/i.test(s) },
  { label: 'NGFS',                hue: '#4F6D8A', match: (s) => /ngfs/i.test(s) },
  { label: 'BNM CRST',            hue: '#7A6E55', match: (s) => /bnm|crst/i.test(s) },
  { label: 'Cedent framework',    hue: '#5C7C3D', match: (s) => /cedent\.ts|deliverables\/05/i.test(s) },
  { label: 'Other',               hue: '#7A8A9C', match: () => true },
];

function bucketFor(source: string): string {
  for (const b of SOURCE_BUCKETS) if (b.match(source)) return b.label;
  return 'Other';
}


type ViewMode = 'number' | 'policy' | 'source';

const SOURCES = [
  { id: 'wdi',     label: 'World Bank WDI',         desc: '16-indicator panel, 1990–2024, ISO3 country codes.' },
  { id: 'emdat',   label: 'EM-DAT (CRED/UCLouvain)', desc: 'Disaster events, damage, fatalities. Snapshot 2026-04-24.' },
  { id: 'ndgain',  label: 'ND-GAIN Country Index',   desc: 'Vulnerability + readiness composite, 2026 release.' },
  { id: 'sigma',   label: 'Swiss Re sigma 1/2024',   desc: 'SEA penetration, protection gap, peril mix.' },
  { id: 'ngfs',    label: 'NGFS Phase V',            desc: 'Four climate-transition pathways for stress test.' },
  { id: 'bnm',     label: 'BNM CRST 2024',           desc: 'Capital-buffer regulation under Hot House World.' },
];

export function Evidence() {
  const [mode, setMode] = useState<ViewMode>('number');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EVIDENCE;
    return EVIDENCE.filter((e) =>
      [e.label, e.value, e.source, e.paragraph, e.reportSection ?? '']
        .some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  const entry = activeId ? EVIDENCE_BY_ID[activeId] ?? null : null;

  // Aggregate: how many EVIDENCE entries per source bucket (for any view).
  const sourceHist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of EVIDENCE) {
      const b = bucketFor(e.source ?? '');
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    // Preserve SOURCE_BUCKETS order, drop empty buckets.
    return SOURCE_BUCKETS
      .map((b) => ({ label: b.label, count: counts.get(b.label) ?? 0, hue: b.hue }))
      .filter((d) => d.count > 0);
  }, []);

  // Aggregate: how many evidence entries per policy reference.
  const policyHist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of EVIDENCE) {
      if (!e.policyId) continue;
      counts.set(e.policyId, (counts.get(e.policyId) ?? 0) + 1);
    }
    return POLICY_REFS
      .map((p) => ({
        id: p.id,
        label: p.short,
        count: counts.get(p.id) ?? 0,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, []);

  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Trace-back ledger</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Every number, <span className="italic">an audit trail</span>.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink">
          The differentiator. Tap any number anywhere in the app — or browse here by number, by policy instrument, or by data source.
        </p>
      </section>

      {/* Audit-trail anatomy — where the EVIDENCE mass concentrates */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Audit trail · by source" subtitle={`${EVIDENCE.length} numbers across ${sourceHist.length} sources`}>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart
                data={sourceHist}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
                barCategoryGap={4}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                  fontSize={10}
                  allowDecimals={false}
                />
                <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} fontSize={10} />
                <Tooltip formatter={(v) => `${v} entries`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
                <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                  {sourceHist.map((d) => (
                    <Cell key={d.label} fill={d.hue} />
                  ))}
                  <LabelList dataKey="count" position="right" fontSize={10} fill="#0A1A2A" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Audit trail · by policy anchor" subtitle={`${policyHist.length} instruments referenced by EVIDENCE`}>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart
                data={policyHist}
                layout="vertical"
                margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
                barCategoryGap={4}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                  fontSize={10}
                  allowDecimals={false}
                />
                <YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} fontSize={10} />
                <Tooltip formatter={(v) => `${v} entries`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
                <Bar dataKey="count" fill="#0E7C86" radius={[0, 2, 2, 0]}>
                  <LabelList dataKey="count" position="right" fontSize={10} fill="#0A1A2A" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* View toggle */}
      <div className="flex border border-rule">
        {(['number', 'policy', 'source'] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={[
              'flex-1 min-h-[40px] px-3 text-[11px] font-medium uppercase tracking-eyebrow transition',
              mode === m ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/5',
            ].join(' ')}
          >
            By {m}
          </button>
        ))}
      </div>

      {mode === 'number' && (
        <section className="space-y-3">
          <div className="border border-rule bg-paper">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search “USD 135”, “sign-flip”, “Vietnam”…"
              className="w-full bg-transparent px-4 py-3 text-[13px] text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <ul className="divide-y divide-rule border border-rule bg-paper">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  onClick={() => setActiveId(e.id)}
                  className="grid w-full grid-cols-[100px_1fr_auto] items-baseline gap-3 px-4 py-3 text-left transition hover:bg-ink/[0.02]"
                >
                  <span className="display tab-num text-[18px] italic text-ink">{e.value}</span>
                  <div>
                    <p className="text-[13px] text-ink">{e.label}</p>
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">{e.reportSection ?? e.source}</p>
                  </div>
                  <span aria-hidden="true" className="font-mono text-[12px] text-muted">↗</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-[12px] text-muted">No match. Try a shorter query.</li>
            )}
          </ul>
        </section>
      )}

      {mode === 'policy' && (
        <ul className="divide-y divide-rule border border-rule bg-paper">
          {POLICY_REFS.map((p) => {
            const linked = EVIDENCE.filter((e) => e.policyId === p.id);
            return (
              <li key={p.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[14px] font-semibold text-ink">{p.short}</p>
                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">{p.jurisdiction}</span>
                </div>
                <p className="text-[12px] text-muted">{p.full}</p>
                <p className="mt-2 font-serif italic text-[13px] leading-relaxed text-ink">
                  {p.relevance}
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
                  {p.cite}
                </p>
                {linked.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-rule pt-2">
                    {linked.map((l) => (
                      <li key={l.id}>
                        <button
                          onClick={() => setActiveId(l.id)}
                          className="flex w-full items-baseline justify-between text-left"
                        >
                          <span className="text-[12px] text-ink">{l.label}</span>
                          <span className="font-mono text-[11px] tab-num text-sea">{l.value}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {mode === 'source' && (
        <ul className="divide-y divide-rule border border-rule bg-paper">
          {SOURCES.map((s) => (
            <li key={s.id} className="px-5 py-4">
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-semibold text-ink">{s.label}</p>
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">Provider</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">{s.desc}</p>
            </li>
          ))}
        </ul>
      )}

      <Card tone="sand">
        <Eyebrow>Why this exists</Eyebrow>
        <p className="mt-2 font-serif italic text-[14px] leading-relaxed text-ink">
          Sceptical CROs check numbers. Regulators need an audit trail. Trace-back is the moat.
        </p>
      </Card>

      <EvidenceModal entry={entry} onClose={() => setActiveId(null)} />
    </div>
  );
}
