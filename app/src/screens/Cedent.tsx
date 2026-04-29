import { useMemo, useState } from 'react';
import { Card, StatBig } from '../components/Card';
import {
  COUNTRY_TIER, LOADING, SECTORS, SECTOR_RESIDUAL_PCT,
  adaptiveTier, composite, sectorTier,
} from '../data/cedent';
import { NDGAIN_2023 } from '../data/keyNumbers';

const COUNTRIES = Object.keys(COUNTRY_TIER);
type Mix = Record<(typeof SECTORS)[number], number>;

const PRESETS: { name: string; mix: Partial<Mix> }[] = [
  { name: 'Power-heavy book',   mix: { 'Power Industry': 60, 'Industrial Combustion': 25, Transport: 15 } },
  { name: 'Diversified non-life', mix: { 'Power Industry': 20, Transport: 20, Buildings: 20, Agriculture: 20, Waste: 10, 'Industrial Processes': 10 } },
  { name: 'Manufacturing-led',  mix: { 'Industrial Combustion': 40, 'Industrial Processes': 35, Transport: 15, Buildings: 10 } },
  { name: 'Agri-led',           mix: { Agriculture: 70, 'Power Industry': 15, Transport: 15 } },
];

function normalise(mix: Partial<Mix>): Mix {
  const sum = SECTORS.reduce((s, k) => s + (mix[k] ?? 0), 0) || 1;
  return SECTORS.reduce((a, k) => ((a[k] = ((mix[k] ?? 0) / sum) * 100), a), {} as Mix);
}

export function Cedent() {
  const [country, setCountry] = useState('Vietnam');
  const [mix, setMix] = useState<Mix>(() => normalise(PRESETS[0].mix));
  const [ndcPlanFiled, setNdcPlanFiled] = useState(true);

  const result = useMemo(() => {
    const ct = COUNTRY_TIER[country].tier;
    const residuals = SECTOR_RESIDUAL_PCT[country] ?? {};
    const weightedResidual = SECTORS.reduce((sum, s) => sum + (mix[s] / 100) * (residuals[s] ?? 0), 0);
    const st = sectorTier(weightedResidual);
    const ndg = NDGAIN_2023.find((n) => n.country === country)?.gain ?? 50;
    const at = adaptiveTier(ndg);
    let comp = composite(ct, st, at);
    if (!ndcPlanFiled && (comp === 'A' || comp === 'B')) comp = 'C'; // simplified NDC override
    return { weightedResidual, ct, st, at, comp, ndgain: ndg };
  }, [country, mix, ndcPlanFiled]);

  const loading = LOADING[result.comp];

  return (
    <div className="space-y-3">
      <Card tone="ink">
        <p className="text-[11px] uppercase tracking-widest text-paper/60">Productised — 05_cedent_screening_framework.md</p>
        <h1 className="mt-1 text-lg font-bold leading-tight">Composite tier &amp; premium loading, live.</h1>
        <p className="mt-2 text-sm opacity-90">
          Pick a country, set the cedent&apos;s GWP mix, toggle their NDC alignment.
          The five-tier rating updates instantly — same logic as the Shiny app&apos;s Reinsurance Impact tab.
        </p>
      </Card>

      <Card title="Country" subtitle="STIRPAT aggregate residual drives the country tier.">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={[
                'rounded-full whitespace-nowrap px-3 py-1.5 text-xs font-medium transition',
                country === c ? 'bg-ink text-paper' : 'bg-white text-ink shadow-card',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Residual: {COUNTRY_TIER[country].residualPct >= 0 ? '+' : ''}{COUNTRY_TIER[country].residualPct} % over scale-implied · Country tier <b>{result.ct}</b> · ND-GAIN 2023: {result.ndgain.toFixed(1)} · Adaptive tier <b>{result.at}</b>.
        </p>
      </Card>

      <Card title="Cedent GWP mix (%)" subtitle="Pick a preset or roll your own with the sliders.">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setMix(normalise(p.mix))}
              className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-[11px] font-medium text-ink"
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          {SECTORS.map((s) => (
            <div key={s} className="flex items-center gap-3">
              <label className="w-36 text-[11px] text-muted">{s}</label>
              <input
                type="range"
                min={0}
                max={100}
                value={mix[s]}
                onChange={(e) => setMix({ ...mix, [s]: Number(e.target.value) })}
                className="flex-1 accent-sea"
              />
              <span className="w-10 text-right text-[11px] tabular-nums">{mix[s].toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setMix(normalise(mix))}
          className="mt-2 text-[11px] text-sea underline-offset-2 hover:underline"
        >
          Normalise to 100 %
        </button>
      </Card>

      <Card title="NDC alignment" tone="sand">
        <label className="flex items-center justify-between gap-4">
          <span className="text-sm">
            Cedent has a <b>credible</b>, NDC-aligned transition plan filed with regulator?
          </span>
          <input
            type="checkbox"
            checked={ndcPlanFiled}
            onChange={(e) => setNdcPlanFiled(e.target.checked)}
            className="h-5 w-5 accent-sea"
          />
        </label>
        <p className="mt-1 text-[11px] text-muted">
          When unchecked, A/B composites are downgraded to C (Article 2.1(c) screen). Override per §5 of cedent framework.
        </p>
      </Card>

      <Card title="Composite tier" tone="ink">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-7xl font-extrabold leading-none">{result.comp}</div>
            <div className="mt-2 text-sm font-semibold">{loading.label}</div>
          </div>
          <div className="space-y-2 text-right text-xs">
            <Tier label="Country" t={result.ct} />
            <Tier label="Sector"  t={result.st} />
            <Tier label="Adaptive" t={result.at} />
            <div className="mt-2 text-paper/70">
              Weighted sector residual: <b>{result.weightedResidual.toFixed(0)} %</b>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-paper/10 pt-3">
          <StatBig
            value={`${loading.pct >= 0 ? '+' : ''}${loading.pct} %`}
            label="Loading"
            accent={loading.pct > 0 ? 'amber' : 'sage'}
          />
          <div className="col-span-2 text-xs leading-snug text-paper/80">
            Composite = mode of (country, sector, adaptive). Sector D/E forces composite ≥ D. Premium loading per §8 of cedent framework.
          </div>
        </div>
      </Card>
    </div>
  );
}

function Tier({ label, t }: { label: string; t: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-paper/60">{label}</span>
      <span className="grid h-6 w-6 place-items-center rounded-md bg-paper/10 text-sm font-bold">{t}</span>
    </div>
  );
}
