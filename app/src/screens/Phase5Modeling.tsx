// Phase 5 — Modeling. Composes the existing Model, Stress, HotSpots, and
// Compare screens as tab sections. The Model tab preserves the M3a + M3b
// dual-spec exhibit (CLAUDE.md invariant: "don't delete M3b"); Stress carries
// the NGFS Phase V scenario card; HotSpots carries the VN/PH natural
// experiment; Compare provides a generic two-country side-by-side.

import { useState } from 'react';
import { Eyebrow, Hairline } from '../components/Card';
import { Compare } from './Compare';
import { HotSpots } from './HotSpots';
import { Model } from './Model';
import { Stress } from './Stress';
import { ScopeBanner } from './_phaseShell';

type Tab = 'model' | 'stress' | 'hotspots' | 'compare';

const TABS: { id: Tab; label: string; eyebrow: string; description: string }[] = [
  {
    id: 'model',
    label: 'Model',
    eyebrow: 'M1 / M2 / M3a / M3b',
    description: 'Driver attribution and 2024 hold-out MAPE quartet.',
  },
  {
    id: 'stress',
    label: 'Stress',
    eyebrow: 'NGFS Phase V · 2030',
    description: 'Scenario perturbation × elasticity → expected loss swing.',
  },
  {
    id: 'hotspots',
    label: 'Hot spots',
    eyebrow: 'Vietnam vs Philippines',
    description: 'Same belt, different stories — the natural experiment.',
  },
  {
    id: 'compare',
    label: 'Compare',
    eyebrow: 'Two-country picker',
    description: 'Generic side-by-side metric grid for any pair.',
  },
];

export function Phase5Modeling() {
  const [tab, setTab] = useState<Tab>('model');
  const meta = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-6">
      <ScopeBanner />

      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Phase 5 · Engagement</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Modeling.
          <span className="display tab-num text-amber italic"> Four </span>
          benchmarks, one stress test.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink lg:text-[16px] lg:max-w-prose">
          Two XGBoost specifications run side-by-side: M3a with lagged emissions
          for forecast accuracy; M3b structural-only for driver attribution.
          Both feed into the 2030 NGFS scenario stress test on the SEA notional
          book.
        </p>
      </section>

      {/* Tab strip */}
      <nav className="border border-rule bg-paper" aria-label="Phase 5 sections">
        <div role="tablist" aria-label="Modeling sections" className="grid grid-cols-2 lg:grid-cols-4">
          {TABS.map((t) => {
            const sel = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={sel}
                aria-controls={`phase5-panel-${t.id}`}
                id={`phase5-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={[
                  'border-r border-rule px-4 py-3 text-left transition last:border-r-0',
                  'lg:border-b-0',
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
        id={`phase5-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`phase5-tab-${tab}`}
      >
        {tab === 'model' && <Model />}
        {tab === 'stress' && <Stress />}
        {tab === 'hotspots' && <HotSpots />}
        {tab === 'compare' && <Compare />}
      </section>
    </div>
  );
}
