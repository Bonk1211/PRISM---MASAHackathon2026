import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Card } from '../components/Card';
import {
  EMDAT_VN_PH, NDGAIN_2023, MARKET_STRUCTURE, LR_SENSITIVITY_PP, YAGI_2024,
} from '../data/keyNumbers';
import { COUNTRY_TIER, SECTOR_RESIDUAL_PCT } from '../data/cedent';

type Mode = 'compare' | 'single';
type Side = 'vietnam' | 'philippines';

const VN_COLOUR = '#C0392B';
const PH_COLOUR = '#0E7C86';

const SECTORS = ['Power Industry', 'Industrial Combustion', 'Transport', 'Agriculture'] as const;
const SECTOR_LABEL: Record<string, string> = {
  'Power Industry': 'Power Ind.',
  'Industrial Combustion': 'Ind. Comb.',
  Transport: 'Transport',
  Agriculture: 'Agric.',
};

export function HotSpots() {
  const [mode, setMode] = useState<Mode>('compare');
  const [side, setSide] = useState<Side>('vietnam');

  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Question 3 — natural experiment</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Vietnam vs Philippines — same typhoon belt, different stories.</h1>
        <p className="mt-2 text-sm opacity-90">
          Same hazard, opposite transition profile. PH carries 2.1× the cumulative damage; VN carries the steeper loss-ratio swing per dollar of Power-heavy GWP.
        </p>
        <div className="mt-3 inline-flex rounded-full bg-paper/10 p-0.5">
          {(['compare', 'single'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={[
                'min-h-[36px] rounded-full px-4 py-2 text-[11px] font-semibold capitalize transition',
                mode === m ? 'bg-paper text-ink' : 'text-paper/80',
              ].join(' ')}
            >
              {m === 'compare' ? 'Compare' : 'Single country'}
            </button>
          ))}
        </div>
      </Card>

      {mode === 'compare' ? <CompareView /> : <SingleView side={side} setSide={setSide} />}
    </div>
  );
}

function CompareView() {
  const vn = EMDAT_VN_PH.vietnam;
  const ph = EMDAT_VN_PH.philippines;
  const ndg = (iso: string) => NDGAIN_2023.find((n) => n.iso3 === iso)!;
  const ndgVN = ndg('VNM');
  const ndgPH = ndg('PHL');
  const insVN = (vn.damageUsdBn2024 * 1000 * EMDAT_VN_PH.insuredShareSigma) / 6;
  const insPH = (ph.damageUsdBn2024 * 1000 * EMDAT_VN_PH.insuredShareSigma) / 6;

  const sectorData = SECTORS.map((s) => ({
    sector: SECTOR_LABEL[s],
    vn: SECTOR_RESIDUAL_PCT.Vietnam[s] ?? 0,
    ph: SECTOR_RESIDUAL_PCT.Philippines[s] ?? 0,
  }));

  return (
    <>
      <CompareLegend />

      <Card title="Hazard & loss" subtitle="EM-DAT 2018-2023 (HDX snapshot 2026-04-24); 2024-CPI USD.">
        <CompareTable
          rows={[
            ['Events / yr', vn.perYear.toFixed(1), ph.perYear.toFixed(1)],
            ['Storms / floods', `${vn.storms} / ${vn.floods}`, `${ph.storms} / ${ph.floods}`],
            ['Other (quake / volcanic)', vn.other.toString(), ph.other.toString()],
            ['Affected (m)', vn.affectedM.toFixed(1), ph.affectedM.toFixed(1)],
            ['Fatalities', vn.deaths.toLocaleString(), ph.deaths.toLocaleString()],
            ['Damage USD bn', vn.damageUsdBn2024.toFixed(2), ph.damageUsdBn2024.toFixed(2)],
            ['Insured / yr (σ12 %)', `USD ${insVN.toFixed(0)} m`, `USD ${insPH.toFixed(0)} m`],
          ]}
        />
      </Card>

      <Card title="Adaptive & tier" subtitle="ND-GAIN 2023 (Notre Dame); country tier per cedent framework §3.">
        <CompareTable
          rows={[
            ['ND-GAIN composite', ndgVN.gain.toFixed(1), ndgPH.gain.toFixed(1)],
            ['Readiness (↑ better)', ndgVN.ready.toFixed(3), ndgPH.ready.toFixed(3)],
            ['Vulnerability (↓ better)', ndgVN.vuln.toFixed(3), ndgPH.vuln.toFixed(3)],
            ['STIRPAT residual', `${COUNTRY_TIER.Vietnam.residualPct >= 0 ? '+' : ''}${COUNTRY_TIER.Vietnam.residualPct} %`, `${COUNTRY_TIER.Philippines.residualPct} %`],
          ]}
          tierRow={{ vn: COUNTRY_TIER.Vietnam.tier, ph: COUNTRY_TIER.Philippines.tier }}
        />
      </Card>

      <Card title="Market structure" subtitle="Swiss Re sigma 1/2024; PH IC + VN MOF Q4 2024 reports.">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <MarketTile country="Vietnam" colour={VN_COLOUR} m={MARKET_STRUCTURE.vietnam} lrPp={LR_SENSITIVITY_PP.vietnam} />
          <MarketTile country="Philippines" colour={PH_COLOUR} m={MARKET_STRUCTURE.philippines} lrPp={LR_SENSITIVITY_PP.philippines} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          LR sensitivity = Hot House → Net Zero swing for a Power-heavy book in each country (per deep-dive §7).
        </p>
      </Card>

      <Card title="Sectoral residual %" subtitle="Over STIRPAT-implied. Source: SECTOR_RESIDUAL_PCT.">
        <div
          role="img"
          aria-label={`Bar chart: Vietnam vs Philippines sectoral residual percent over STIRPAT-implied. ${sectorData.map((d) => `${d.sector} — Vietnam ${d.vn >= 0 ? '+' : ''}${d.vn}%, Philippines ${d.ph >= 0 ? '+' : ''}${d.ph}%`).join('; ')}.`}
          className="h-48"
        >
          <ResponsiveContainer>
            <BarChart layout="vertical" data={sectorData} margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <XAxis type="number" domain={[-50, 300]} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis type="category" dataKey="sector" width={90} tickLine={false} axisLine={false} fontSize={10} />
              <Tooltip formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v)} %`} cursor={{ fill: 'rgba(11,31,51,0.04)' }} />
              <ReferenceLine x={0} stroke="#0B1F33" strokeOpacity={0.3} />
              <Bar dataKey="vn" name="Vietnam" fill={VN_COLOUR} radius={[0, 3, 3, 0]} barSize={10} />
              <Bar dataKey="ph" name="Philippines" fill={PH_COLOUR} radius={[0, 3, 3, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="2024 live data — Typhoon Yagi" tone="sand">
        <p className="text-sm">
          Region-wide: <b>USD {YAGI_2024.economicLossUsdBn.toFixed(0)} bn</b> economic / <b>USD {YAGI_2024.insuredLossUsdBn.toFixed(0)} bn</b> insured (Munich Re — third-costliest Asian cyclone of the decade). Vietnam-only insured aggregate <b>~USD {YAGI_2024.vnInsuredUsdM} m</b>.
        </p>
        <p className="mt-1 text-[11px] text-muted italic">{YAGI_2024.hannoverNote}</p>
      </Card>

      <Card title="Strategic read" tone="ink">
        <ul className="space-y-1.5 text-sm">
          <li>• <b>VN</b> = greenfield, power-heavy, <b>+13 pp</b> LR swing under Hot House. Launch parametric typhoon + ESG screen here.</li>
          <li>• <b>PH</b> = mature multi-peril book, lower LR swing (<b>+2 pp</b>), 21 non-storm events 2018-23. Deepen cat-XL capacity, A-tier discount as retention lever.</li>
          <li className="pt-1 border-t border-paper/15"><b>Conclusion: VN is the new-product target. PH is the renewal-discipline play.</b></li>
        </ul>
      </Card>
    </>
  );
}

function CompareLegend() {
  return (
    <div className="flex items-center gap-4 px-1 text-[11px] font-medium text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: VN_COLOUR }} />
        Vietnam
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PH_COLOUR }} />
        Philippines
      </span>
    </div>
  );
}

function CompareTable({
  rows, tierRow,
}: {
  rows: [string, string, string][];
  tierRow?: { vn: string; ph: string };
}) {
  return (
    <dl className="divide-y divide-ink/5 text-sm">
      {rows.map(([label, vn, ph]) => (
        <div key={label} className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-1.5">
          <dt className="text-[12px] text-muted">{label}</dt>
          <dd className="w-16 text-right font-semibold tabular-nums text-ink">{vn}</dd>
          <dd className="w-16 text-right font-semibold tabular-nums text-ink">{ph}</dd>
        </div>
      ))}
      {tierRow && (
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 py-1.5">
          <dt className="text-[12px] text-muted">Country tier</dt>
          <dd className="w-16 text-right"><TierBadge t={tierRow.vn} /></dd>
          <dd className="w-16 text-right"><TierBadge t={tierRow.ph} /></dd>
        </div>
      )}
    </dl>
  );
}

const TIER_BG: Record<string, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#C0392B', E: '#0B1F33',
};

function TierBadge({ t }: { t: string }) {
  return (
    <span
      className="inline-grid h-6 w-6 place-items-center rounded-md text-xs font-bold text-white"
      style={{ background: TIER_BG[t] ?? '#13314F' }}
    >
      {t}
    </span>
  );
}

function MarketTile({
  country, colour, m, lrPp,
}: {
  country: string;
  colour: string;
  m: { penetrationPct: number; protectionGapPct: number };
  lrPp: number;
}) {
  return (
    <div className="rounded-xl border border-ink/10 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: colour }} />
        {country}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-y-1.5 text-[11px]">
        <div className="text-muted">Penetration</div>
        <div className="text-right font-bold tabular-nums text-ink">{m.penetrationPct.toFixed(1)} %</div>
        <div className="text-muted">Protection gap</div>
        <div className="text-right font-bold tabular-nums text-ink">{m.protectionGapPct} %</div>
        <div className="text-muted">LR sensitivity</div>
        <div className="text-right font-bold tabular-nums" style={{ color: lrPp > 5 ? '#C0392B' : '#3F8A66' }}>+{lrPp.toFixed(1)} pp</div>
      </div>
    </div>
  );
}

function SingleView({ side, setSide }: { side: Side; setSide: (s: Side) => void }) {
  const c = EMDAT_VN_PH[side];
  const ndg = [...NDGAIN_2023].sort((a, b) => b.gain - a.gain);

  return (
    <>
      <div className="rounded-full bg-white p-1 shadow-card">
        <div className="grid grid-cols-2 gap-1">
          {(['vietnam', 'philippines'] as Side[]).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={[
                'min-h-[44px] rounded-full py-2 text-sm font-semibold capitalize transition',
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
        <div
          role="img"
          aria-label={`Bar chart: ND-GAIN 2023 composite ranking. ${ndg.map((r) => `${r.country} ${r.gain.toFixed(1)}`).join('; ')}.`}
          className="h-56"
        >
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
                      row.country === 'Vietnam' ? VN_COLOUR :
                      row.country === 'Philippines' ? PH_COLOUR :
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
    </>
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
