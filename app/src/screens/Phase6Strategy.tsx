// Phase 6 — Strategy & Reporting. Composes the existing Pricing, Cedent,
// Actions, Brief, and Report screens as tab sections. Reads the Phase 1
// scoping snapshot so the active LOB list (from the consultant interview) is
// surfaced as a context strip; downstream screens still render their own
// internal state, but the strip narrates what scope the user is operating
// under.

import { useState } from 'react';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { getScopingSnapshot, type LOB } from '../lib/scoping';
import { Actions } from './Actions';
import { Brief } from './Brief';
import { Cedent } from './Cedent';
import { Pricing } from './Pricing';
import { Report } from './Report';
import { ScopeBanner } from './_phaseShell';

type LobEntry = { lob: LOB; weight: number };

type Tab = 'pricing' | 'cedent' | 'actions' | 'brief' | 'report';

const TABS: { id: Tab; label: string; eyebrow: string; description: string }[] = [
  {
    id: 'pricing',
    label: 'Pricing',
    eyebrow: 'Workbench · live',
    description: 'Set inputs, run the simulation, save a cedent profile.',
  },
  {
    id: 'cedent',
    label: 'Cedent',
    eyebrow: 'Composite tier · loading',
    description: 'Five-tier rating with sector-mix and NDC overrides.',
  },
  {
    id: 'actions',
    label: 'Actions',
    eyebrow: 'Recommendations · 4',
    description: 'Product, screen, capital instrument, capital buffer.',
  },
  {
    id: 'brief',
    label: 'Brief',
    eyebrow: 'Executive memo',
    description: 'One-page memo populated from the saved cedent profile.',
  },
  {
    id: 'report',
    label: 'Report',
    eyebrow: 'Full assessment',
    description: 'Long-form printable report with audit-trail provenance.',
  },
];

const LOB_LABEL: Record<LOB, string> = {
  property_cat: 'Property cat',
  agriculture: 'Agriculture',
  life: 'Life',
  casualty: 'Casualty',
  specialty: 'Specialty',
};

export function Phase6Strategy() {
  const [tab, setTab] = useState<Tab>('pricing');
  const meta = TABS.find((t) => t.id === tab)!;
  const profile = getScopingSnapshot();
  const lobMap = profile.line_of_business ?? {};
  const lobs: LobEntry[] = (Object.entries(lobMap) as [LOB, number][])
    .filter(([, w]) => typeof w === 'number' && w > 0)
    .map(([lob, weight]) => ({ lob, weight }))
    .sort((a, b) => b.weight - a.weight);
  const geography = profile.geography ?? [];

  return (
    <div className="space-y-6">
      <ScopeBanner />

      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Phase 6 · Engagement</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Strategy &amp; reporting.
          <span className="display tab-num text-amber italic"> Five </span>
          deliverables, one underwriting cycle.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink lg:text-[16px] lg:max-w-prose">
          Pricing simulator, cedent screening, recommended actions, executive
          memo, and the long-form assessment report — all reading from the same
          canonical pipeline output.
        </p>
      </section>

      {/* Scope context strip — only when scope is set */}
      {profile.complete && (lobs.length > 0 || geography.length > 0) && (
        <Card tone="ink">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Eyebrow tone="paper">Active scope · from Phase 1</Eyebrow>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-paper/60">
              {profile.client_label ?? 'Untitled engagement'}
            </span>
          </div>
          <Hairline className="mt-3 border-paper/20" />
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lobs.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-paper/60">
                  Lines of business · {lobs.length}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {lobs.map(({ lob, weight }) => (
                    <li
                      key={lob}
                      className="flex items-baseline gap-1.5 border border-paper/30 bg-paper/[0.06] px-2 py-1 text-[11px] text-paper"
                    >
                      <span>{LOB_LABEL[lob] ?? lob}</span>
                      <span className="font-mono tab-num text-[10px] text-paper/70">
                        {(weight * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {geography.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-paper/60">
                  Geography · {geography.length}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {geography.map((g) => (
                    <li
                      key={g}
                      className="border border-paper/30 bg-paper/[0.06] px-2 py-1 text-[11px] text-paper"
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <p className="mt-3 font-serif italic text-[12px] leading-snug text-paper/80">
            Downstream screens render the full SEA × all-LOB workbench;
            committee read-outs should foreground the LOBs above.
          </p>
        </Card>
      )}

      {/* Tab strip */}
      <nav className="border border-rule bg-paper" aria-label="Phase 6 sections">
        <div role="tablist" aria-label="Strategy sections" className="grid grid-cols-2 lg:grid-cols-5">
          {TABS.map((t) => {
            const sel = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={sel}
                aria-controls={`phase6-panel-${t.id}`}
                id={`phase6-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={[
                  'border-r border-rule px-4 py-3 text-left transition last:border-r-0',
                  sel ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/[0.03]',
                ].join(' ')}
              >
                <p
                  className={[
                    'font-mono text-[10px] uppercase tracking-eyebrow',
                    sel ? 'text-paper/70' : 'text-muted',
                  ].join(' ')}
                >
                  {t.eyebrow}
                </p>
                <p className={['mt-0.5 text-[14px] font-semibold', sel ? 'text-paper' : 'text-ink'].join(' ')}>
                  {t.label}
                </p>
              </button>
            );
          })}
        </div>
        <div className="border-t border-rule bg-sand/40 px-4 py-2.5">
          <p className="font-serif italic text-[12px] leading-snug text-ink">
            {meta.description}
          </p>
        </div>
      </nav>

      {/* Panel — switches by tab */}
      <section
        id={`phase6-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`phase6-tab-${tab}`}
      >
        {tab === 'pricing' && <Pricing />}
        {tab === 'cedent' && <Cedent />}
        {tab === 'actions' && <Actions />}
        {tab === 'brief' && <Brief />}
        {tab === 'report' && <Report />}
      </section>
    </div>
  );
}
