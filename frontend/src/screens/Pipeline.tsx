import { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, LabelList, Legend as RLegend,
} from 'recharts';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { useFocusTrap } from '../lib/useFocusTrap';
import { AnimatedNumber } from '../components/pipeline/AnimatedNumber';
import { Sparkbar } from '../components/pipeline/Sparkbar';
import { StageCard, Connector } from '../components/pipeline/StageCard';
import { FeatureOverridePanel } from '../components/pipeline/FeatureOverridePanel';
import {
  predict, getMeta, getLastApiError, type Trace, type Mode, type PipelineMeta,
} from '../lib/pipeline';
import { DRIVERS } from '../data/keyNumbers';
import { SECTOR_RESIDUAL_PCT, SECTORS } from '../data/cedent';
import canon from '../data/key_numbers_python.json';

const PRETTY_FEATURE: Record<string, string> = {
  log_GDP: 'log GDP',
  log_pop: 'log Population',
  log_GHG_lag1: 'log GHG · lag 1',
  log_GHG_lag2: 'log GHG · lag 2',
  renewable_energy_pct: 'Renewable energy %',
  urban_pop_pct: 'Urban pop %',
  industry_pct_GDP: 'Industry % GDP',
  forest_area_pct: 'Forest area %',
  CO2_intensity_GDP: 'CO₂ intensity / GDP',
  GDP_per_capita_2015USD: 'GDP / capita',
};

type InspectKey = '01' | '02' | '03' | '04' | '05' | null;

const FRESH_MS = 1100;
const LATENCY_HISTORY = 10;
const PLAY_INTERVAL_MS = 1500;

export function Pipeline() {
  const [meta, setMeta] = useState<PipelineMeta | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [busy, setBusy] = useState(false);
  const [inspect, setInspect] = useState<InspectKey>(null);

  const [mode, setMode] = useState<Mode>('hindcast');
  const [country, setCountry] = useState('Vietnam');
  const [scenario, setScenario] = useState('Net Zero 2050');
  const [elasticity, setElasticity] = useState(0.7);
  const [gwp, setGwp] = useState(1200);
  const [baseLr, setBaseLr] = useState(0.62);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  // Live latency log — for the sparkbar in Stage 03.
  const [latencyLog, setLatencyLog] = useState<number[]>([]);

  // Per-stage "fresh" ticks — flipped true when a new trace arrives, then
  // back to false after FRESH_MS so the green status dot pulses momentarily.
  const [updateTick, setUpdateTick] = useState(0);
  const [freshUntil, setFreshUntil] = useState(0);
  const [, forceTick] = useState(0);
  const fresh = Date.now() < freshUntil;

  // "Play" mode — auto-cycle through countries to demo live recompute.
  const [playing, setPlaying] = useState(false);

  // Load meta on mount.
  useEffect(() => {
    getMeta().then(setMeta);
  }, []);

  // Debounced predict on input change. AbortController is lifted to the effect
  // so a newer drag value cancels the in-flight request and prevents stale
  // responses from overwriting fresh ones (out-of-order race).
  const debouncer = useRef<number | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!meta) return;
    if (debouncer.current) window.clearTimeout(debouncer.current);
    debouncer.current = window.setTimeout(async () => {
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      setBusy(true);
      const t0 = performance.now();
      try {
        const next = await predict({
          mode, country, scenario,
          elasticity, gwp_usdm: gwp, base_lr: baseLr,
          feature_overrides: overrides,
        }, ctrl.signal);
        if (!ctrl.signal.aborted) {
          setTrace(next);
          // Server-reported inference_ms preferred; fall back to wall-clock.
          const sample = next.stage_3_xgb.inference_ms
            ?? Math.max(0.5, performance.now() - t0);
          setLatencyLog((prev) => {
            const out = [...prev, sample];
            return out.length > LATENCY_HISTORY ? out.slice(out.length - LATENCY_HISTORY) : out;
          });
          setUpdateTick((n) => n + 1);
          setFreshUntil(Date.now() + FRESH_MS);
        }
      } catch {
        // aborted — caller raced ahead; do nothing
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 200);
    return () => {
      if (debouncer.current) window.clearTimeout(debouncer.current);
    };
  }, [meta, mode, country, scenario, elasticity, gwp, baseLr, overrides]);

  // Re-render once after the freshness window expires so the StatusDot fades
  // back to grey. Cheap — single timeout per fresh window.
  useEffect(() => {
    if (!freshUntil) return;
    const wait = Math.max(0, freshUntil - Date.now()) + 50;
    const id = window.setTimeout(() => forceTick((n) => n + 1), wait);
    return () => window.clearTimeout(id);
  }, [freshUntil]);

  // Play mode — cycle country every PLAY_INTERVAL_MS while active.
  useEffect(() => {
    if (!playing || !meta) return;
    const list = meta.countries;
    const id = window.setInterval(() => {
      setCountry((prev) => {
        const i = list.indexOf(prev);
        return list[(i + 1) % list.length];
      });
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, meta]);

  const cached = trace?.trace_meta.served_by === 'cached';
  const baseValues = trace?.stage_1_inputs.raw_features ?? {};
  const featureRanges = meta?.feature_ranges ?? {};
  const featureList = meta?.m3a_features ?? [];

  const lastLatency = latencyLog[latencyLog.length - 1];

  return (
    <div className="space-y-4">
      {/* Off-screen live region — announces fresh predictions to screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {trace && !busy
          ? `Predicted ${trace.stage_3_xgb.ghg_pred_Mt.toFixed(1)} megatonnes; loss ratio ${(trace.stage_5_loss.lr * 100).toFixed(1)} percent; expected loss USD ${trace.stage_5_loss.loss_USDm.toFixed(0)} million.`
          : ''}
      </div>

      {/* === CONTROL BAR (sticky) === */}
      <ControlBar
        meta={meta}
        mode={mode}
        country={country}
        scenario={scenario}
        elasticity={elasticity}
        gwp={gwp}
        baseLr={baseLr}
        playing={playing}
        busy={busy}
        cached={cached}
        trace={trace}
        onMode={setMode}
        onCountry={setCountry}
        onScenario={setScenario}
        onElasticity={setElasticity}
        onGwp={setGwp}
        onBaseLr={setBaseLr}
        onTogglePlay={() => setPlaying((p) => !p)}
      />

      {trace ? (
        <>
          {/* === FLOW DIAGRAM === */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch [&>section]:lg:min-w-0 [&>section]:lg:flex-1">
            {/* Stage 01 — Inputs */}
            <StageCard
              code="01"
              title="Input vector"
              accent="ink"
              fresh={fresh}
              subtitle={`${trace.stage_1_inputs.country} · base ${trace.stage_1_inputs.mode === 'hindcast' ? '2023' : '2024'}`}
              onInspect={() => setInspect('01')}
              hero={
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="border border-ink bg-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-paper">
                      {trace.stage_1_inputs.country}
                    </span>
                    <span className="font-mono text-[10px] tab-num text-muted">
                      year {trace.stage_1_inputs.year}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                      · {trace.stage_1_inputs.mode}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {Object.entries(trace.stage_1_inputs.raw_features).slice(0, 8).map(([k, v]) => {
                      const isOv = trace.stage_1_inputs.applied_overrides[k] !== undefined;
                      return (
                        <li
                          key={k}
                          className="flex items-baseline justify-between gap-2 border-b border-rule/40 py-0.5"
                        >
                          <span className="truncate text-[10px] text-muted">
                            {PRETTY_FEATURE[k] ?? k}
                          </span>
                          <span
                            className={[
                              'shrink-0 font-mono text-[10px] tab-num',
                              isOv ? 'font-semibold text-rust' : 'text-ink',
                            ].join(' ')}
                          >
                            {isOv && <span aria-hidden="true">● </span>}
                            {typeof v === 'number' ? v.toFixed(2) : String(v)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                    {Object.keys(trace.stage_1_inputs.raw_features).length} indicators ·{' '}
                    <span className={Object.keys(trace.stage_1_inputs.applied_overrides).length > 0 ? 'text-rust' : ''}>
                      {Object.keys(trace.stage_1_inputs.applied_overrides).length} overridden
                    </span>
                  </p>
                </div>
              }
            />

            <div className="hidden lg:flex"><Connector /></div>
            <div className="flex justify-center lg:hidden"><Connector /></div>

            {/* Stage 02 — Features (with override panel) */}
            <StageCard
              code="02"
              title="Feature engineering"
              accent="sea"
              fresh={fresh}
              subtitle={`X ∈ ℝ${trace.stage_2_features.feature_order.length} · log() on ${trace.stage_2_features.log_transformed_keys.length} keys`}
              onInspect={() => setInspect('02')}
              hero={
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="eyebrow text-muted">Vector dim</p>
                      <div className="display tab-num text-[36px] leading-none text-sea">
                        {trace.stage_2_features.feature_order.length}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="eyebrow text-muted">log()</p>
                      <div className="font-mono text-[16px] tab-num text-ink">
                        {trace.stage_2_features.log_transformed_keys.length}
                        <span className="text-[11px] text-muted">
                          /{trace.stage_2_features.feature_order.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const xs = trace.stage_2_features.X;
                    const order = trace.stage_2_features.feature_order;
                    const maxAbs = Math.max(...xs.map((v) => Math.abs(v)), 0.01);
                    return (
                      <ul className="space-y-1">
                        {order.slice(0, 6).map((f, i) => {
                          const v = xs[i] ?? 0;
                          const w = Math.min(100, (Math.abs(v) / maxAbs) * 100);
                          const isLog = trace.stage_2_features.log_transformed_keys.includes(f);
                          return (
                            <li key={f} className="flex items-center gap-2">
                              <span className="w-20 shrink-0 truncate text-[10px] text-ink lg:w-24">
                                {PRETTY_FEATURE[f] ?? f}
                              </span>
                              <div className="h-1.5 flex-1 bg-ink/10">
                                <div
                                  className={['h-full transition-[width] duration-300', isLog ? 'bg-sea' : 'bg-ink/40'].join(' ')}
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                              <span className="w-10 shrink-0 text-right font-mono text-[9px] tab-num text-ink">
                                {v.toFixed(1)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                  <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                    <span className="inline-block h-2 w-2 bg-sea align-middle" /> log-transformed ·{' '}
                    <span className="inline-block h-2 w-2 bg-ink/40 align-middle" /> raw
                  </p>
                </div>
              }
              details={
                <FeatureOverridePanel
                  features={featureList}
                  ranges={featureRanges}
                  baseValues={baseValues}
                  overrides={overrides}
                  onChange={(k, v) => {
                    setOverrides((prev) => {
                      if (v === undefined) {
                        const next = { ...prev };
                        delete next[k];
                        return next;
                      }
                      return { ...prev, [k]: v };
                    });
                  }}
                  onResetAll={() => setOverrides({})}
                />
              }
              defaultOpen={Object.keys(overrides).length > 0}
            />

            <div className="hidden lg:flex"><Connector /></div>
            <div className="flex justify-center lg:hidden"><Connector /></div>

            {/* Stage 03 — XGBoost */}
            <StageCard
              code="03"
              title="XGBoost inference"
              accent="rust"
              fresh={fresh}
              subtitle={`M3a · seed ${trace.trace_meta.seed} · ${trace.trace_meta.served_by === 'fastapi' ? 'live' : 'cached'}`}
              onInspect={() => setInspect('03')}
              hero={
                <div>
                  <p className="eyebrow text-muted">
                    {trace.stage_1_inputs.mode === 'hindcast' ? 'Predicted 2024' : 'Anchor 2024'}
                  </p>
                  <div className="display tab-num text-[34px] leading-none text-ink">
                    <AnimatedNumber
                      value={trace.stage_3_xgb.ghg_pred_Mt}
                      format={(v) => v.toFixed(1)}
                    />
                    <span className="ml-1 text-[16px] text-muted">Mt</span>
                  </div>
                  {trace.stage_3_xgb.actual_Mt !== null && (
                    <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] tab-num">
                      <span className="text-muted">actual {trace.stage_3_xgb.actual_Mt.toFixed(1)}</span>
                      {trace.stage_3_xgb.err_pct !== null && (
                        <span className={Math.abs(trace.stage_3_xgb.err_pct) <= 5 ? 'text-sage' : 'text-amber'}>
                          {trace.stage_3_xgb.err_pct >= 0 ? '+' : ''}{trace.stage_3_xgb.err_pct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                        Latency · last {latencyLog.length}
                      </p>
                      <Sparkbar values={latencyLog} className="mt-0.5" />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
                        last
                      </span>
                      <div className="font-mono text-[12px] tab-num text-ink">
                        {lastLatency !== undefined ? `${lastLatency.toFixed(1)}ms` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              }
              details={
                <div>
                  <p className="font-mono text-[10px] tab-num text-muted">
                    log_GHG_pred = {trace.stage_3_xgb.log_ghg_pred.toFixed(4)}
                  </p>
                  <p className="font-mono text-[10px] tab-num text-muted">
                    exp() = {trace.stage_3_xgb.ghg_pred_Mt.toFixed(2)} Mt
                  </p>
                  <Hairline className="my-2" />
                  <p className="eyebrow text-muted">Top driver gain · M3b</p>
                  <ul className="mt-1.5 space-y-1">
                    {DRIVERS.slice(0, 4).map((d) => (
                      <li key={d.feature} className="flex items-center gap-2">
                        <span className="w-28 truncate text-[10px] text-ink">{d.feature}</span>
                        <div className="h-1.5 flex-1 bg-ink/10">
                          <div className="h-full bg-rust" style={{ width: `${(d.gain * 100).toFixed(1)}%` }} />
                        </div>
                        <span className="w-9 text-right font-mono text-[9px] tab-num text-ink">
                          {(d.gain * 100).toFixed(1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />

            <div className="hidden lg:flex"><Connector /></div>
            <div className="flex justify-center lg:hidden"><Connector /></div>

            {/* Stage 04 — Scenario */}
            <StageCard
              code="04"
              title="NGFS overlay"
              accent="amber"
              fresh={fresh}
              subtitle={`${trace.stage_4_scenario.scenario} · g = ${(trace.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}%`}
              onInspect={() => setInspect('04')}
              hero={
                <div>
                  <p className="eyebrow text-muted">Target {trace.stage_1_inputs.year}</p>
                  <div className="display tab-num text-[34px] leading-none text-ink">
                    <AnimatedNumber
                      value={trace.stage_4_scenario.target_Mt}
                      format={(v) => v.toFixed(1)}
                    />
                    <span className="ml-1 text-[16px] text-muted">Mt</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] tab-num text-muted">
                    Hot House {trace.stage_4_scenario.hothouse_Mt.toFixed(1)} Mt ·
                    Δ{' '}
                    <span className={trace.stage_4_scenario.delta_pct < 0 ? 'text-sage' : 'text-rust'}>
                      {trace.stage_4_scenario.delta_pct >= 0 ? '+' : ''}
                      {(trace.stage_4_scenario.delta_pct * 100).toFixed(2)}%
                    </span>
                  </p>
                  <div className="mt-2">
                    <ScenarioBar
                      hothouse={trace.stage_4_scenario.hothouse_Mt}
                      target={trace.stage_4_scenario.target_Mt}
                    />
                  </div>
                </div>
              }
              details={
                <p className="font-serif italic text-[12px] leading-relaxed text-ink">
                  E({trace.stage_1_inputs.year}) = {trace.stage_3_xgb.ghg_pred_Mt.toFixed(1)} ×
                  (1 + {(trace.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}%)
                  <sup>{trace.stage_4_scenario.years_compounded}</sup> ={' '}
                  <span className="not-italic font-semibold">{trace.stage_4_scenario.target_Mt.toFixed(1)} Mt</span>
                </p>
              }
            />

            <div className="hidden lg:flex"><Connector /></div>
            <div className="flex justify-center lg:hidden"><Connector /></div>

            {/* Stage 05 — Loss */}
            <StageCard
              code="05"
              title="Loss-ratio mapping"
              accent={trace.stage_5_loss.lr_pp_vs_base < 0 ? 'sage' : 'rust'}
              fresh={fresh}
              subtitle={`ε ${elasticity.toFixed(2)} · GWP USD ${gwp}m`}
              onInspect={() => setInspect('05')}
              hero={
                <div>
                  <p className="eyebrow text-muted">Expected loss</p>
                  <div className={[
                    'display tab-num text-[34px] leading-none',
                    trace.stage_5_loss.lr_pp_vs_base < 0 ? 'text-sage' : 'text-rust',
                  ].join(' ')}>
                    USD{' '}
                    <AnimatedNumber
                      value={trace.stage_5_loss.loss_USDm}
                      format={(v) => v.toFixed(0)}
                    />
                    <span className="ml-1 text-[16px] text-muted">m</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-3 font-mono text-[10px] tab-num">
                    <span className="text-muted">
                      LR{' '}
                      <span className="text-ink">
                        <AnimatedNumber
                          value={trace.stage_5_loss.lr * 100}
                          format={(v) => v.toFixed(1) + '%'}
                        />
                      </span>
                    </span>
                    <span className={trace.stage_5_loss.lr_pp_vs_base < 0 ? 'text-sage' : 'text-rust'}>
                      {trace.stage_5_loss.lr_pp_vs_base >= 0 ? '+' : ''}
                      {trace.stage_5_loss.lr_pp_vs_base.toFixed(1)} pp
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] tab-num text-muted">
                    vs Hot House:{' '}
                    <span className={trace.stage_5_loss.loss_swing_vs_hothouse_USDm < 0 ? 'text-sage' : 'text-rust'}>
                      {trace.stage_5_loss.loss_swing_vs_hothouse_USDm >= 0 ? '+' : '−'}USD{' '}
                      {Math.abs(trace.stage_5_loss.loss_swing_vs_hothouse_USDm).toFixed(0)}m
                    </span>
                  </p>
                </div>
              }
              details={
                <pre className="overflow-x-auto bg-ink p-2 font-mono text-[10px] text-paper">
{`LR    = base × (1 + ε × Δ%)
      = ${baseLr.toFixed(2)} × (1 + ${elasticity.toFixed(2)} × ${(trace.stage_4_scenario.delta_pct * 100).toFixed(2)}%)
      = ${(trace.stage_5_loss.lr * 100).toFixed(2)}%
loss  = GWP × LR = ${trace.stage_5_loss.loss_USDm.toFixed(1)}`}
                </pre>
              }
            />
          </div>

          {/* Footer status strip */}
          <FooterStrip cached={cached} trace={trace} updateTick={updateTick} />
        </>
      ) : (
        <Card><p className="text-[12px] text-muted">Loading pipeline…</p></Card>
      )}

      {/* Inspect modal */}
      <InspectSheet kind={inspect} trace={trace} country={country} onClose={() => setInspect(null)} />
    </div>
  );
}

// =============================================================================
// CONTROL BAR — sticky compact strip up top.
// =============================================================================

function ControlBar({
  meta, mode, country, scenario, elasticity, gwp, baseLr,
  playing, busy, cached, trace,
  onMode, onCountry, onScenario, onElasticity, onGwp, onBaseLr, onTogglePlay,
}: {
  meta: PipelineMeta | null;
  mode: Mode; country: string; scenario: string;
  elasticity: number; gwp: number; baseLr: number;
  playing: boolean; busy: boolean; cached: boolean; trace: Trace | null;
  onMode: (m: Mode) => void;
  onCountry: (c: string) => void;
  onScenario: (s: string) => void;
  onElasticity: (v: number) => void;
  onGwp: (v: number) => void;
  onBaseLr: (v: number) => void;
  onTogglePlay: () => void;
}) {
  const countries = meta?.countries ?? ['Vietnam'];
  const scenarios = Object.keys(meta?.ngfs_scenarios ?? { 'Net Zero 2050': 0 });
  const [showLossControls, setShowLossControls] = useState(false);

  return (
    <div className={[
      'sticky top-[52px] z-20 -mx-4 border border-rule px-4 pb-3 pt-3 backdrop-blur lg:top-[64px] lg:-mx-0 lg:px-5',
      cached ? 'bg-amber/[0.04]' : 'bg-paper/92',
    ].join(' ')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={[
              'inline-block h-2 w-2 rounded-full',
              busy ? 'bg-amber animate-pulse' : cached ? 'bg-amber' : 'bg-sage',
            ].join(' ')}
          />
          <Eyebrow tone={cached ? 'ink' : 'muted'}>
            {busy ? 'Computing…' : cached ? 'Cached · API offline' : 'Live · FastAPI'}
          </Eyebrow>
          {trace && (
            <span className="font-mono text-[10px] tab-num text-muted">
              {trace.trace_meta.total_latency_ms != null
                ? `${trace.trace_meta.total_latency_ms.toFixed(1)} ms`
                : 'cached'}
              {' · '}seed {trace.trace_meta.seed}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={playing}
          aria-label={playing ? 'Stop auto-cycle' : 'Auto-cycle through SEA countries'}
          className={[
            'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-eyebrow transition',
            playing
              ? 'border-rust bg-rust/10 text-rust'
              : 'border-rule bg-paper text-ink hover:border-ink',
          ].join(' ')}
        >
          <span aria-hidden="true">{playing ? '■' : '▶'}</span>
          {playing ? 'stop' : 'play'}
        </button>
      </div>

      {/* Mode + Scenario chips */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="eyebrow text-muted">Mode</span>
          <div role="radiogroup" aria-label="Pipeline mode" className="flex border border-rule">
            {(['hindcast', 'forward'] as Mode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => onMode(m)}
                className={[
                  'min-h-[28px] px-2.5 font-mono text-[10px] uppercase tracking-eyebrow transition',
                  mode === m ? 'bg-ink text-paper' : 'bg-paper text-ink',
                ].join(' ')}
              >
                {m === 'hindcast' ? '2024 hindcast' : '2030 forward'}
              </button>
            ))}
          </div>
        </div>

        {mode === 'forward' && (
          <div className="flex items-center gap-1.5">
            <span className="eyebrow text-muted">NGFS</span>
            <div role="radiogroup" aria-label="NGFS scenario" className="flex flex-wrap gap-1">
              {scenarios.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={scenario === s}
                  onClick={() => onScenario(s)}
                  className={[
                    'min-h-[28px] border px-2 font-mono text-[10px] uppercase tracking-eyebrow transition',
                    scenario === s
                      ? 'border-ink bg-ink text-paper'
                      : 'border-rule bg-paper text-ink hover:border-ink',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Country chips */}
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className="eyebrow text-muted">Country</span>
          <div role="radiogroup" aria-label="Country" className="flex flex-wrap gap-1">
            {countries.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={country === c}
                onClick={() => onCountry(c)}
                className={[
                  'min-h-[28px] border px-2 font-mono text-[10px] uppercase tracking-eyebrow transition',
                  country === c
                    ? 'border-sea bg-sea text-paper'
                    : 'border-rule bg-paper text-ink hover:border-sea',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Elasticity dial — big numeric display + slider */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-muted">ε</span>
          <div className="flex items-baseline gap-1">
            <span className="display tab-num text-[20px] leading-none text-ink">
              {elasticity.toFixed(2)}
            </span>
            <span className="font-mono text-[9px] text-muted">elasticity</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={1.2}
            step={0.01}
            value={elasticity}
            onChange={(e) => onElasticity(Number(e.target.value))}
            aria-label="Elasticity"
            aria-valuetext={`elasticity ${elasticity.toFixed(2)}`}
            className="rule-slider w-32 lg:w-44"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowLossControls((v) => !v)}
          aria-expanded={showLossControls}
          className="ml-auto font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
        >
          <span aria-hidden="true">{showLossControls ? '▾' : '▸'}</span>{' '}
          GWP / base LR
        </button>
      </div>

      {showLossControls && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-2">
          <div className="flex items-center gap-2">
            <span className="eyebrow text-muted">GWP</span>
            <span className="font-mono text-[11px] tab-num text-ink">USD {gwp}m</span>
            <input
              type="range"
              min={500}
              max={3000}
              step={50}
              value={gwp}
              onChange={(e) => onGwp(Number(e.target.value))}
              aria-label="Gross written premium in USD millions"
              aria-valuetext={`USD ${gwp} million`}
              className="rule-slider w-32 lg:w-44"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-muted">Base LR</span>
            <span className="font-mono text-[11px] tab-num text-ink">{(baseLr * 100).toFixed(0)}%</span>
            <input
              type="range"
              min={0.40}
              max={0.85}
              step={0.01}
              value={baseLr}
              onChange={(e) => onBaseLr(Number(e.target.value))}
              aria-label="Base loss ratio"
              aria-valuetext={`base loss ratio ${(baseLr * 100).toFixed(0)} percent`}
              className="rule-slider w-32 lg:w-44"
            />
          </div>
        </div>
      )}

      {cached && getLastApiError() && !/abort/i.test(getLastApiError() ?? '') && (
        <p className="mt-2 truncate font-mono text-[9px] text-amber">
          reason: {getLastApiError()}
        </p>
      )}
    </div>
  );
}

function ScenarioBar({ hothouse, target }: { hothouse: number; target: number }) {
  const peak = Math.max(hothouse, target, 0.01);
  const hothouseW = (hothouse / peak) * 100;
  const targetW = (target / peak) * 100;
  const lower = target < hothouse;
  return (
    <div className="space-y-1" role="img" aria-label={`Hot House ${hothouse.toFixed(1)} Mt vs target ${target.toFixed(1)} Mt`}>
      <div className="flex items-center gap-2">
        <span className="w-16 font-mono text-[8px] uppercase tracking-eyebrow text-muted">Hot House</span>
        <div className="h-1.5 flex-1 bg-ink/10">
          <div className="h-full bg-rust/70" style={{ width: `${hothouseW}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-16 font-mono text-[8px] uppercase tracking-eyebrow text-muted">Target</span>
        <div className="h-1.5 flex-1 bg-ink/10">
          <div className={['h-full transition-[width] duration-500', lower ? 'bg-sage' : 'bg-rust'].join(' ')} style={{ width: `${targetW}%` }} />
        </div>
      </div>
    </div>
  );
}

function FooterStrip({ cached, trace, updateTick }: { cached: boolean; trace: Trace; updateTick: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border border-rule bg-sand/40 px-4 py-2 lg:px-5">
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
        {cached ? 'Cached · static JSON' : 'Live · FastAPI'} · pipeline v{trace.trace_meta.pipeline_version} · seed {trace.trace_meta.seed}
      </p>
      <p className="font-mono text-[10px] tab-num text-muted">
        recomputes: {updateTick}
      </p>
    </div>
  );
}

// =============================================================================
// INSPECT MODAL — kept from previous version, lightly trimmed.
// =============================================================================

function InspectSheet({
  kind, trace, country, onClose,
}: {
  kind: InspectKey; trace: Trace | null; country: string; onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(!!kind, onClose);
  if (!kind || !trace) return null;

  const titleId = `inspect-${kind}-title`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-ink/45 backdrop-blur-[2px]"
      />
      <article
        className="relative mx-auto w-full max-w-canvas max-h-[88vh] overflow-y-auto rounded-t-[18px] border-t border-rule bg-paper px-5 pb-8 pt-5 shadow-plate lg:rounded-[18px] lg:border lg:my-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0))' }}
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
        <div className="flex items-baseline justify-between">
          <Eyebrow>Stage {kind} · inspect</Eyebrow>
          <button
            onClick={onClose}
            aria-label="Close inspect dialog"
            className="font-mono text-[11px] uppercase tracking-eyebrow text-muted hover:text-ink"
          >
            Close <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="mt-3">
          {kind === '01' && <Inspect01 trace={trace} titleId={titleId} />}
          {kind === '02' && <Inspect02 trace={trace} titleId={titleId} />}
          {kind === '03' && <Inspect03 trace={trace} titleId={titleId} />}
          {kind === '04' && <Inspect04 trace={trace} country={country} titleId={titleId} />}
          {kind === '05' && <Inspect05 trace={trace} titleId={titleId} />}
        </div>
      </article>
    </div>
  );
}

function Inspect01({ trace, titleId }: { trace: Trace; titleId: string }) {
  // Display each feature as a percentage of its absolute value range across
  // SEA so wildly different scales (log GDP ≈ 25, urban % ≈ 60) plot together.
  // Override deltas show as a second bar in rust.
  const rows = Object.entries(trace.stage_1_inputs.raw_features).map(([k, v]) => {
    const baseNum = typeof v === 'number' ? v : 0;
    const ov = trace.stage_1_inputs.applied_overrides[k];
    const overrideNum = typeof ov === 'number' ? ov : null;
    const denom = Math.max(Math.abs(baseNum), Math.abs(overrideNum ?? 0), 1e-9);
    return {
      feature: PRETTY_FEATURE[k] ?? k,
      base: baseNum,
      override: overrideNum,
      basePct: 100 * (baseNum / denom),
      overridePct: overrideNum != null ? 100 * (overrideNum / denom) : null,
    };
  });
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">Raw input vector</h2>
      <p className="mt-1 text-[12px] text-muted">Pulled from sea_panel row · {trace.stage_1_inputs.country} · base year {trace.stage_1_inputs.mode === 'hindcast' ? 2023 : 2024}. Each row scaled to its own max so cross-feature deltas read.</p>
      <Hairline className="mt-3" />
      <div className="mt-3 h-72">
        <ResponsiveContainer>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 64, left: 4, bottom: 4 }}
            barGap={2}
            barCategoryGap={4}
          >
            <XAxis
              type="number"
              domain={[-110, 110]}
              tickLine={false}
              axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
              fontSize={9}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis type="category" dataKey="feature" width={140} tickLine={false} axisLine={false} fontSize={10} />
            <ReferenceLine x={0} stroke="rgba(10,26,42,0.45)" />
            <Tooltip
              cursor={{ fill: 'rgba(10,26,42,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { feature: string; base: number; override: number | null };
                return (
                  <div className="border border-rule bg-paper px-2 py-1.5 text-[11px]">
                    <div className="font-semibold text-ink">{d.feature}</div>
                    <div className="font-mono tab-num text-muted">
                      base {d.base.toFixed(3)}
                      {d.override !== null && d.override !== undefined && (
                        <> · override <span className="text-rust">{d.override.toFixed(3)}</span></>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <RLegend wrapperStyle={{ fontSize: 9 }} iconType="square" verticalAlign="top" align="right" height={16} />
            <Bar dataKey="basePct" name="Base" fill="#0E7C86" fillOpacity={0.7} radius={[0, 2, 2, 0]} />
            <Bar dataKey="overridePct" name="Override" fill="#8B2E1F" radius={[0, 2, 2, 0]}>
              <LabelList
                dataKey="override"
                position="right"
                fontSize={9}
                fill="#8B2E1F"
                formatter={(v) => (v == null ? '' : Number(v).toFixed(2))}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function Inspect02({ trace, titleId }: { trace: Trace; titleId: string }) {
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">Feature vector X</h2>
      <p className="mt-1 text-[12px] text-muted">log() applied to {trace.stage_2_features.log_transformed_keys.join(', ')}. Order matches m3a_features in meta.json.</p>
      <Hairline className="mt-3" />
      <pre className="mt-3 overflow-x-auto bg-ink p-3 font-mono text-[11px] text-paper">
{`X = [
${trace.stage_2_features.feature_order.map((f, i) => `  ${(trace.stage_2_features.X[i] ?? 0).toFixed(4).padEnd(10)} # ${f}`).join('\n')}
]`}
      </pre>
    </>
  );
}

function Inspect03({ trace, titleId }: { trace: Trace; titleId: string }) {
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">XGBoost inference</h2>
      <p className="mt-1 text-[12px] text-muted">M3a panel model · seed 2026 · trained 1990–2023 SEA panel.</p>
      <Hairline className="mt-3" />

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <Eyebrow>Feature gain · M3b</Eyebrow>
          <p className="mt-1 text-[10px] text-muted">Average loss reduction per split · log-GDP + log-pop dominate.</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer>
              <BarChart
                data={DRIVERS.slice(0, 6).map((d) => ({ feature: d.feature, gain: d.gain * 100, kind: d.kind }))}
                layout="vertical"
                margin={{ top: 4, right: 38, left: 4, bottom: 4 }}
                barCategoryGap={4}
              >
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={9} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="feature" width={130} tickLine={false} axisLine={false} fontSize={10} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} cursor={{ fill: 'rgba(10,26,42,0.04)' }} />
                <Bar dataKey="gain" radius={[0, 2, 2, 0]}>
                  {DRIVERS.slice(0, 6).map((d) => (
                    <Cell
                      key={d.feature}
                      fill={d.kind === 'scale' ? '#0A1A2A' : d.kind === 'tech' ? '#0E7C86' : '#3F8A66'}
                    />
                  ))}
                  <LabelList dataKey="gain" position="right" fontSize={9} fill="#0A1A2A" formatter={(v) => `${Number(v).toFixed(1)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <Eyebrow>Sign-flip diagnostic · pairwise vs partial r</Eyebrow>
          <p className="mt-1 text-[10px] text-muted">Three indicators flip sign once log-GDP + log-pop partialled out.</p>
          <div className="mt-2 h-44">
            <ResponsiveContainer>
              <BarChart
                data={canon.partial_correlations.map((r) => ({
                  feature: r.feature.replace('_', ' ').replace('pct', '%'),
                  pairwise: r.pairwise_r,
                  partial: r.partial_r,
                  flip: r.flag === 'SIGN-FLIP',
                }))}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                barCategoryGap={2}
              >
                <XAxis
                  type="number"
                  domain={[-1, 1]}
                  ticks={[-1, -0.5, 0, 0.5, 1]}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                  fontSize={9}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <YAxis type="category" dataKey="feature" width={120} tickLine={false} axisLine={false} fontSize={9} />
                <ReferenceLine x={0} stroke="rgba(10,26,42,0.45)" />
                <Tooltip
                  formatter={(v, name) => [
                    `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}`,
                    name === 'pairwise' ? 'Pairwise r' : 'Partial r',
                  ]}
                  cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                />
                <RLegend wrapperStyle={{ fontSize: 9 }} iconType="square" verticalAlign="top" align="right" height={16} />
                <Bar dataKey="pairwise" name="Pairwise" fill="rgba(14,124,134,0.55)" radius={[0, 2, 2, 0]} />
                <Bar dataKey="partial" name="Partial" fill="#8B2E1F" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Hairline className="mt-4" />
      <p className="mt-3 font-mono text-[11px] tab-num text-muted">
        log_GHG_pred = {trace.stage_3_xgb.log_ghg_pred.toFixed(4)} → exp() → {trace.stage_3_xgb.ghg_pred_Mt.toFixed(2)} Mt
        {trace.stage_3_xgb.inference_ms !== null && ` · ${trace.stage_3_xgb.inference_ms.toFixed(2)} ms`}
      </p>
    </>
  );
}

function Inspect04({ trace, country, titleId }: { trace: Trace; country: string; titleId: string }) {
  const row = SECTOR_RESIDUAL_PCT[country];
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">Scenario overlay</h2>
      <p className="mt-1 text-[12px] text-muted">{trace.stage_4_scenario.scenario} · {(trace.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}% p.a. compound · {trace.stage_4_scenario.years_compounded} years.</p>
      <Hairline className="mt-3" />
      <pre className="mt-3 overflow-x-auto bg-ink p-3 font-mono text-[11px] text-paper">
{`E(target) = ghg_pred × (1 + g)^years
          = ${trace.stage_3_xgb.ghg_pred_Mt.toFixed(2)} × (1 + ${trace.stage_4_scenario.growth_rate_pa.toFixed(3)})^${trace.stage_4_scenario.years_compounded}
          = ${trace.stage_4_scenario.target_Mt.toFixed(2)} Mt`}
      </pre>

      {row && (
        <>
          <Eyebrow tone="muted">Sectoral residual · {country}</Eyebrow>
          <p className="mt-1 text-[11px] text-muted">% over what scale-implied STIRPAT predicts. Red = over-emit, green = under-emit.</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer>
              <BarChart
                data={SECTORS.map((s) => ({ sector: s, residual: row[s] ?? 0 }))}
                layout="vertical"
                margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
                barCategoryGap={3}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(10,26,42,0.18)' }}
                  fontSize={9}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
                />
                <YAxis type="category" dataKey="sector" width={130} tickLine={false} axisLine={false} fontSize={10} />
                <ReferenceLine x={0} stroke="rgba(10,26,42,0.55)" />
                <Tooltip
                  formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Math.round(Number(v))}%`}
                  cursor={{ fill: 'rgba(10,26,42,0.04)' }}
                />
                <Bar dataKey="residual" radius={[0, 2, 2, 0]}>
                  {SECTORS.map((s) => {
                    const v = row[s] ?? 0;
                    const fill =
                      v >= 300 ? '#8B2E1F'
                      : v >= 150 ? '#B8761C'
                      : v >= 25  ? '#C9A24C'
                      : v <= -25 ? '#3F8A66'
                      : '#7A8A9C';
                    return <Cell key={s} fill={fill} />;
                  })}
                  <LabelList
                    dataKey="residual"
                    position="right"
                    fontSize={9}
                    fill="#0A1A2A"
                    formatter={(v) => `${Number(v) >= 0 ? '+' : ''}${Math.round(Number(v))}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </>
  );
}

function Inspect05({ trace, titleId }: { trace: Trace; titleId: string }) {
  void StatBig; // keep import used
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">Loss-ratio mapping</h2>
      <p className="mt-1 text-[12px] text-muted">Swiss Re sigma 1/2024 elasticity convention. BNM CRST 2024 §6.3 capital implication.</p>
      <Hairline className="mt-3" />
      <pre className="mt-3 overflow-x-auto bg-ink p-3 font-mono text-[11px] text-paper">
{`Δ%        = (target - hothouse) / hothouse
          = ${(trace.stage_4_scenario.delta_pct * 100).toFixed(2)}%

LR        = base_lr × (1 + ε × Δ%)
          = ${(trace.stage_5_loss.lr / (1 + (trace.stage_5_loss.lr_pp_vs_base / 100))).toFixed(3)} × (1 + ε × ${(trace.stage_4_scenario.delta_pct * 100).toFixed(2)}%)
          = ${(trace.stage_5_loss.lr * 100).toFixed(2)}%

Loss USDm = GWP × LR
          = ${trace.stage_5_loss.loss_USDm.toFixed(2)}`}
      </pre>
    </>
  );
}
