import { useMemo, useState } from 'react';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { Ticker } from '../components/Ticker';
import {
  COUNTRY_TIER, LOADING, SECTORS, SECTOR_RESIDUAL_PCT,
  adaptiveTier, composite, sectorTier,
} from '../data/cedent';
import { CEDENT_PRESETS, type CedentPreset } from '../data/presets';
import { NDGAIN_2023 } from '../data/keyNumbers';

const COUNTRIES = Object.keys(COUNTRY_TIER);
type Mix = Record<(typeof SECTORS)[number], number>;

const TIER_BG: Record<string, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#8B2E1F', E: '#0A1A2A',
};

const STORAGE_KEY = 'r-ignite.savedCedents.v1';

type SavedCedent = { name: string; country: string; mix: Mix; ndcPlanFiled: boolean; energyMixPct: number; comp: string; loading: number; savedAt: string };

function normalise(mix: Partial<Mix>): Mix {
  const sum = SECTORS.reduce((s, k) => s + (mix[k] ?? 0), 0) || 1;
  return SECTORS.reduce((a, k) => ((a[k] = ((mix[k] ?? 0) / sum) * 100), a), {} as Mix);
}

function loadSaved(): SavedCedent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function Cedent() {
  const [preset, setPreset] = useState<CedentPreset | null>(CEDENT_PRESETS[0]);
  const [country, setCountry] = useState(preset?.country ?? 'Vietnam');
  const [mix, setMix] = useState<Mix>(() => normalise(preset?.mix ?? {}));
  const [ndcPlanFiled, setNdcPlanFiled] = useState(preset?.ndcPlanFiled ?? true);
  const [energyMixPct, setEnergyMixPct] = useState(preset?.energyMixPct ?? 40);
  const [saved, setSaved] = useState<SavedCedent[]>(loadSaved);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const result = useMemo(() => {
    const ct = COUNTRY_TIER[country].tier;
    const residuals = SECTOR_RESIDUAL_PCT[country] ?? {};
    const weightedResidual = SECTORS.reduce((sum, s) => sum + (mix[s] / 100) * (residuals[s] ?? 0), 0);
    let st = sectorTier(weightedResidual);
    // Override 2: energy mix (coal % + 0.5 × gas %) — high carbon mix forces sector ≥ C
    if (energyMixPct >= 50 && (st === 'A' || st === 'B')) st = 'C';
    if (energyMixPct >= 65 && st === 'C') st = 'D';
    const ndg = NDGAIN_2023.find((n) => n.country === country)?.gain ?? 50;
    const at = adaptiveTier(ndg);
    let comp = composite(ct, st, at);
    if (!ndcPlanFiled && (comp === 'A' || comp === 'B')) comp = 'C';
    return { weightedResidual, ct, st, at, comp, ndgain: ndg };
  }, [country, mix, ndcPlanFiled, energyMixPct]);

  const loading = LOADING[result.comp];

  const applyPreset = (p: CedentPreset) => {
    setPreset(p);
    setCountry(p.country);
    setMix(normalise(p.mix));
    setNdcPlanFiled(p.ndcPlanFiled);
    setEnergyMixPct(p.energyMixPct);
  };

  const saveProfile = () => {
    const name = preset?.fullName ?? `${country} cedent`;
    const entry: SavedCedent = {
      name,
      country,
      mix,
      ndcPlanFiled,
      energyMixPct,
      comp: result.comp,
      loading: loading.pct,
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...saved.filter((s) => s.name !== name)].slice(0, 10);
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedToast(`Saved · ${name}`);
      setTimeout(() => setSavedToast(null), 2400);
    } catch { /* localStorage unavailable */ }
  };

  return (
    <div className="space-y-5">
      <section className="border border-ink bg-ink px-5 py-6 text-paper lg:px-10 lg:py-10">
        <Eyebrow tone="paper">Productised · 05_cedent_screening_framework.md</Eyebrow>
        <h1 className="display mt-2 text-[34px] leading-[0.95] lg:text-[60px]">
          Composite tier &amp; premium loading,
          <span className="italic"> live</span>.
        </h1>
        <Hairline className="mt-4 border-paper/20" strong />
        <p className="mt-3 font-serif italic text-[14px] leading-relaxed text-paper/85 lg:text-[18px] lg:max-w-prose">
          Pick a real Vietnamese cedent, set the GWP mix and energy override, toggle NDC alignment. The five-tier rating updates instantly.
        </p>
      </section>

      {/* Real cedent presets — the operational signal */}
      <section className="border border-rule bg-paper px-5 py-5 lg:px-8 lg:py-7">
        <Eyebrow>Vietnamese cedent presets · public-domain mixes</Eyebrow>
        <Hairline className="mt-3" />
        <ul className="mt-3 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {CEDENT_PRESETS.map((p) => {
            const isSel = preset?.id === p.id;
            return (
              <li key={p.id}>
                <button
                  onClick={() => applyPreset(p)}
                  className={[
                    'flex w-full items-start gap-3 border px-3 py-3 text-left transition',
                    isSel ? 'border-ink bg-ink/[0.04]' : 'border-rule hover:bg-ink/[0.02]',
                  ].join(' ')}
                >
                  <Ticker code={p.ticker} tone={isSel ? 'ink' : 'paper'} size="md" />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold text-ink">{p.fullName}</span>
                      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                        {p.country}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-muted">{p.oneLiner}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Country override */}
      <Card title="Country" subtitle="STIRPAT aggregate residual drives the country tier.">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {COUNTRIES.map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              aria-pressed={country === c}
              className={[
                'min-h-[36px] whitespace-nowrap border px-4 py-1.5 text-[12px] transition',
                country === c ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
        <Hairline className="mt-3" />
        <p className="mt-3 font-mono text-[11px] tab-num text-muted">
          STIRPAT residual: {COUNTRY_TIER[country].residualPct >= 0 ? '+' : ''}{COUNTRY_TIER[country].residualPct} % &nbsp;·&nbsp;
          Country tier <span className="text-ink font-semibold">{result.ct}</span> &nbsp;·&nbsp;
          ND-GAIN {result.ndgain.toFixed(1)} &nbsp;·&nbsp;
          Adaptive tier <span className="text-ink font-semibold">{result.at}</span>
        </p>
      </Card>

      {/* GWP mix sliders */}
      <Card title="GWP mix · % of book" subtitle="Adjust to model the actual cedent retention.">
        <div className="space-y-2">
          {SECTORS.map((s) => {
            const sliderId = `mix-${s.replace(/\s+/g, '-')}`;
            return (
              <div key={s} className="grid grid-cols-[120px_1fr_42px] items-center gap-3">
                <label htmlFor={sliderId} className="text-[11px] text-muted">{s}</label>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={100}
                  value={mix[s]}
                  aria-valuetext={`${s}, ${mix[s].toFixed(0)} percent`}
                  onChange={(e) => setMix({ ...mix, [s]: Number(e.target.value) })}
                  className="rule-slider"
                />
                <span className="text-right font-mono text-[11px] tab-num text-ink">
                  {mix[s].toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
        <Hairline className="mt-3" />
        <button
          onClick={() => setMix(normalise(mix))}
          className="mt-3 font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
        >
          Normalise to 100 % →
        </button>
      </Card>

      {/* Energy mix override (Override 2) */}
      <Card title="Energy mix override · Override 2" subtitle="Coal % + 0.5 × Gas %. Heavy mix can force sector tier ≥ C.">
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={energyMixPct}
            onChange={(e) => setEnergyMixPct(Number(e.target.value))}
            aria-label="Energy mix"
            className="rule-slider"
          />
          <span className="display tab-num text-[24px] text-ink italic">{energyMixPct}%</span>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Threshold cues: ≥50 % bumps to C · ≥65 % bumps to D. Closes the gap to the printed scorecard.
        </p>
      </Card>

      {/* NDC toggle */}
      <Card title="NDC alignment" tone="sand">
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4">
          <span className="text-[13px] text-ink">
            Cedent has a <b>credible</b>, NDC-aligned transition plan filed with regulator?
          </span>
          <input
            type="checkbox"
            checked={ndcPlanFiled}
            onChange={(e) => setNdcPlanFiled(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-sea"
          />
        </label>
        <p className="mt-1 text-[11px] text-muted">
          When unchecked, A/B composites are downgraded to C — Article 2.1(c) screen.
        </p>
      </Card>

      {/* Composite hero */}
      <section className="border border-ink bg-ink px-5 py-6 text-paper">
        <Eyebrow tone="paper">Composite</Eyebrow>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-5">
          <div
            className="grid h-[112px] w-[112px] place-items-center text-paper"
            style={{ background: TIER_BG[result.comp] }}
          >
            <span className="display text-[88px] leading-none italic">{result.comp}</span>
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[14px] font-semibold">{loading.label}</p>
              <p className="mt-1 text-[11px] text-paper/70">
                Mode of (country, sector, adaptive). Sector D/E forces composite ≥ D.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-paper/15 pt-3">
              <Tier label="Country" t={result.ct} />
              <Tier label="Sector" t={result.st} />
              <Tier label="Adaptive" t={result.at} />
            </div>
          </div>
        </div>

        <Hairline className="mt-5 border-paper/20" strong />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <StatBig
            value={`${loading.pct >= 0 ? '+' : ''}${loading.pct}%`}
            label="Premium loading"
            accent={loading.pct > 0 ? 'amber' : 'sage'}
            size="lg"
          />
          <div className="text-right">
            <Eyebrow tone="paper">Sector residual</Eyebrow>
            <p className="display tab-num mt-1 text-[28px] italic text-paper">
              {result.weightedResidual >= 0 ? '+' : ''}{result.weightedResidual.toFixed(0)}%
            </p>
            <p className="mt-1 text-[11px] text-paper/70">Weighted by GWP mix.</p>
          </div>
        </div>
      </section>

      {/* Save profile */}
      <div className="flex items-center justify-between gap-3 border border-rule bg-paper px-5 py-4">
        <div>
          <p className="eyebrow text-muted">Save for the Brief screen</p>
          <p className="mt-1 text-[12px] text-ink">
            {saved.length} saved · used to populate the executive memo.
          </p>
        </div>
        <button
          onClick={saveProfile}
          className="border border-ink bg-paper px-4 py-2 text-[12px] font-semibold text-ink transition hover:bg-ink hover:text-paper"
        >
          Save cedent →
        </button>
      </div>

      {savedToast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 border border-ink bg-paper px-4 py-2 font-mono text-[11px] uppercase tracking-eyebrow text-ink shadow-plate"
        >
          {savedToast}
        </div>
      )}
    </div>
  );
}

function Tier({ label, t }: { label: string; t: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[9px] uppercase tracking-eyebrow text-paper/55">{label}</span>
      <span
        className="grid h-7 w-9 place-items-center text-[14px] font-bold text-paper"
        style={{ background: TIER_BG[t] }}
      >
        {t}
      </span>
    </div>
  );
}
