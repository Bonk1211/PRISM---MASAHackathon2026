import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { EvidenceModal } from '../components/EvidenceModal';
import { Ticker } from '../components/Ticker';
import { HEADLINE, PORTFOLIO, STRESS_2030 } from '../data/keyNumbers';
import { EVIDENCE_BY_ID } from '../data/evidence';

const SCENARIO_COLOURS: Record<string, string> = {
  'Net Zero 2050':      '#3F8A66',
  'Mitigation':         '#0E7C86',
  'Delayed Transition': '#B8761C',
  'Current Policies':   '#8B2E1F',
};

function ShareLink() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) { /* ignore */ }
  };
  return (
    <section className="grid grid-cols-[1fr_auto] items-center gap-4 border border-rule bg-paper px-5 py-4">
      <div>
        <Eyebrow>Share this dashboard</Eyebrow>
        <p className="mt-1 font-mono text-[11px] tab-num text-ink truncate" title={url}>
          {url || '—'}
        </p>
      </div>
      <button
        onClick={copy}
        className="border border-ink bg-paper px-4 py-2 font-mono text-[11px] uppercase tracking-eyebrow text-ink transition hover:bg-ink hover:text-paper"
      >
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </section>
  );
}

export function Story() {
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const open = (id: string) => setEvidenceId(id);
  const entry = evidenceId ? EVIDENCE_BY_ID[evidenceId] ?? null : null;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Editorial broadsheet hero — 2-col on lg */}
      <section className="border border-rule bg-paper">
        <div className="grid lg:grid-cols-[1.6fr_1fr]">
          {/* Left: hero copy */}
          <div className="px-5 pt-6 pb-5 lg:px-10 lg:pt-10 lg:pb-8 lg:border-r lg:border-rule">
            <div className="flex items-center justify-between">
              <Eyebrow>Front page · Issue 2026/05</Eyebrow>
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                R·I — Folio 01
              </span>
            </div>

            <h2 className="display mt-4 text-[44px] leading-[0.92] text-ink lg:text-[68px] lg:mt-6">
              Climate risk is a
              <span className="italic"> structural driver </span>
              of expected loss in <span className="italic">South-East Asia</span>.
            </h2>

            <Hairline className="mt-5 lg:mt-8" strong />

            <p className="mt-5 font-serif text-[16px] italic leading-relaxed text-ink lg:mt-7 lg:text-[20px]">
              On the client&apos;s notional <span className="not-italic font-semibold">USD {(PORTFOLIO.gwpUsdM / 1000).toFixed(1)} bn</span> SEA portfolio, the gap between a Net Zero 2050 and a Hot House World transition pathway by 2030 is <span className="not-italic font-semibold"> USD {HEADLINE.lossSwingUsdM} m</span> in expected loss — an <span className="not-italic font-semibold">{HEADLINE.lrSwingPp} pp</span> loss-ratio swing.
            </p>

            <p className="mt-4 text-[12px] text-muted lg:mt-6">
              Tap any number to open its source paragraph and report § anchor.
            </p>
          </div>

          {/* Right: KPI plate */}
          <div className="px-5 pt-5 pb-6 lg:px-8 lg:pt-10 lg:pb-8">
            <Eyebrow>Headline · base case</Eyebrow>

            <div className="mt-4 space-y-4 lg:mt-6">
              <button onClick={() => open('loss-swing')} className="block w-full text-left evidence-tap border-b border-rule pb-4">
                <StatBig value={`USD ${HEADLINE.lossSwingUsdM}m`} label="Loss swing" accent="rust" size="hero" />
              </button>
              <button onClick={() => open('lr-swing')} className="block w-full text-left evidence-tap border-b border-rule pb-4">
                <StatBig value={`+${HEADLINE.lrSwingPp}pp`} label="LR delta" accent="amber" size="lg" />
              </button>
              <button onClick={() => open('mape-xgb')} className="block w-full text-left evidence-tap">
                <StatBig value={`${HEADLINE.mapeXGBPct}%`} label="MAPE 2024" accent="sea" size="lg" hint="XGBoost hold-out" />
              </button>
            </div>

            {/* Scenario fan — one glance at the 4-pathway spread that produces the headline */}
            <div className="mt-6 border-t border-rule pt-4">
              <Eyebrow>2030 expected loss · 4 pathways</Eyebrow>
              <div className="mt-3 h-32 lg:h-36">
                <ResponsiveContainer>
                  <BarChart data={STRESS_2030} margin={{ top: 4, right: 4, left: -22, bottom: 18 }}>
                    <XAxis
                      dataKey="scenario"
                      tickLine={false}
                      axisLine={false}
                      fontSize={8}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={34}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={9} tickFormatter={(v) => `${(v / 1000).toFixed(1)}b`} />
                    <Tooltip
                      formatter={(v) => `USD ${Math.round(Number(v))}m`}
                      cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                    />
                    <ReferenceLine
                      y={PORTFOLIO.gwpUsdM * PORTFOLIO.baseLossRatio}
                      stroke="rgba(10,26,42,0.40)"
                      strokeDasharray="3 3"
                    />
                    <Bar dataKey="lossUsdM" radius={[2, 2, 0, 0]}>
                      {STRESS_2030.map((s) => (
                        <Cell key={s.scenario} fill={SCENARIO_COLOURS[s.scenario] ?? '#0E7C86'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                Dashed line = base. USD {HEADLINE.lossSwingUsdM} m swing = right-most minus left-most bar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Share link + portfolio sheet — 2-col on lg */}
      <section className="grid gap-6 lg:grid-cols-2 lg:gap-6">
        <ShareLink />

        <div className="border border-rule bg-sand px-5 py-5 lg:px-7 lg:py-6">
          <Eyebrow>Portfolio assumptions · base case</Eyebrow>
          <Hairline className="mt-3" />
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <button onClick={() => open('gwp-1200')} className="evidence-tap text-left">
              <dt className="text-[10px] uppercase tracking-eyebrow text-muted">GWP</dt>
              <dd className="display tab-num mt-1 text-[28px] text-ink lg:text-[34px]">
                <span className="text-[12px] font-mono align-top mr-0.5">USD</span>
                {PORTFOLIO.gwpUsdM}
                <span className="text-[14px] font-mono ml-0.5">m</span>
              </dd>
            </button>
            <div>
              <dt className="text-[10px] uppercase tracking-eyebrow text-muted">Base LR</dt>
              <dd className="display tab-num mt-1 text-[28px] text-ink lg:text-[34px]">
                {(PORTFOLIO.baseLossRatio * 100).toFixed(0)}<span className="text-[14px] font-mono">%</span>
              </dd>
            </div>
            <button onClick={() => open('elasticity-07')} className="evidence-tap text-left">
              <dt className="text-[10px] uppercase tracking-eyebrow text-muted">Elasticity ε</dt>
              <dd className="display tab-num mt-1 text-[28px] text-ink italic lg:text-[34px]">
                {PORTFOLIO.elasticity}
              </dd>
            </button>
          </dl>
          <p className="mt-3 text-[11px] leading-snug text-muted">
            ε from Swiss Re sigma 1/2024. Base loss ratio illustrative — replace with cedent-supplied book in production.
          </p>
        </div>
      </section>

      {/* Editorial table of contents — 5-tab demo flow */}
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <div className="flex items-baseline justify-between">
          <Eyebrow>The case file · 5 sections</Eyebrow>
          <span className="hidden lg:inline font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Three movements
          </span>
        </div>
        <h2 className="display mt-2 text-[28px] leading-[1.05] text-ink lg:text-[40px]">
          A reinsurance dossier in <span className="italic">three movements</span>.
        </h2>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3 lg:gap-8">
          <Movement
            roman="I"
            title="Method"
            blurb="See the model run, end to end."
            items={[
              { code: '02', name: 'Pipeline', to: '/pipeline', tag: 'Live model demo · 5 stages' },
            ]}
          />
          <Movement
            roman="II"
            title="Pricing"
            blurb="Where the risk meets the book."
            items={[
              { code: '03', name: 'Stress', to: '/stress', tag: 'NGFS × elasticity slider' },
              { code: '04', name: 'Cedent', to: '/cedent', tag: 'Composite tier · live' },
            ]}
          />
          <Movement
            roman="III"
            title="Delivery"
            blurb="What lands on the CRO desk."
            items={[
              { code: '05', name: 'Brief', to: '/brief', tag: 'Executive memo export' },
            ]}
          />
        </div>

        {/* Appendix — absorbed routes for direct deep-link */}
        <div className="mt-8 border-t border-rule pt-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Appendix · drill-downs reachable via Pipeline
            </p>
            <span className="font-mono text-[10px] tab-num text-muted">07 entries</span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 lg:grid-cols-4">
            {[
              { code: 'a', name: 'Model',      to: '/model' },
              { code: 'b', name: 'Diagnostic', to: '/diagnostic' },
              { code: 'c', name: 'Hot Spots',  to: '/hotspots' },
              { code: 'd', name: 'Sectoral',   to: '/sectoral' },
              { code: 'e', name: 'Compare',    to: '/compare' },
              { code: 'f', name: 'Actions',    to: '/actions' },
              { code: 'g', name: 'Evidence',   to: '/evidence' },
            ].map((it) => (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className="flex items-baseline justify-between py-1.5 text-[12px] text-muted hover:text-ink transition"
                >
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-[9px] text-muted/60">{it.code}</span>
                    <span>{it.name}</span>
                  </span>
                  <span aria-hidden="true" className="font-mono text-[10px]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Persistent CTA — points to live Pipeline */}
      <Link
        to="/pipeline"
        className="group flex items-center justify-between border border-ink bg-ink px-5 py-4 text-paper transition active:bg-ink/95 lg:px-8 lg:py-5"
      >
        <span className="flex items-center gap-3 lg:gap-5">
          <Ticker code="02" tone="paper" size="md" />
          <span className="text-[15px] font-medium lg:text-[18px]">See the model run live</span>
        </span>
        <span aria-hidden="true" className="font-mono text-[14px] lg:text-[16px]">→</span>
      </Link>

      <Card tone="paper">
        <Eyebrow>Provenance</Eyebrow>
        <p className="mt-2 text-[11px] leading-relaxed text-muted lg:text-[12px]">
          Sources: World Bank WDI (Wide format) · EM-DAT Country Profiles via OCHA HDX (snapshot 2026-04-24) · ND-GAIN Country Index 2026 release · Swiss Re sigma 1/2024 · NGFS Phase V · BNM CRST 2024.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          Data 2026-04-25 · Seed 2026 · Pipeline Python v1.0
        </p>
      </Card>

      <EvidenceModal entry={entry} onClose={() => setEvidenceId(null)} />
    </div>
  );
}

function Movement({
  roman, title, blurb, items,
}: {
  roman: string;
  title: string;
  blurb: string;
  items: { code: string; name: string; to: string; tag: string }[];
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 lg:block">
      <div className="display text-[40px] italic leading-[0.85] text-ink/80 lg:text-[64px]">{roman}</div>
      <div>
        <h3 className="text-[15px] font-semibold text-ink lg:text-[18px] lg:mt-3">{title}</h3>
        <p className="text-[12px] text-muted lg:text-[13px]">{blurb}</p>
        <ul className="mt-3 divide-y divide-rule border-y border-rule lg:mt-4">
          {items.map((it) => (
            <li key={it.to}>
              <Link
                to={it.to}
                className="flex items-baseline justify-between py-2.5 lg:py-3 hover:bg-ink/[0.03] -mx-2 px-2 transition"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-muted">{it.code}</span>
                  <span className="text-[14px] text-ink">{it.name}</span>
                </span>
                <span className="text-[11px] text-muted">{it.tag}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
