import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, StatBig } from '../components/Card';
import { DRIVERS, FORECAST_2024, MAPE } from '../data/keyNumbers';

const KIND_COLOUR: Record<string, string> = {
  scale: '#0B1F33',
  tech:  '#0E7C86',
  land:  '#5DAE8B',
};

export function Model() {
  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Question 1 — drivers</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Population + GDP carry 85 % of structural variance.</h1>
        <p className="mt-2 text-sm opacity-90">
          STIRPAT (Dietz &amp; Rosa 1997) tells us scale dominates. The actionable lever is what survives <i>after</i> scale: carbon intensity, industrial share, renewables.
        </p>
      </Card>

      <Card title="XGBoost feature gain" subtitle="Panel model on 1990–2023; gain = average improvement at split.">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart layout="vertical" data={DRIVERS} margin={{ top: 6, right: 16, left: 4, bottom: 4 }}>
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} fontSize={10} />
              <YAxis type="category" dataKey="feature" width={110} tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} cursor={{ fill: 'rgba(11,31,51,0.04)' }} />
              <Bar dataKey="gain" radius={[0, 4, 4, 0]}>
                {DRIVERS.map((d) => (
                  <Cell key={d.feature} fill={KIND_COLOUR[d.kind]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
          <Legend dot="#0B1F33" label="Scale (P × A)" />
          <Legend dot="#0E7C86" label="Technology" />
          <Legend dot="#5DAE8B" label="Land use" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-card">
        <StatBig value={`${MAPE.XGBoost}%`} label="XGBoost" accent="sea" hint="Selected" />
        <StatBig value={`${MAPE.ARIMA}%`}   label="ARIMA"   accent="ink"  hint="Cross-check" />
        <StatBig value={`${MAPE.log_linear}%`} label="Log-lin" accent="amber" hint="Baseline" />
      </div>

      <Card title="2024 hold-out — XGBoost predicted vs actual" subtitle="MAPE 2.18 % across SEA. Vietnam, Indonesia, Thailand all under 1.1 % error.">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={FORECAST_2024} margin={{ top: 4, right: 8, left: -8, bottom: 32 }}>
              <XAxis dataKey="country" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)} Mt`} />
              <Bar dataKey="actual" name="Actual 2024" fill="#0B1F33" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pred" name="Predicted" fill="#0E7C86" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Random seed 2026 in both R Markdown and Python notebook — both implementations agree to four decimal places.
        </p>
      </Card>

      <Card title="Why two XGBoost specs?" tone="sand">
        <p className="text-sm">
          <b>M3a</b> uses lag-1 / lag-2 emissions — wins on forecast accuracy (2.18 % MAPE).{' '}
          <b>M3b</b> drops lags — wins on driver attribution because lags would otherwise dominate gain.
          A reinsurance committee needs both: forecast accuracy and explainability.
        </p>
      </Card>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}
