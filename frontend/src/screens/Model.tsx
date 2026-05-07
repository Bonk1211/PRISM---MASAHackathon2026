import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { DRIVERS, FORECAST_2024, MAPE } from '../data/keyNumbers';

const KIND_COLOUR: Record<string, string> = {
  scale: '#0A1A2A',
  tech:  '#0E7C86',
  land:  '#3F8A66',
};

export function Model() {
  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5">
        <Eyebrow>§3.1 · drivers</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] text-ink">
          Population + GDP carry
          <span className="display tab-num text-amber italic"> 85% </span>
          of structural variance.
        </h1>
        <Hairline className="mt-4" />
        <p className="mt-4 font-serif italic text-[14px] leading-relaxed text-ink">
          STIRPAT (Dietz &amp; Rosa 1997). Scale dominates. The actionable lever is what survives <i>after</i> scale: carbon intensity, industrial share, renewables.
        </p>
      </section>

      <Card title="XGBoost feature gain" subtitle="Panel model on 1990–2023; gain = average improvement at split.">
        <div
          role="img"
          aria-label={`Bar chart: XGBoost M3b feature gain. ${DRIVERS.map((d) => `${d.feature} ${(d.gain * 100).toFixed(1)} percent`).join('; ')}.`}
          className="h-56"
        >
          <ResponsiveContainer>
            <BarChart layout="vertical" data={DRIVERS} margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} fontSize={10} />
              <YAxis type="category" dataKey="feature" width={110} tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey="gain" radius={[0, 2, 2, 0]}>
                {DRIVERS.map((d) => (
                  <Cell key={d.feature} fill={KIND_COLOUR[d.kind]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Hairline className="mt-3" />
        <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
          <Legend dot="#0A1A2A" label="Scale (P × A)" />
          <Legend dot="#0E7C86" label="Technology" />
          <Legend dot="#3F8A66" label="Land use" />
        </div>
      </Card>

      <section className="grid grid-cols-3 gap-x-3 border border-rule bg-paper px-5 py-5">
        <StatBig value={`${MAPE.XGBoost}%`} label="XGBoost" accent="sea" hint="Selected" />
        <StatBig value={`${MAPE.ARIMA}%`}    label="ARIMA"   accent="ink"  hint="Cross-check" />
        <StatBig value={`${MAPE.log_linear}%`} label="Log-lin" accent="amber" hint="Baseline" />
      </section>

      <Card title="2024 hold-out — XGBoost predicted vs actual" subtitle="MAPE 2.43 % across SEA. Vietnam, Indonesia, Thailand all under 1.1 % error.">
        <div
          role="img"
          aria-label={`Bar chart: 2024 hold-out predicted vs actual emissions per SEA country, in megatonnes. ${FORECAST_2024.map((r) => `${r.country} actual ${r.actual.toFixed(0)}, predicted ${r.pred.toFixed(0)}, error ${r.errPct >= 0 ? '+' : ''}${r.errPct.toFixed(1)} percent`).join('; ')}.`}
          className="h-64"
        >
          <ResponsiveContainer>
            <BarChart data={FORECAST_2024} margin={{ top: 4, right: 8, left: -8, bottom: 32 }}>
              <XAxis dataKey="country" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)} Mt`} />
              <Bar dataKey="actual" name="Actual 2024" fill="#0A1A2A" radius={[2, 2, 0, 0]} />
              <Bar dataKey="pred"   name="Predicted"   fill="#0E7C86" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          Random seed 2026 · R Markdown and Python notebook agree to 4 dp
        </p>
      </Card>

      <Card title="Why two XGBoost specs?" tone="sand">
        <p className="font-serif text-[14px] italic leading-relaxed text-ink">
          <b className="not-italic">M3a</b> uses lag-1 / lag-2 emissions — wins on forecast accuracy ({MAPE.XGBoost}% MAPE). <b className="not-italic">M3b</b> drops lags — wins on driver attribution because lags would otherwise dominate gain. A reinsurance committee needs both: forecast accuracy and explainability.
        </p>
      </Card>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2" style={{ background: dot }} />
      {label}
    </span>
  );
}
