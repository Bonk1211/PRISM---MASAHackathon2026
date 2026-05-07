// Pricing Simulator — the demo's centrepiece.
// Merges Stress + Cedent into a single underwriter workflow: capture inputs in
// box-selection cards (counterparty, sector mix, adaptive context, scenario,
// capital), then click "Run Simulation" to open a live-progress modal that
// walks through 9 stages and ends with a saved cedent profile that flows into
// the Brief screen via localStorage key `prism.savedCedents.v1`.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine, ReferenceDot,
} from 'recharts';
import { Eyebrow, Hairline, StatBig } from '../components/Card';
import { Ticker } from '../components/Ticker';
import { InputCard } from '../components/pricing/InputCard';
import { SimulationModal, type SimulationInputs, type SimulationResult } from '../components/SimulationModal';
import {
  COUNTRY_TIER, LOADING, SECTORS, SECTOR_RESIDUAL_PCT,
  adaptiveTier, composite, sectorTier,
} from '../data/cedent';
import { CEDENT_PRESETS, type CedentPreset } from '../data/presets';
import { NDGAIN_2023, PORTFOLIO, STRESS_2030 } from '../data/keyNumbers';

const SECTOR_HUE: Record<(typeof SECTORS)[number], string> = {
  'Power Industry':         '#8B2E1F',
  'Industrial Combustion':  '#B8761C',
  'Industrial Processes':   '#0E7C86',
  'Transport':              '#3F8A66',
  'Agriculture':            '#5C7C3D',
  'Buildings':              '#4F6D8A',
  'Waste':                  '#7A6E55',
  'Fugitive Energy':        '#0A1A2A',
};

type Mix = Record<(typeof SECTORS)[number], number>;

const COUNTRIES = Object.keys(COUNTRY_TIER);
const STORAGE_KEY = 'prism.savedCedents.v1';

const SCENARIO_COLOURS: Record<string, string> = {
  'Net Zero 2050':      '#3F8A66',
  'Mitigation':         '#0E7C86',
  'Delayed Transition': '#B8761C',
  'Current Policies':   '#8B2E1F',
};

type SavedCedent = {
  name: string;
  country: string;
  mix: Mix;
  ndcPlanFiled: boolean;
  energyMixPct: number;
  comp: string;
  loading: number;
  scenario: string;
  elasticity: number;
  lr: number;
  expectedLossUsdM: number;
  capitalAddPct: number;
  savedAt: string;
};

function normalise(mix: Partial<Mix>): Mix {
  const sum = SECTORS.reduce((s, k) => s + (mix[k] ?? 0), 0) || 1;
  return SECTORS.reduce((a, k) => ((a[k] = ((mix[k] ?? 0) / sum) * 100), a), {} as Mix);
}

const INITIAL_PRESET = CEDENT_PRESETS[0];

type StepNo = 1 | 2 | 3 | 4 | 5 | 6;
const STEPS: { n: StepNo; short: string; question: string; help: string }[] = [
  { n: 1, short: 'Cedent',    question: 'Who are we pricing?',         help: 'Pick a preset cedent or override the country.' },
  { n: 2, short: 'Sectors',   question: 'How is the book split?',      help: 'Allocate GWP retention across sectors.' },
  { n: 3, short: 'Adapt',     question: 'How adaptive is the country?',help: 'ND-GAIN, NDC plan, energy-mix override.' },
  { n: 4, short: 'Scenario',  question: 'Which 2030 pathway?',         help: 'NGFS scenario + elasticity ε.' },
  { n: 5, short: 'Capital',   question: 'What\'s the treaty notional?',help: 'GWP and base loss ratio.' },
  { n: 6, short: 'Review',    question: 'Ready to price.',             help: 'Confirm inputs, then run the simulation.' },
];

export function Pricing() {
  const [preset, setPreset] = useState<CedentPreset | null>(INITIAL_PRESET);
  const [country, setCountry] = useState(INITIAL_PRESET.country);
  const [mix, setMix] = useState<Mix>(() => normalise(INITIAL_PRESET.mix));
  const [ndcPlanFiled, setNdcPlanFiled] = useState(INITIAL_PRESET.ndcPlanFiled);
  const [energyMixPct, setEnergyMixPct] = useState(INITIAL_PRESET.energyMixPct);

  const [scenario, setScenario] = useState('Current Policies');
  const [elasticity, setElasticity] = useState(PORTFOLIO.elasticity);

  const [gwp, setGwp] = useState(PORTFOLIO.gwpUsdM);
  const [baseLr, setBaseLr] = useState(PORTFOLIO.baseLossRatio);

  const [step, setStep] = useState<StepNo>(1);
  const goNext = () => setStep((s) => (Math.min(6, s + 1) as StepNo));
  const goPrev = () => setStep((s) => (Math.max(1, s - 1) as StepNo));

  const [simOpen, setSimOpen] = useState(false);
  const [simInputs, setSimInputs] = useState<SimulationInputs | null>(null);
  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Load persisted cedent count
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown[];
        if (Array.isArray(arr)) setSavedCount(arr.length);
      }
    } catch (_) { /* localStorage unavailable */ }
  }, []);

  // Live preview — same compute the simulation modal runs, but reactive so the
  // HUD updates as users tweak inputs. Numbers match what the modal will show.
  const preview = useMemo(() => {
    const ct = COUNTRY_TIER[country].tier;
    const residuals = SECTOR_RESIDUAL_PCT[country] ?? {};
    const weightedResidual = SECTORS.reduce((sum, s) => sum + (mix[s] / 100) * (residuals[s] ?? 0), 0);
    let st = sectorTier(weightedResidual);
    if (energyMixPct >= 50 && (st === 'A' || st === 'B')) st = 'C';
    if (energyMixPct >= 65 && st === 'C') st = 'D';
    const ndg = NDGAIN_2023.find((n) => n.country === country)?.gain ?? 50;
    const at = adaptiveTier(ndg);
    let comp = composite(ct, st, at);
    if (!ndcPlanFiled && (comp === 'A' || comp === 'B')) comp = 'C';
    const loadingPct = LOADING[comp].pct;

    // Mirrors Stress.tsx + backend/agent.py stress_compute exactly.
    const ref = STRESS_2030.find((s) => s.scenario === 'Current Policies');
    const sel = STRESS_2030.find((s) => s.scenario === scenario);
    const pctChg = ref && sel ? (sel.emissionsMt - ref.emissionsMt) / ref.emissionsMt : 0;
    const lr = baseLr * (1 + elasticity * pctChg);
    const lossUsdM = gwp * lr;
    const hothouseLoss = gwp * baseLr;
    const swingUsdM = hothouseLoss - lossUsdM;
    const lrPp = (lr - baseLr) * 100;
    const capitalAddPct = Math.max(0, Math.round((lr - baseLr) * 100 * 0.7));

    return {
      ct, st, at, comp, loadingPct,
      weightedResidual, ndgain: ndg,
      lr, lossUsdM, hothouseLoss, swingUsdM, lrPp, capitalAddPct,
    };
  }, [country, mix, energyMixPct, ndcPlanFiled, scenario, elasticity, baseLr, gwp]);

  const mixSum = useMemo(() => SECTORS.reduce((a, k) => a + mix[k], 0), [mix]);
  const mixNormalised = Math.abs(mixSum - 100) < 0.5;

  // Live scenario fan — what the four NGFS pathways produce at current ε.
  const scenarioFan = useMemo(() => {
    const ref = STRESS_2030.find((s) => s.scenario === 'Current Policies');
    return STRESS_2030.map((s) => {
      const pctChg = ref ? (s.emissionsMt - ref.emissionsMt) / ref.emissionsMt : 0;
      const lr = baseLr * (1 + elasticity * pctChg);
      return {
        scenario: s.scenario,
        family: s.family,
        lr,
        lrPct: lr * 100,
        lossUsdM: gwp * lr,
      };
    });
  }, [baseLr, elasticity, gwp]);

  // Elasticity sensitivity curve for the selected scenario.
  const elasticityCurve = useMemo(() => {
    const ref = STRESS_2030.find((s) => s.scenario === 'Current Policies');
    const sel = STRESS_2030.find((s) => s.scenario === scenario);
    if (!ref || !sel) return [];
    const pctChg = (sel.emissionsMt - ref.emissionsMt) / ref.emissionsMt;
    const points: { eps: number; lr: number; lrPct: number; lossUsdM: number }[] = [];
    for (let eps = 0.3; eps <= 1.2 + 1e-9; eps += 0.05) {
      const lr = baseLr * (1 + eps * pctChg);
      points.push({ eps: Number(eps.toFixed(2)), lr, lrPct: lr * 100, lossUsdM: gwp * lr });
    }
    return points;
  }, [baseLr, gwp, scenario]);

  const liveLrPct = preview.lr * 100;

  const applyPreset = (p: CedentPreset) => {
    setPreset(p);
    setCountry(p.country);
    setMix(normalise(p.mix));
    setNdcPlanFiled(p.ndcPlanFiled);
    setEnergyMixPct(p.energyMixPct);
  };

  const reset = () => {
    applyPreset(INITIAL_PRESET);
    setScenario('Current Policies');
    setElasticity(PORTFOLIO.elasticity);
    setGwp(PORTFOLIO.gwpUsdM);
    setBaseLr(PORTFOLIO.baseLossRatio);
  };

  const runSimulation = () => {
    const inputs: SimulationInputs = {
      country, mix, ndcPlanFiled, energyMixPct,
      scenario, elasticity,
      gwpUsdM: gwp,
      baseLossRatio: baseLr,
    };
    setSimInputs(inputs);
    setSimOpen(true);
  };

  const saveProfile = (result: SimulationResult) => {
    const name = preset?.fullName ?? `${country} cedent`;
    const entry: SavedCedent = {
      name,
      country,
      mix,
      ndcPlanFiled,
      energyMixPct,
      comp: result.composite,
      loading: result.loadingPct,
      scenario,
      elasticity,
      lr: result.lr,
      expectedLossUsdM: result.expectedLossUsdM,
      capitalAddPct: result.capitalAddPct,
      savedAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const prev = raw ? (JSON.parse(raw) as SavedCedent[]) : [];
      const next = [entry, ...prev.filter((s) => s.name !== name)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSavedCount(next.length);
      setToast(`Saved · ${name}`);
      setTimeout(() => setToast(null), 2400);
    } catch (_) { /* ignore */ }
  };


  const energyHint =
    energyMixPct >= 65 ? 'High-carbon · forces sector ≥ D'
    : energyMixPct >= 50 ? 'Carbon-heavy · forces sector ≥ C'
    : 'Diversified mix';

  return (
    <div className="space-y-4">
      {/* Wizard stepper — single source of position cue */}
      <nav aria-label="Strategy steps" className="border border-rule bg-paper px-4 py-3">
        <ol className="flex flex-wrap items-center gap-1.5">
          {STEPS.map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <li key={s.n} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStep(s.n)}
                  aria-current={active ? 'step' : undefined}
                  className={[
                    'flex items-baseline gap-1.5 border px-2.5 py-1 transition',
                    active
                      ? 'border-ink bg-ink text-paper'
                      : done
                        ? 'border-ink/60 bg-ink/[0.05] text-ink hover:bg-ink/10'
                        : 'border-rule bg-paper text-muted hover:border-ink hover:text-ink',
                  ].join(' ')}
                >
                  <span className="font-mono text-[9px] tab-num">0{s.n}</span>
                  <span className="text-[11px]">{s.short}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="font-mono text-[10px] text-muted">›</span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-rule pt-2">
          <p className="font-serif text-[14px] italic leading-snug text-ink lg:text-[16px]">
            {STEPS[step - 1].question}
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:block">
            {STEPS[step - 1].help}
          </p>
        </div>
      </nav>

      {/* Live HUD — recomputes inline from the same formula the modal uses */}
      <section className="border border-rule bg-paper">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-2">
          <Eyebrow>Live preview · {scenario}</Eyebrow>
          <Link
            to="/pipeline"
            className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
          >
            See pipeline →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-px bg-rule lg:grid-cols-5">
          <HudTile
            eyebrow="Composite"
            value={preview.comp}
            sub={LOADING[preview.comp].label}
            accent="ink"
          />
          <HudTile
            eyebrow="Loading"
            value={`${preview.loadingPct >= 0 ? '+' : ''}${preview.loadingPct}%`}
            sub={`Premium vs reference`}
            accent={preview.loadingPct > 0 ? 'amber' : preview.loadingPct < 0 ? 'sage' : 'ink'}
          />
          <HudTile
            eyebrow="Loss ratio"
            value={`${(preview.lr * 100).toFixed(1)}%`}
            sub={`${preview.lrPp >= 0 ? '+' : ''}${preview.lrPp.toFixed(1)} pp vs base`}
            accent={preview.lr <= baseLr ? 'sage' : 'rust'}
          />
          <HudTile
            eyebrow="Expected loss"
            value={`USD ${Math.round(preview.lossUsdM).toLocaleString()}m`}
            sub={`On USD ${Math.round(gwp).toLocaleString()}m GWP`}
            accent="sea"
          />
          <HudTile
            eyebrow="Δ vs Hot House"
            value={`${preview.swingUsdM >= 0 ? '−' : '+'}USD ${Math.abs(Math.round(preview.swingUsdM))}m`}
            sub={`Capital +${preview.capitalAddPct}%`}
            accent={preview.swingUsdM >= 0 ? 'sage' : 'rust'}
          />
        </div>
      </section>

      {/* Charts row — visible only on Scenario step + Review step */}
      {(step === 4 || step === 6) && (
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="border border-rule bg-paper">
          <div className="flex items-baseline justify-between border-b border-rule px-4 py-2">
            <Eyebrow>Loss-ratio fan · 4 NGFS pathways</Eyebrow>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              ε {elasticity.toFixed(2)}
            </span>
          </div>
          <div className="h-56 px-2 pt-2 pb-1">
            <ResponsiveContainer>
              <BarChart data={scenarioFan} margin={{ top: 6, right: 18, left: -12, bottom: 28 }}>
                <XAxis
                  dataKey="scenario"
                  tickLine={false}
                  axisLine={false}
                  fontSize={9}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v, name) =>
                    String(name) === 'lrPct' ? [`${Number(v).toFixed(1)}%`, 'Loss ratio'] : String(v)
                  }
                  cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                />
                <ReferenceLine
                  y={baseLr * 100}
                  stroke="rgba(10,26,42,0.45)"
                  strokeDasharray="3 3"
                  label={{ value: `Base ${(baseLr * 100).toFixed(0)}%`, fontSize: 9, fill: 'rgba(10,26,42,0.7)', position: 'insideTopLeft' }}
                />
                <Bar dataKey="lrPct" radius={[2, 2, 0, 0]}>
                  {scenarioFan.map((s) => (
                    <Cell
                      key={s.scenario}
                      fill={SCENARIO_COLOURS[s.scenario]}
                      fillOpacity={s.scenario === scenario ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Selected scenario solid · others dimmed. Dashed line = base LR.
          </p>
        </div>

        <div className="border border-rule bg-paper">
          <div className="flex items-baseline justify-between border-b border-rule px-4 py-2">
            <Eyebrow>Elasticity sensitivity · {scenario}</Eyebrow>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              LR @ ε {elasticity.toFixed(2)} · {liveLrPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-56 px-2 pt-2 pb-1">
            <ResponsiveContainer>
              <LineChart data={elasticityCurve} margin={{ top: 8, right: 18, left: -12, bottom: 8 }}>
                <XAxis
                  dataKey="eps"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                  fontSize={10}
                  tickFormatter={(v) => v.toFixed(2)}
                  ticks={[0.3, 0.5, 0.7, 0.9, 1.1]}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v, name) =>
                    String(name) === 'lrPct'
                      ? [`${Number(v).toFixed(1)}%`, 'Loss ratio']
                      : [Number(v).toFixed(2), 'ε']
                  }
                  cursor={{ stroke: 'rgba(10,26,42,0.12)' }}
                />
                <ReferenceLine
                  y={baseLr * 100}
                  stroke="rgba(10,26,42,0.30)"
                  strokeDasharray="3 3"
                  label={{ value: 'Base', fontSize: 9, fill: 'rgba(10,26,42,0.6)', position: 'insideRight' }}
                />
                <ReferenceLine
                  x={Number(elasticity.toFixed(2))}
                  stroke={SCENARIO_COLOURS[scenario]}
                  strokeDasharray="2 4"
                />
                <Line
                  type="monotone"
                  dataKey="lrPct"
                  stroke={SCENARIO_COLOURS[scenario]}
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <ReferenceDot
                  x={Number(elasticity.toFixed(2))}
                  y={liveLrPct}
                  r={4.5}
                  fill={SCENARIO_COLOURS[scenario]}
                  stroke="#FAF7EE"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            Slope = baseLR × Δemissions vs Hot House. Drag ε on the Scenario step.
          </p>
        </div>
      </section>
      )}

      {/* Wizard step content — one input at a time */}
      <div className="grid grid-cols-1 gap-3">
        {step === 1 && (
        <InputCard
          step="01 · Counterparty"
          title="Pick the cedent or country"
          subtitle="Use a Vietnamese cedent preset to autofill, or override the country directly."
          complete={!!country}
        >
          <p className="eyebrow text-muted">Use preset</p>
          <ul className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CEDENT_PRESETS.map((p) => {
              const isSel = preset?.id === p.id;
              return (
                <li key={p.id} className="shrink-0">
                  <button
                    onClick={() => applyPreset(p)}
                    className={[
                      'flex items-center gap-2 border px-2 py-1.5 text-left transition',
                      isSel ? 'border-ink bg-ink/[0.04]' : 'border-rule hover:bg-ink/[0.02]',
                    ].join(' ')}
                  >
                    <Ticker code={p.ticker} tone={isSel ? 'ink' : 'paper'} size="sm" />
                    <span className="text-[12px] font-semibold text-ink">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="eyebrow mt-4 text-muted">Country override</p>
          <div className="mt-2 -mx-1 flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCountry(c); setPreset(null); }}
                aria-pressed={country === c}
                className={[
                  'min-h-[32px] whitespace-nowrap border px-3 py-1 text-[11px] transition',
                  country === c ? 'border-ink bg-ink text-paper' : 'border-rule bg-paper text-ink',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] tab-num text-muted">
            STIRPAT residual {COUNTRY_TIER[country].residualPct >= 0 ? '+' : ''}{COUNTRY_TIER[country].residualPct}% · country tier <span className="text-ink font-semibold">{preview.ct}</span>
          </p>
        </InputCard>
        )}

        {step === 2 && (
        <InputCard
          step="02 · Sector mix"
          title="GWP retention by sector"
          subtitle="Adjust to match the cedent book. Sliders normalise to 100 %."
          complete={mixNormalised}
        >
          <div className="space-y-1.5">
            {SECTORS.map((s) => {
              const sliderId = `pricing-mix-${s.replace(/\s+/g, '-')}`;
              return (
                <div key={s} className="grid grid-cols-[110px_1fr_38px] items-center gap-2">
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
          {/* Stacked-bar mini-viz of current mix */}
          <div className="mt-3" aria-hidden="true">
            <div className="flex h-2 w-full overflow-hidden border border-rule">
              {SECTORS.map((s) => {
                const w = (mix[s] / Math.max(mixSum, 1)) * 100;
                if (w < 0.5) return null;
                return (
                  <span
                    key={s}
                    title={`${s} ${mix[s].toFixed(0)}%`}
                    style={{ width: `${w}%`, background: SECTOR_HUE[s] }}
                    className="h-full"
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="font-mono text-[11px] tab-num text-muted">
              Σ {mixSum.toFixed(0)}% &nbsp;·&nbsp; weighted residual&nbsp;
              <span className={[
                'font-semibold',
                preview.weightedResidual > 75 ? 'text-rust'
                : preview.weightedResidual > 25 ? 'text-amber'
                : preview.weightedResidual < -25 ? 'text-sage'
                : 'text-ink',
              ].join(' ')}>
                {preview.weightedResidual >= 0 ? '+' : ''}{preview.weightedResidual.toFixed(0)}%
              </span>
            </p>
            <button
              onClick={() => setMix(normalise(mix))}
              disabled={mixNormalised}
              className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Normalise →
            </button>
          </div>
        </InputCard>
        )}

        {step === 3 && (
        <InputCard
          step="03 · Adaptive context"
          title="ND-GAIN, NDC, energy mix"
          subtitle="Override 2 (energy) and Override 3 (NDC) — encoded in the composite."
          complete
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Eyebrow>ND-GAIN 2023</Eyebrow>
              <p className="display tab-num mt-1 text-[26px] italic text-ink">
                {preview.ndgain.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted">
                Adaptive tier <span className="text-ink font-semibold">{preview.at}</span>
              </p>
            </div>
            <div>
              <Eyebrow>NDC plan filed</Eyebrow>
              <label className="mt-2 flex min-h-[36px] cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ndcPlanFiled}
                  onChange={(e) => setNdcPlanFiled(e.target.checked)}
                  className="h-5 w-5 shrink-0 accent-sea"
                />
                <span className="text-[12px] text-ink">Credible, NDC-aligned</span>
              </label>
              <p className="mt-1 text-[10px] text-muted">
                When unchecked, A/B composite ⇒ C.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Energy mix override</Eyebrow>
              <span className="display tab-num text-[18px] text-ink italic">{energyMixPct}%</span>
            </div>
            <div className="relative mt-2">
              {/* Threshold cue bands behind the slider track */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2">
                <div className="relative h-full bg-ink/5">
                  <div className="absolute inset-y-0 left-[50%] right-[35%] bg-amber/15" />
                  <div className="absolute inset-y-0 left-[65%] right-0 bg-rust/15" />
                  <div className="absolute inset-y-0 left-[50%] w-[1px] bg-amber/40" />
                  <div className="absolute inset-y-0 left-[65%] w-[1px] bg-rust/40" />
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={energyMixPct}
                onChange={(e) => setEnergyMixPct(Number(e.target.value))}
                aria-label="Energy mix"
                aria-valuetext={`Energy mix ${energyMixPct} percent`}
                className="rule-slider relative w-full"
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono text-[10px] tab-num text-muted">
              <span>0 %</span>
              <span className="text-amber">50 % → C</span>
              <span className="text-rust">65 % → D</span>
              <span>100 %</span>
            </div>
            <p className={['mt-1 text-[11px]', energyMixPct >= 50 ? 'text-amber font-semibold' : 'text-muted'].join(' ')}>
              {energyHint}
            </p>
          </div>
        </InputCard>
        )}

        {step === 4 && (
        <InputCard
          step="04 · Scenario"
          title="NGFS pathway + elasticity"
          subtitle="Same canon as the Stress screen — Phase V, Swiss Re ε."
          complete
        >
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-2">
            {STRESS_2030.map((s) => {
              const isSel = scenario === s.scenario;
              return (
                <button
                  key={s.scenario}
                  onClick={() => setScenario(s.scenario)}
                  aria-pressed={isSel}
                  className={[
                    'border px-2.5 py-2 text-left transition',
                    isSel ? 'border-ink bg-paper' : 'border-rule bg-paper/60 hover:bg-paper',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5" style={{ background: SCENARIO_COLOURS[s.scenario] }} />
                    <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                      {s.family}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[12px] font-medium text-ink">{s.scenario}</div>
                  <div className="mt-0.5 font-mono text-[10px] tab-num text-muted">
                    {s.growth >= 0 ? '+' : ''}{(s.growth * 100).toFixed(1)}% p.a.
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Elasticity ε</Eyebrow>
              <span className="display tab-num text-[18px] italic text-ink">{elasticity.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted">0.30</span>
              <input
                type="range"
                min={0.3}
                max={1.2}
                step={0.05}
                value={elasticity}
                onChange={(e) => setElasticity(Number(e.target.value))}
                aria-label="Elasticity"
                aria-valuetext={`Elasticity ${elasticity.toFixed(2)}`}
                className="rule-slider"
              />
              <span className="font-mono text-[10px] text-muted">1.20</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {elasticity < 0.5 ? 'Conservative' : elasticity < 0.85 ? 'Sigma 1/2024 base' : 'Stressed peril mix'}
            </p>
          </div>
        </InputCard>
        )}

        {step === 5 && (
        <InputCard
          step="05 · Capital"
          title="GWP and base loss ratio"
          subtitle="Notional treaty parameters. Defaults match the report headline."
          complete
        >
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>GWP · USDm</Eyebrow>
                <span className="font-mono text-[11px] tab-num text-ink">{Math.round(gwp).toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={500}
                max={3000}
                step={50}
                value={gwp}
                onChange={(e) => setGwp(Number(e.target.value))}
                aria-label="GWP"
                aria-valuetext={`GWP ${gwp} USD millions`}
                className="rule-slider mt-2"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] tab-num text-muted">
                <span>500</span>
                <span>3,000</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Base loss ratio</Eyebrow>
                <span className="font-mono text-[11px] tab-num text-ink">{baseLr.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={0.85}
                step={0.01}
                value={baseLr}
                onChange={(e) => setBaseLr(Number(e.target.value))}
                aria-label="Base loss ratio"
                aria-valuetext={`Base loss ratio ${baseLr.toFixed(2)}`}
                className="rule-slider mt-2"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] tab-num text-muted">
                <span>0.40</span>
                <span>0.85</span>
              </div>
            </div>
          </div>
        </InputCard>
        )}

        {/* Last result preview — appears after first run, on Review step only */}
        {step === 6 && lastResult && (
          <section className="border border-rule bg-sand px-5 py-5">
            <div className="flex items-baseline justify-between">
              <Eyebrow>Latest run · summary</Eyebrow>
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                {lastResult.cached ? 'cached' : 'live'} · ε {elasticity.toFixed(2)}
              </span>
            </div>
            <Hairline className="mt-3" />
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatBig
                value={lastResult.composite}
                label="Composite tier"
                accent="ink"
                size="md"
              />
              <StatBig
                value={`${lastResult.loadingPct >= 0 ? '+' : ''}${lastResult.loadingPct}%`}
                label="Loading"
                accent={lastResult.loadingPct > 0 ? 'amber' : 'sage'}
                size="md"
              />
              <StatBig
                value={`${(lastResult.lr * 100).toFixed(1)}%`}
                label="Loss ratio"
                accent={lastResult.lr <= baseLr ? 'sage' : 'rust'}
                size="md"
              />
              <StatBig
                value={`USD ${Math.round(lastResult.expectedLossUsdM)}m`}
                label="Expected loss"
                accent="sea"
                size="md"
              />
            </div>
          </section>
        )}
      </div>

      {/* Wizard footer nav — Back · step counter + reset · Next/Run */}
      <div
        className="sticky bottom-2 z-10 flex items-center justify-between gap-3 border border-ink bg-paper px-4 py-3 lg:static lg:bg-ink lg:px-6 lg:py-4 lg:text-paper"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0))' }}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1}
          className="border border-rule bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-eyebrow text-ink transition hover:bg-ink/[0.05] disabled:cursor-not-allowed disabled:opacity-40 lg:border-paper/40 lg:bg-transparent lg:text-paper lg:hover:bg-paper/10"
        >
          ← Back
        </button>
        <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted lg:text-paper/60">
          <span>Step {step} of 6</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={reset}
            className="text-sea hover:underline lg:text-paper/70 lg:hover:text-paper"
          >
            Reset
          </button>
        </div>
        {step < 6 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold uppercase tracking-eyebrow text-paper transition hover:bg-paper hover:text-ink lg:border-paper lg:bg-paper lg:text-ink lg:hover:bg-ink lg:hover:text-paper"
          >
            Next
            <span aria-hidden="true">→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={runSimulation}
            className="flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 text-[13px] font-semibold uppercase tracking-eyebrow text-paper transition hover:bg-paper hover:text-ink lg:border-paper lg:bg-paper lg:text-ink lg:hover:bg-ink lg:hover:text-paper"
          >
            <span aria-hidden="true">▶</span>
            Run Simulation
          </button>
        )}
      </div>
      {savedCount > 0 && (
        <p className="text-center font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {savedCount} saved profile{savedCount === 1 ? '' : 's'} flow into the assessment report
        </p>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 border border-ink bg-paper px-4 py-2 font-mono text-[11px] uppercase tracking-eyebrow text-ink shadow-plate"
        >
          {toast}
        </div>
      )}

      {/* Simulation modal */}
      <SimulationModal
        open={simOpen}
        inputs={simInputs}
        onClose={() => setSimOpen(false)}
        onSave={saveProfile}
        onResult={setLastResult}
      />
    </div>
  );
}

type HudAccent = 'ink' | 'sea' | 'rust' | 'sage' | 'amber';
const HUD_TEXT: Record<HudAccent, string> = {
  ink:  'text-ink',
  sea:  'text-sea',
  rust: 'text-rust',
  sage: 'text-sage',
  amber:'text-amber',
};

function HudTile({
  eyebrow, value, sub, accent = 'ink',
}: { eyebrow: string; value: string; sub: string; accent?: HudAccent }) {
  return (
    <div className="bg-paper px-4 py-3">
      <p className="eyebrow text-muted">{eyebrow}</p>
      <p className={['display tab-num mt-1 text-[24px] leading-none lg:text-[28px]', HUD_TEXT[accent]].join(' ')}>
        {value}
      </p>
      <p className="mt-1 truncate font-mono text-[10px] tab-num text-muted">{sub}</p>
    </div>
  );
}

