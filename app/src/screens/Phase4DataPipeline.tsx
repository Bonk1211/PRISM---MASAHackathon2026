// Phase 4 — Data Pipeline. Renders the panel-quality audit strip from
// `phase_4_panel_quality` (n_economies, year span, missingness by indicator,
// forward-only interpolation method) above the embedded interactive Pipeline
// flow diagram.

import { useMemo } from 'react';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { PHASE_4_PANEL_QUALITY } from '../data/keyNumbers';
import { Pipeline } from './Pipeline';
import { ScopeBanner } from './_phaseShell';

const PRETTY_INDICATOR: Record<string, string> = {
  CO2_intensity_GDP: 'CO₂ intensity / GDP',
  CO2_per_capita_tCO2e: 'CO₂ / capita',
  GDP_constant_2015USD: 'GDP (const 2015 USD)',
  GDP_per_capita_2015USD: 'GDP / capita',
  GHG_per_capita_tCO2e: 'GHG / capita',
  GHG_total_MtCO2e: 'GHG total (Mt)',
  agri_land_pct: 'Agriculture land %',
  agriculture_pct_GDP: 'Agriculture % GDP',
  energy_use_pc: 'Energy use / capita',
  forest_area_pct: 'Forest area %',
  freshwater_withdrawal_pct: 'Freshwater withdrawal %',
  industry_pct_GDP: 'Industry % GDP',
  population: 'Population',
  renewable_elec_pct: 'Renewable electricity %',
  renewable_energy_pct: 'Renewable energy %',
  urban_pop_pct: 'Urban pop %',
  ndgain_index: 'ND-GAIN index',
  ndgain_vulnerability: 'ND-GAIN vulnerability',
  ndgain_readiness: 'ND-GAIN readiness',
  disaster_events: 'EM-DAT events',
  disaster_affected: 'EM-DAT affected',
  disaster_deaths: 'EM-DAT deaths',
  disaster_damage_usd_2024: 'EM-DAT damage USD',
};

function bucketFor(pct: number): { bg: string; text: string; band: string } {
  if (pct === 0) return { bg: 'bg-sage/15', text: 'text-sage', band: 'Complete' };
  if (pct < 5) return { bg: 'bg-sage/10', text: 'text-ink', band: '< 5 %' };
  if (pct < 20) return { bg: 'bg-amber/10', text: 'text-ink', band: '< 20 %' };
  if (pct < 50) return { bg: 'bg-amber/20', text: 'text-amber', band: '< 50 %' };
  return { bg: 'bg-rust/10', text: 'text-rust', band: '≥ 50 %' };
}

export function Phase4DataPipeline() {
  const q = PHASE_4_PANEL_QUALITY;

  const sortedMissing = useMemo(
    () =>
      Object.entries(q.missing_pct_by_indicator)
        .map(([k, v]) => ({ key: k, label: PRETTY_INDICATOR[k] ?? k, pct: v as number }))
        .sort((a, b) => b.pct - a.pct),
    [q.missing_pct_by_indicator],
  );

  const fullCoverageCount = useMemo(
    () => sortedMissing.filter((r) => r.pct === 0).length,
    [sortedMissing],
  );

  return (
    <div className="space-y-6">
      <ScopeBanner />

      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Phase 4 · Engagement</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink lg:text-[56px]">
          Data pipeline.
          <span className="display tab-num text-amber italic"> {q.n_economies} </span>
          economies · {q.n_years} years.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink lg:text-[16px] lg:max-w-prose">
          {q.year_min}–{q.year_max} panel, forward-only interpolation (max run{' '}
          {q.interp_max_run} years) so 2024 never leaks into the training
          horizon. Audit strip first; live recompute below.
        </p>
      </section>

      {/* Panel-quality strip */}
      <section className="grid grid-cols-2 gap-px border border-rule bg-rule lg:grid-cols-5">
        <PanelStat
          label="Economies"
          value={q.n_economies.toString()}
          hint={`SEA panel · ${q.year_min}–${q.year_max}`}
          accent="sea"
        />
        <PanelStat
          label="Years"
          value={q.n_years.toString()}
          hint={`${q.year_min} → ${q.year_max}`}
          accent="ink"
        />
        <PanelStat
          label="Total cells"
          value={q.total_cells.toLocaleString()}
          hint={`${q.n_economies} × ${q.n_years} × indicators`}
          accent="ink"
        />
        <PanelStat
          label="Row-complete"
          value={`${q.row_complete_pct.toFixed(1)}%`}
          hint="No NaN across all cols"
          accent={q.row_complete_pct >= 80 ? 'sage' : q.row_complete_pct >= 40 ? 'amber' : 'rust'}
        />
        <PanelStat
          label="Interp"
          value={q.interp_method.replace('_', ' ')}
          hint={`max run ${q.interp_max_run}y · no 2024 leakage`}
          accent="ink"
        />
      </section>

      {/* Missingness audit */}
      <Card
        title={`Missingness by indicator · ${sortedMissing.length} columns`}
        subtitle={`${fullCoverageCount} indicators are complete; the rest are typically EM-DAT or ND-GAIN context joins.`}
      >
        <ul className="space-y-1.5">
          {sortedMissing.map((r) => {
            const tone = bucketFor(r.pct);
            const w = Math.max(2, Math.min(100, r.pct));
            return (
              <li
                key={r.key}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-rule/40 py-1 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="w-44 shrink-0 truncate text-[11px] text-ink lg:w-56">
                    {r.label}
                  </span>
                  <div className="h-2 flex-1 bg-ink/5">
                    <div
                      className={['h-full', tone.bg].join(' ')}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </div>
                <span className={['font-mono text-[11px] tab-num', tone.text].join(' ')}>
                  {r.pct.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ul>
        <Hairline className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted">
          <Legend cls="bg-sage/15" label="Complete" />
          <Legend cls="bg-sage/10" label="< 5 %" />
          <Legend cls="bg-amber/10" label="< 20 %" />
          <Legend cls="bg-amber/20" label="< 50 %" />
          <Legend cls="bg-rust/10" label="≥ 50 %" />
        </div>
      </Card>

      {/* Hygiene / leakage notes */}
      <Card title="Forward-only interpolation · 2024 hold-out hygiene" tone="sand">
        <p className="font-serif text-[14px] italic leading-relaxed text-ink">
          Pandas <code className="font-mono not-italic text-[12px]">interpolate(limit_direction='forward')</code>{' '}
          fills runs of up to <b className="not-italic">{q.interp_max_run}</b> consecutive missing
          years using only past observations. <b className="not-italic">'both'</b> would
          back-fill 2024 into 2023 and break the hold-out hygiene that anchors
          the {q.year_max} MAPE quartet on the next phase.
        </p>
      </Card>

      {/* Embedded interactive pipeline */}
      <section className="border-t-2 border-ink pt-6">
        <Eyebrow>Phase 4 interactive · live pipeline</Eyebrow>
        <p className="mt-2 font-serif italic text-[13px] leading-relaxed text-ink lg:text-[14px] lg:max-w-prose">
          The clean panel feeds the 5-stage forecasting pipeline below.
          Recompute live by changing the country, scenario, or any feature
          override; see the trace propagate through stages 01–05.
        </p>
        <div className="mt-5">
          <Pipeline />
        </div>
      </section>
    </div>
  );
}

function PanelStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: 'ink' | 'sea' | 'rust' | 'sage' | 'amber';
}) {
  return (
    <div className="bg-paper px-4 py-4">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-2">
        <StatBig value={value} label={label} hint={hint} accent={accent} size="md" />
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={['inline-block h-2.5 w-2.5', cls].join(' ')} />
      <span>{label}</span>
    </span>
  );
}
