import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '../components/Card';
import { EMDAT_VN_PH, NDGAIN_2023 } from '../data/keyNumbers';

type Side = 'vietnam' | 'philippines';

export function HotSpots() {
  const [side, setSide] = useState<Side>('vietnam');
  const c = EMDAT_VN_PH[side];

  // ND-GAIN sorted desc — colour-code VN/PH highlights
  const ndg = [...NDGAIN_2023].sort((a, b) => b.gain - a.gain);

  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Question 3 — natural experiment</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Vietnam vs Philippines — same typhoon belt, different stories.</h1>
        <p className="mt-2 text-sm opacity-90">
          Both face West-Pacific cyclone risk but diverge sharply on emissions trajectory, market structure, and adaptive capacity. Real EM-DAT 2018-23 below.
        </p>
      </Card>

      <div className="rounded-full bg-white p-1 shadow-card">
        <div className="grid grid-cols-2 gap-1">
          {(['vietnam', 'philippines'] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={[
                'rounded-full py-2 text-sm font-semibold capitalize transition',
                side === s ? 'bg-ink text-paper' : 'text-muted',
              ].join(' ')}
            >
              {s === 'vietnam' ? 'Vietnam' : 'Philippines'}
            </button>
          ))}
        </div>
      </div>

      <Card title={`${side === 'vietnam' ? 'Vietnam' : 'Philippines'} — EM-DAT 2018–2023`} subtitle="CRED/UCLouvain via OCHA HDX, snapshot 2026-04-24. Damage in 2024-CPI USD.">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Item label="Events" value={c.events.toString()} hint={`${c.perYear} / yr`} />
          <Item label="Storms / floods" value={`${c.storms} / ${c.floods}`} hint={`Other: ${c.other}`} />
          <Item label="People affected" value={`${c.affectedM} m`} hint="Cumulative" />
          <Item label="Fatalities" value={c.deaths.toLocaleString()} />
          <Item
            label="Economic damage"
            value={`USD ${c.damageUsdBn2024.toFixed(2)} bn`}
            hint="2024-CPI adjusted"
          />
          <Item
            label="Implied insured (sigma 12 %)"
            value={`USD ${((c.damageUsdBn2024 * 1000 * EMDAT_VN_PH.insuredShareSigma) / 6).toFixed(0)} m / yr`}
            hint="Swiss Re sigma 1/2024 SEA share"
          />
        </dl>
      </Card>

      <Card title="ND-GAIN 2023 — adaptive capacity ranking" subtitle="University of Notre Dame, 2026 release. Higher = better placed for climate change.">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart layout="vertical" data={ndg} margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <XAxis type="number" domain={[30, 75]} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis type="category" dataKey="country" width={110} tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => Number(v).toFixed(1)} cursor={{ fill: 'rgba(11,31,51,0.04)' }} />
              <Bar dataKey="gain" radius={[0, 4, 4, 0]}>
                {ndg.map((row) => (
                  <Cell
                    key={row.country}
                    fill={
                      row.country === 'Vietnam' ? '#C0392B' :
                      row.country === 'Philippines' ? '#0E7C86' :
                      '#13314F'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Vietnam (red) edges Philippines (teal) on the composite, driven by stronger readiness (0.43 vs 0.36) — even though Vietnam scores worse on vulnerability.
        </p>
      </Card>

      <Card title="Strategic read" tone="sand">
        <p className="text-sm">
          <b>Philippines</b> is the larger, more multi-peril market — quakes, volcanic, storms — but already has deeper insurance penetration. <b>Vietnam</b> has thinner coverage (92 % uninsured) yet faster physical-asset accumulation (5× the GHG growth rate of PH since 2000). The combination makes Vietnam the stronger commercial opportunity for new product launch.
        </p>
      </Card>
    </div>
  );
}

function Item({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
      {hint && <dd className="text-[11px] text-muted">{hint}</dd>}
    </div>
  );
}
