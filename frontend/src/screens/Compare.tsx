import { useMemo, useState } from 'react';
import { Card, Eyebrow, Hairline } from '../components/Card';
import { COUNTRY_TIER, SECTORS, SECTOR_RESIDUAL_PCT, sectorTier, adaptiveTier, composite } from '../data/cedent';
import { NDGAIN_2023 } from '../data/keyNumbers';
import canon from '../data/key_numbers_python.json';

const ALL = Object.keys(COUNTRY_TIER);

const TIER_BG: Record<string, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#8B2E1F', E: '#0A1A2A',
};

export function Compare() {
  const [a, setA] = useState('Vietnam');
  const [b, setB] = useState('Philippines');

  const rowsA = useCountryRows(a);
  const rowsB = useCountryRows(b);

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
