import { useMemo, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { COUNTRY_TIER, SECTORS, SECTOR_RESIDUAL_PCT, sectorTier, adaptiveTier, composite } from '../data/cedent';
import { NDGAIN_2023 } from '../data/keyNumbers';
import canon from '../data/key_numbers_python.json';

const ALL = Object.keys(COUNTRY_TIER);

const TIER_BG: Record<string, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#8B2E1F', E: '#0A1A2A',
};

const COL_A = '#0E7C86';
const COL_B = '#8B2E1F';

// Percent-rank a value within SEA-10 peer group so radar axes are commensurate.
// `lowerIsBetter`: true → small raw → high score (e.g. residuals, damage).
function pctRank(value: number, peers: number[], lowerIsBetter: boolean): number {
  if (peers.length === 0) return 50;
  const sorted = [...peers].sort((a, b) => a - b);
  const idx = sorted.findIndex((v) => v >= value);
  const rank = idx === -1 ? sorted.length : idx;
  const pct = (rank / Math.max(1, sorted.length - 1)) * 100;
  return Math.max(0, Math.min(100, lowerIsBetter ? 100 - pct : pct));
}

const PEER_COUNTRIES = Object.keys(COUNTRY_TIER);
const PEER_RESIDUAL_ABS  = PEER_COUNTRIES.map((c) => Math.abs(COUNTRY_TIER[c].residualPct));
const PEER_NDGAIN        = PEER_COUNTRIES.map((c) => NDGAIN_2023.find((n) => n.country === c)?.gain ?? 0);
const PEER_POWER         = PEER_COUNTRIES.map((c) => Math.abs(SECTOR_RESIDUAL_PCT[c]?.['Power Industry'] ?? 0));
const PEER_AVG_SECTOR    = PEER_COUNTRIES.map((c) => {
  const r = SECTOR_RESIDUAL_PCT[c] ?? {};
  const arr = SECTORS.map((s) => Math.abs(r[s] ?? 0));
  return arr.reduce((a, b) => a + b, 0) / arr.length;
});

export function Compare() {
  const [a, setA] = useState('Vietnam');
  const [b, setB] = useState('Philippines');

  const rowsA = useCountryRows(a);
  const rowsB = useCountryRows(b);

  const radar = useMemo(() => {
    const score = (country: string) => ({
      stirpat: pctRank(Math.abs(COUNTRY_TIER[country].residualPct), PEER_RESIDUAL_ABS, true),
      ndgain:  pctRank(NDGAIN_2023.find((n) => n.country === country)?.gain ?? 0, PEER_NDGAIN, false),
      power:   pctRank(Math.abs(SECTOR_RESIDUAL_PCT[country]?.['Power Industry'] ?? 0), PEER_POWER, true),
      sector:  pctRank(
        (() => {
          const r = SECTOR_RESIDUAL_PCT[country] ?? {};
          const arr = SECTORS.map((s) => Math.abs(r[s] ?? 0));
          return arr.reduce((x, y) => x + y, 0) / arr.length;
        })(),
        PEER_AVG_SECTOR,
        true,
      ),
    });
    const sa = score(a);
    const sb = score(b);
    return [
      { axis: 'STIRPAT discipline', [a]: sa.stirpat, [b]: sb.stirpat },
      { axis: 'ND-GAIN readiness',  [a]: sa.ndgain,  [b]: sb.ndgain  },
      { axis: 'Power tail',         [a]: sa.power,   [b]: sb.power   },
      { axis: 'Cross-sector fit',   [a]: sa.sector,  [b]: sb.sector  },
    ];
  }, [a, b]);

  // Cross-SEA ranking bars for the two metrics that exist for all countries.
  const ndgainBars = useMemo(
    () => NDGAIN_2023
      .filter((n) => n.country in COUNTRY_TIER)
      .map((n) => ({ country: n.country, gain: n.gain }))
      .sort((x, y) => y.gain - x.gain),
    [],
  );
  const residualBars = useMemo(
    () => PEER_COUNTRIES
      .map((c) => ({ country: c, residual: COUNTRY_TIER[c].residualPct }))
      .sort((x, y) => x.residual - y.residual),
    [],
  );

  // Side-by-side per-sector residual bars (the actuarial "exposure shape").
  const sectorBars = useMemo(
    () => SECTORS.map((s) => ({
      sector: s,
      [a]: SECTOR_RESIDUAL_PCT[a]?.[s] ?? 0,
      [b]: SECTOR_RESIDUAL_PCT[b]?.[s] ?? 0,
    })),
    [a, b],
  );

  return (
    <div className="space-y-5">
      <section className="border border-rule bg-paper px-5 py-5 lg:px-10 lg:py-8">
        <Eyebrow>Two-country side-by-side · §5</Eyebrow>
        <h1 className="display mt-2 text-[32px] leading-[1] text-ink lg:text-[56px]">
          Same belt. <span className="italic">Different stories.</span>
        </h1>
        <Hairline className="mt-4" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Picker label="Left" value={a} onChange={setA} disabled={b} />
          <Picker label="Right" value={b} onChange={setB} disabled={a} />
        </div>
      </section>

      {/* Underwriting-score radar — peer-rank within SEA-10, larger = healthier */}
      <Card title="Underwriting-score radar" subtitle="Percent-rank within SEA-10. Larger area = healthier risk.">
        <div className="h-72 lg:h-80">
          <ResponsiveContainer>
            <RadarChart data={radar} margin={{ top: 10, right: 24, bottom: 10, left: 24 }} outerRadius="78%">
              <PolarGrid stroke="rgba(10,26,42,0.18)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#0A1A2A' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'rgba(10,26,42,0.5)' }} angle={45} />
              <Tooltip formatter={(v) => `${Math.round(Number(v))} pctile`} />
              <Radar name={a} dataKey={a} stroke={COL_A} fill={COL_A} fillOpacity={0.30} />
              <Radar name={b} dataKey={b} stroke={COL_B} fill={COL_B} fillOpacity={0.30} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <Hairline className="mt-3" />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px]">
          <Legend dot={COL_A} label={a} />
          <Legend dot={COL_B} label={b} />
          <span className="text-muted">100 = top of SEA-10 peer group on that axis.</span>
        </div>
      </Card>

      {/* Per-sector residual stack — the "where does emissions come from" view */}
      <Card title="Sectoral STIRPAT residual · % over scale-implied" subtitle="Red bars = over-emit relative to scale; green = under-emit.">
        <div className="h-72 lg:h-80">
          <ResponsiveContainer>
            <BarChart data={sectorBars} layout="vertical" margin={{ top: 6, right: 30, left: 18, bottom: 6 }}>
              <XAxis
                type="number"
                tickLine={false}
                axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                fontSize={10}
                tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
              />
              <YAxis
                type="category"
                dataKey="sector"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                width={120}
              />
              <Tooltip formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v)}%`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
              <Bar dataKey={a} fill={COL_A} radius={[0, 2, 2, 0]} />
              <Bar dataKey={b} fill={COL_B} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cross-SEA rank — show where the chosen pair sits among peers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="ND-GAIN 2023 · ranked" subtitle="Adaptive-capacity score. Higher = more resilient.">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={ndgainBars} layout="vertical" margin={{ top: 4, right: 30, left: 12, bottom: 4 }}>
                <XAxis type="number" domain={[0, 80]} tickLine={false} axisLine={false} fontSize={10} />
                <YAxis type="category" dataKey="country" tickLine={false} axisLine={false} fontSize={10} width={110} />
                <Tooltip formatter={(v) => Number(v).toFixed(1)} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
                <Bar dataKey="gain" radius={[0, 2, 2, 0]}>
                  {ndgainBars.map((row) => (
                    <Cell
                      key={row.country}
                      fill={row.country === a ? COL_A : row.country === b ? COL_B : 'rgba(10,26,42,0.30)'}
                    />
                  ))}
                  <LabelList dataKey="gain" position="right" fontSize={9} formatter={(v) => Number(v).toFixed(1)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="STIRPAT residual · ranked" subtitle="Distance from scale-implied baseline. Closer to 0 = better fit.">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={residualBars} layout="vertical" margin={{ top: 4, right: 30, left: 12, bottom: 4 }}>
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`} />
                <YAxis type="category" dataKey="country" tickLine={false} axisLine={false} fontSize={10} width={110} />
                <Tooltip formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v)}%`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
                <Bar dataKey="residual" radius={[0, 2, 2, 0]}>
                  {residualBars.map((row) => (
                    <Cell
                      key={row.country}
                      fill={row.country === a ? COL_A : row.country === b ? COL_B : 'rgba(10,26,42,0.30)'}
                    />
                  ))}
                  <LabelList dataKey="residual" position="right" fontSize={9} formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Number(v)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <section className="border border-rule bg-paper">
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-eyebrow text-muted font-medium">Metric</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-ink">{a}</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-ink">{b}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rowsA.map((rA, i) => {
              const rB = rowsB[i];
              const winnerA = rA.better === 'higher' ? rA.raw > rB.raw : rA.raw < rB.raw;
              return (
                <tr key={rA.label}>
                  <td className="px-3 py-2.5 text-[12px] text-muted">{rA.label}</td>
                  <td className={['px-3 py-2.5 text-right font-mono tab-num text-[13px]', winnerA ? 'text-ink font-semibold' : 'text-ink/70'].join(' ')}>
                    {rA.value}
                  </td>
                  <td className={['px-3 py-2.5 text-right font-mono tab-num text-[13px]', !winnerA ? 'text-ink font-semibold' : 'text-ink/70'].join(' ')}>
                    {rB.value}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-ink">
              <td className="px-3 py-2.5 text-[10px] uppercase tracking-eyebrow text-muted">Recommended tier</td>
              <td className="px-3 py-2.5 text-right">
                <TierPill t={tierFor(a)} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <TierPill t={tierFor(b)} />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <Card title="Read-out" tone="ink">
        <p className="text-[14px] leading-relaxed">
          {a === 'Vietnam' && b === 'Philippines'
            ? 'VN is the new-product target — power-heavy book, +13 pp LR swing. PH is the renewal-discipline play — mature multi-peril book, +2 pp LR swing.'
            : `Pick where the underwriting margin is — see Stress (07) and Cedent (08) for live pricing on the country chosen.`}
        </p>
      </Card>
    </div>
  );
}

function tierFor(country: string) {
  const ct = COUNTRY_TIER[country].tier;
  const residuals = SECTOR_RESIDUAL_PCT[country] ?? {};
  const evenMix = SECTORS.reduce((acc, s) => acc + (residuals[s] ?? 0), 0) / SECTORS.length;
  const st = sectorTier(evenMix);
  const ndg = NDGAIN_2023.find((n) => n.country === country)?.gain ?? 50;
  const at = adaptiveTier(ndg);
  return composite(ct, st, at);
}

type Row = { label: string; value: string; raw: number; better: 'higher' | 'lower' };

function useCountryRows(country: string): Row[] {
  return useMemo(() => {
    const ct = COUNTRY_TIER[country];
    const ng = NDGAIN_2023.find((n) => n.country === country);
    const vn = (canon.vn_vs_ph as Record<string, Record<string, number>>)[country];
    const ghg = vn?.['GHG 2024 (Mt)'];
    const damage = vn?.['EM-DAT damage USD bn 2018-23'];
    const events = vn?.['EM-DAT events 2018-23'];
    const power = SECTOR_RESIDUAL_PCT[country]?.['Power Industry'] ?? 0;
    return [
      { label: '2024 GHG (Mt)',          value: ghg ? ghg.toFixed(0) : '—',                           raw: ghg ?? 0,                       better: 'lower' },
      { label: 'STIRPAT residual',       value: `${ct.residualPct >= 0 ? '+' : ''}${ct.residualPct}%`, raw: -Math.abs(ct.residualPct),     better: 'higher' },
      { label: 'Power-sector residual',  value: `${power >= 0 ? '+' : ''}${power}%`,                   raw: -Math.abs(power),               better: 'higher' },
      { label: 'ND-GAIN 2023',           value: ng ? ng.gain.toFixed(1) : '—',                        raw: ng?.gain ?? 0,                  better: 'higher' },
      { label: 'EM-DAT events 2018-23',  value: events ? events.toString() : '—',                     raw: events ?? 0,                    better: 'lower' },
      { label: 'EM-DAT damage USD bn',   value: damage ? damage.toFixed(2) : '—',                     raw: damage ?? 0,                    better: 'lower' },
    ];
  }, [country]);
}

function Picker({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled: string }) {
  return (
    <div>
      <p className="eyebrow text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALL.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            disabled={c === disabled}
            className={[
              'min-h-[34px] border px-3 py-1 text-[11px] transition',
              c === value ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink',
              c === disabled ? 'opacity-30' : '',
            ].join(' ')}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function TierPill({ t }: { t: string }) {
  return (
    <span
      className="inline-grid h-7 w-9 place-items-center text-[14px] font-bold text-paper"
      style={{ background: TIER_BG[t] ?? '#13314F' }}
    >
      {t}
    </span>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ink">
      <span className="h-2.5 w-4" style={{ background: dot }} />
      <span className="font-mono text-[10px] uppercase tracking-eyebrow">{label}</span>
    </span>
  );
}
