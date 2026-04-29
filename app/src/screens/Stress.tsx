import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card, StatBig } from '../components/Card';
import { PORTFOLIO, STRESS_2030 } from '../data/keyNumbers';

const COLOURS: Record<string, string> = {
  'Net Zero 2050':      '#5DAE8B',
  'Mitigation':         '#0E7C86',
  'Delayed Transition': '#E5A23E',
  'Current Policies':   '#C0392B',
};

export function Stress() {
  const [scenario, setScenario] = useState('Current Policies');
  const sel = STRESS_2030.find((s) => s.scenario === scenario)!;
  const ref = STRESS_2030.find((s) => s.scenario === 'Current Policies')!;
  const swing = ref.lossUsdM - sel.lossUsdM;
  const lrSwingPp = (ref.lr - sel.lr) * 100;

  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Question 4 — 2030 scenario stress</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Three NGFS pathways. One client portfolio.</h1>
        <p className="mt-2 text-sm opacity-90">
          NGFS Phase V scenarios — the de-facto industry standard, cross-referenced in BNM CRST 2024.
          Pick a pathway and watch the loss ratio and expected loss re-price.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        {STRESS_2030.map((s) => (
          <button
            key={s.scenario}
            onClick={() => setScenario(s.scenario)}
            className={[
              'rounded-2xl border-2 p-3 text-left transition',
              scenario === s.scenario
                ? 'border-ink bg-white shadow-card'
                : 'border-transparent bg-white/60',
            ].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLOURS[s.scenario] }} />
              <span className="text-[11px] uppercase tracking-wider text-muted">{s.family}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">{s.scenario}</div>
            <div className="mt-1 text-[11px] text-muted">
              {s.growth >= 0 ? '+' : ''}{(s.growth * 100).toFixed(1)} % p.a.
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-card">
        <StatBig value={`${(sel.lr * 100).toFixed(1)}%`} label="2030 loss ratio" accent={sel.scenario === 'Net Zero 2050' ? 'sage' : sel.scenario === 'Current Policies' ? 'rust' : 'amber'} />
        <StatBig value={`USD ${sel.lossUsdM}m`} label="Expected loss" accent="ink" />
        <StatBig
          value={`${swing >= 0 ? '−' : '+'}USD ${Math.abs(swing).toFixed(0)}m`}
          label="vs Hot House"
          accent="sea"
          hint={`${lrSwingPp >= 0 ? '−' : '+'}${Math.abs(lrSwingPp).toFixed(1)} pp`}
        />
      </div>

      <Card title="2030 expected loss by scenario" subtitle={`Computed: GWP × base LR × (1 + ε × Δ emissions). ε = ${PORTFOLIO.elasticity} (sigma 1/2024).`}>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={STRESS_2030} margin={{ top: 6, right: 12, left: -8, bottom: 32 }}>
              <XAxis dataKey="scenario" tickLine={false} axisLine={false} fontSize={9} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => `USD ${Number(v)} m`} cursor={{ fill: 'rgba(11,31,51,0.04)' }} />
              <Bar dataKey="lossUsdM" radius={[6, 6, 0, 0]}>
                {STRESS_2030.map((s) => (
                  <Cell
                    key={s.scenario}
                    fill={COLOURS[s.scenario]}
                    fillOpacity={s.scenario === scenario ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Translation to capital" tone="sand">
        <p className="text-sm">
          The Hot House World scenario sits <b>{((ref.lr - STRESS_2030.find((s) => s.scenario === 'Net Zero 2050')!.lr) * 100).toFixed(0)} pp</b> above Net Zero 2050 in loss ratio
          (62 % vs 51 %), implying a <b>USD 135 m</b> swing in expected loss. Under BNM CRST 2024 §6.3, this triggers an additional <b>+8 %</b> regional
          risk-capital buffer recommendation. The proposed mitigation strategy recovers ~70 % of the swing.
        </p>
      </Card>
    </div>
  );
}
