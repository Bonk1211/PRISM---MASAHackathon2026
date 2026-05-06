// Phase 3 — Indicator Mapping. Renders the WDI-indicator → risk-axis memo
// table with both pairwise and partial correlations side-by-side (CLAUDE.md
// invariant: "pairwise vs partial reported side-by-side"). Embeds the Sectoral
// heatmap below for the country × sector residual context.

import { useMemo, useState } from 'react';
import { Eyebrow, Hairline } from '../components/Card';
import {
  PHASE_3_INDICATOR_MAP,
  type IndicatorMapEntry,
  type RiskAxis,
} from '../data/keyNumbers';
import { Sectoral } from './Sectoral';
import { ScopeBanner } from './_phaseShell';

const AXIS_LABEL: Record<RiskAxis, string> = {
  transition: 'Transition',
  physical_vulnerability: 'Physical vulnerability',
  adaptive_capacity: 'Adaptive capacity',
  exposure_base: 'Exposure base',
};
const AXIS_TONE: Record<RiskAxis, string> = {
  transition: 'border-rust/40 bg-rust/10 text-rust',
  physical_vulnerability: 'border-amber/40 bg-amber/10 text-amber',
  adaptive_capacity: 'border-sage/40 bg-sage/10 text-sage',
  exposure_base: 'border-sea/40 bg-sea/10 text-sea',
};

type AxisFilter = 'all' | RiskAxis;

type Row = {
  code: string;
  label: string;
  risk_axis: RiskAxis;
  rationale: string;
  partial: number | null;
  pairwise: number | null;
  flip: boolean;
};

function fmt(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2);
}

function buildRows(): Row[] {
  return Object.entries(PHASE_3_INDICATOR_MAP).map(([code, e]) => {
    const entry = e as IndicatorMapEntry;
    const flip =
      entry.correlation_partial !== null &&
      entry.correlation_pairwise !== null &&
      Math.sign(entry.correlation_partial) !== Math.sign(entry.correlation_pairwise) &&
      Math.abs(entry.correlation_partial) > 0.05 &&
      Math.abs(entry.correlation_pairwise) > 0.05;
    return {
      code,
      label: entry.label,
      risk_axis: entry.risk_axis,
      rationale: entry.rationale,
      partial: entry.correlation_partial,
      pairwise: entry.correlation_pairwise,
      flip,
    };
  });
}

export function Phase3IndicatorMapping() {
  const allRows = useMemo(() => buildRows(), []);
  const [filter, setFilter] = useState<AxisFilter>('all');

  const rows = useMemo(
    () => (filter === 'all' ? allRows : allRows.filter((r) => r.risk_axis === filter)),
    [allRows, filter],
  );

  const axisCounts = useMemo(() => {
    const counts: Record<RiskAxis, number> = {
      transition: 0,
      physical_vulnerability: 0,
      adaptive_capacity: 0,
      exposure_base: 0,
    };
    for (const r of allRows) counts[r.risk_axis] = (counts[r.risk_axis] ?? 0) + 1;
    return counts;
  }, [allRows]);

  return (
    <div className="space-y-6">
      <ScopeBanner />

      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Phase 3 · Engagement</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Indicator mapping.
          <span className="display tab-num text-amber italic"> {allRows.length} </span>
          WDI series, four risk axes.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink lg:text-[16px] lg:max-w-prose">
          Each WDI indicator is bucketed against one of four climate-risk axes
          (transition, physical vulnerability, adaptive capacity, exposure base),
          with both unconditional pairwise and partial (scale-controlled)
          correlations against log-GHG.
        </p>
      </section>

      {/* Axis filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow>Filter axis</Eyebrow>
        <button
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={[
            'min-h-[28px] border px-2.5 font-mono text-[10px] uppercase tracking-eyebrow transition',
            filter === 'all' ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink',
          ].join(' ')}
        >
          All · {allRows.length}
        </button>
        {(Object.keys(AXIS_LABEL) as RiskAxis[]).map((axis) => (
          <button
            key={axis}
            onClick={() => setFilter(axis)}
            aria-pressed={filter === axis}
            className={[
              'min-h-[28px] border px-2.5 font-mono text-[10px] uppercase tracking-eyebrow transition',
              filter === axis ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink',
            ].join(' ')}
          >
            {AXIS_LABEL[axis]} · {axisCounts[axis]}
          </button>
        ))}
      </div>

      {/* Mapping table — both correlations side-by-side */}
      <section className="overflow-x-auto border border-rule bg-paper">
        <table className="min-w-[860px] w-full text-[12px]">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-eyebrow font-medium text-muted">
                Indicator
              </th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-eyebrow font-medium text-muted">
                Risk axis
              </th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-eyebrow font-medium text-muted">
                Rationale
              </th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-eyebrow font-medium text-sea">
                Pairwise r
              </th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-eyebrow font-medium text-rust">
                Partial r
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((r) => (
              <tr key={r.code} className={r.flip ? 'bg-amber/[0.04]' : ''}>
                <td className="px-3 py-2.5 align-top">
                  <p className="text-[12px] font-medium text-ink">{r.label}</p>
                  <p className="mt-0.5 font-mono text-[9px] tab-num text-muted">{r.code}</p>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <span
                    className={[
                      'inline-block whitespace-nowrap border px-2 py-0.5 font-mono text-[9px] uppercase tracking-eyebrow',
                      AXIS_TONE[r.risk_axis],
                    ].join(' ')}
                  >
                    {AXIS_LABEL[r.risk_axis]}
                  </span>
                  {r.flip && (
                    <span className="mt-1 block border border-amber/50 bg-amber/10 px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-eyebrow text-amber w-fit">
                      Sign-flip
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top text-[12px] leading-snug text-ink/85">
                  {r.rationale}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono tab-num text-sea">
                  {fmt(r.pairwise)}
                </td>
                <td
                  className={[
                    'px-3 py-2.5 text-right align-top font-mono tab-num',
                    r.flip ? 'text-rust font-semibold' : 'text-rust',
                  ].join(' ')}
                >
                  {fmt(r.partial)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[12px] text-muted">
                  No indicators match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="px-1 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
        Legend · <span className="text-sea">Pairwise r</span> = unconditional ·{' '}
        <span className="text-rust">Partial r</span> = log-GDP and log-population
        partialled out. Sign-flip rows highlighted in amber.
      </p>

      {/* Embedded sectoral heatmap */}
      <section className="border-t-2 border-ink pt-6">
        <Eyebrow>Phase 3 heatmap · sectoral residuals</Eyebrow>
        <p className="mt-2 font-serif italic text-[13px] leading-relaxed text-ink lg:text-[14px] lg:max-w-prose">
          Once the indicator → axis mapping is set, the country × sector
          residual heatmap shows where each cedent's book lands relative to a
          scale-implied STIRPAT prediction.
        </p>
        <div className="mt-5">
          <Sectoral />
        </div>
      </section>
    </div>
  );
}
