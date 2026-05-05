import { useEffect, useRef, useState } from 'react';
import { Card, Eyebrow, Hairline, StatBig } from '../components/Card';
import { Ticker } from '../components/Ticker';
import { useFocusTrap } from '../lib/useFocusTrap';
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

const FEATURE_UNIT: Record<string, string> = {
  log_GDP: 'log USD constant',
  log_pop: 'log persons',
  log_GHG_lag1: 'log megatonnes CO₂e (one-year lag)',
  log_GHG_lag2: 'log megatonnes CO₂e (two-year lag)',
  renewable_energy_pct: 'percent',
  urban_pop_pct: 'percent',
  industry_pct_GDP: 'percent',
  forest_area_pct: 'percent',
  CO2_intensity_GDP: 'kg CO₂ per USD GDP',
  GDP_per_capita_2015USD: 'USD per capita',
};

type InspectKey = '01' | '02' | '03' | '04' | '05' | null;

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

  // Load meta on mount
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
      try {
        const next = await predict({
          mode, country, scenario,
          elasticity, gwp_usdm: gwp, base_lr: baseLr,
          feature_overrides: overrides,
        }, ctrl.signal);
        if (!ctrl.signal.aborted) setTrace(next);
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

  const cached = trace?.trace_meta.served_by === 'cached';

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-[320px_1fr] lg:gap-6 lg:space-y-0">
      {/* Off-screen live region — announces fresh predictions to screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {trace && !busy
          ? `Predicted ${trace.stage_3_xgb.ghg_pred_Mt.toFixed(1)} megatonnes; loss ratio ${(trace.stage_5_loss.lr * 100).toFixed(1)} percent; expected loss USD ${trace.stage_5_loss.loss_USDm.toFixed(0)} million.`
          : ''}
      </div>

      {/* Inputs panel */}
      <aside className="space-y-4 lg:sticky lg:top-[140px] lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-2">
        <section className="border border-rule bg-paper px-5 py-5">
          <p id="mode-label" className="eyebrow text-muted">Mode</p>
          <div role="radiogroup" aria-labelledby="mode-label" className="mt-2 grid grid-cols-2 border border-rule">
            {(['hindcast', 'forward'] as Mode[]).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={[
                  'min-h-[40px] px-3 text-[11px] font-semibold uppercase tracking-eyebrow transition',
                  mode === m ? 'bg-ink text-paper' : 'bg-paper text-ink',
                ].join(' ')}
              >
                {m === 'hindcast' ? 'Hindcast 2024' : 'Forward 2030'}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <label htmlFor="country-select" className="eyebrow text-muted">Country</label>
            <select
              id="country-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-[13px] text-ink"
            >
              {(meta?.countries ?? ['Vietnam']).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {mode === 'forward' && (
            <div className="mt-4">
              <label htmlFor="scenario-select" className="eyebrow text-muted">NGFS scenario</label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="mt-2 w-full border border-rule bg-paper px-3 py-2 text-[13px] text-ink"
              >
                {Object.keys(meta?.ngfs_scenarios ?? { 'Net Zero 2050': 0 }).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="border border-rule bg-paper px-5 py-5">
          <div className="flex items-baseline justify-between">
            <Eyebrow>Feature overrides</Eyebrow>
            <button
              onClick={() => setOverrides({})}
              className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:underline"
            >
              reset all
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted">Drag to perturb model inputs.</p>
          <Hairline className="mt-3" />
          <div className="mt-3 space-y-3">
            {(meta?.m3a_features ?? []).map((f) => {
              const range = meta?.feature_ranges[f] ?? { min: 0, max: 100 };
              const baseVal =
                trace?.stage_1_inputs.raw_features[f] ?? range.min;
              const live = overrides[f] ?? baseVal;
              const isOverridden = overrides[f] !== undefined;
              const step = (range.max - range.min) / 200;
              const prettyName = PRETTY_FEATURE[f] ?? f;
              const unit = FEATURE_UNIT[f] ?? '';
              const decimals = f.startsWith('log') || f.includes('intensity') ? 3 : 1;
              return (
                <div key={f}>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={`f-${f}`} className="text-[11px] text-ink">
                      {prettyName}
                    </label>
                    <span className="flex items-center gap-2">
                      <span
                        className={[
                          'font-mono text-[11px] tab-num',
                          isOverridden ? 'text-amber font-semibold italic' : 'text-muted',
                        ].join(' ')}
                        aria-label={isOverridden ? 'overridden value' : undefined}
                      >
                        {isOverridden && <span aria-hidden="true">● </span>}
                        {live.toFixed(decimals)}
                      </span>
                      {isOverridden && (
                        <button
                          aria-label={`Reset ${prettyName} to baseline`}
                          onClick={() => {
                            setOverrides((prev) => {
                              const next = { ...prev };
                              delete next[f];
                              return next;
                            });
                          }}
                          className="font-mono text-[9px] uppercase tracking-eyebrow text-sea hover:underline"
                        >
                          <span aria-hidden="true">↺</span>
                        </button>
                      )}
                    </span>
                  </div>
                  <input
                    id={`f-${f}`}
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={step}
                    value={live}
                    aria-valuetext={`${live.toFixed(decimals)}${unit ? ' ' + unit : ''}`}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setOverrides((prev) => ({ ...prev, [f]: v }));
                    }}
                    className="rule-slider"
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="border border-rule bg-paper px-5 py-5">
          <Eyebrow>Loss mapping</Eyebrow>
          <Hairline className="mt-3" />
          <SliderRow id="elasticity" label="ε elasticity" unit="elasticity coefficient" value={elasticity} min={0.3} max={1.2} step={0.01} format={(v) => v.toFixed(2)} onChange={setElasticity} />
          <SliderRow id="gwp" label="GWP USDm" unit="USD millions" value={gwp} min={500} max={3000} step={50} format={(v) => v.toFixed(0)} onChange={setGwp} />
          <SliderRow id="base-lr" label="Base LR" unit="base loss ratio" value={baseLr} min={0.40} max={0.85} step={0.01} format={(v) => v.toFixed(2)} onChange={setBaseLr} />
        </section>
      </aside>

      {/* Stages */}
      <div className="space-y-3">
        {/* Hero strip */}
        <section className={['border px-5 py-4 transition', cached ? 'border-amber/50 bg-amber/[0.06]' : 'border-rule bg-paper'].join(' ')}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Eyebrow>{cached ? 'Cached mode · API offline' : 'Live · FastAPI'}</Eyebrow>
              <p className="mt-1 font-mono text-[11px] tab-num text-ink">
                {trace?.trace_meta.served_by === 'fastapi'
                  ? `POST /predict · ${trace.trace_meta.total_latency_ms?.toFixed(1) ?? '—'} ms · seed ${trace.trace_meta.seed}`
                  : 'Numbers from key_numbers_python.json + parametric overlay. Set VITE_PIPELINE_API to wire the real model.'}
              </p>
              {cached && getLastApiError() && (
                <p className="mt-1 truncate font-mono text-[10px] text-amber">
                  reason: {getLastApiError()}
                </p>
              )}
            </div>
            <Ticker code={busy ? '••' : 'OK'} tone={busy ? 'amber' : cached ? 'amber' : 'sage'} size="md" />
          </div>
        </section>

        {trace ? (
          <>
            <Stage code="01" title="Input vector" subtitle={`${trace.stage_1_inputs.country} · base year ${trace.stage_1_inputs.mode === 'hindcast' ? 2023 : 2024}`} onInspect={() => setInspect('01')} accent="ink">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 lg:grid-cols-3">
                {Object.entries(trace.stage_1_inputs.raw_features).slice(0, 9).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between border-b border-rule/60 py-1">
                    <span className="text-[10px] text-muted">{PRETTY_FEATURE[k] ?? k}</span>
                    <span className={['font-mono text-[11px] tab-num', trace.stage_1_inputs.applied_overrides[k] !== undefined ? 'text-amber font-semibold' : 'text-ink'].join(' ')}>
                      {typeof v === 'number' ? v.toFixed(2) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </Stage>

            <Arrow />

            <Stage code="02" title="Feature engineering" subtitle={`X ∈ ℝ${trace.stage_2_features.feature_order.length} · log() applied to GDP, pop, GHG lags`} onInspect={() => setInspect('02')} accent="sea">
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex gap-1 whitespace-nowrap font-mono text-[10px]">
                  {trace.stage_2_features.X.map((x, i) => (
                    <span key={i} className="border border-rule px-1.5 py-0.5 tab-num text-ink">
                      {x.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            </Stage>

            <Arrow />

            <Stage
              code="03"
              title="XGBoost inference"
              subtitle={`M3a.predict(X) → exp(log_GHG) → Mt`}
              onInspect={() => setInspect('03')}
              accent="rust"
            >
              <div className="grid grid-cols-3 gap-3">
                <StatBig
                  value={`${trace.stage_3_xgb.ghg_pred_Mt.toFixed(1)} Mt`}
                  label="Predicted"
                  accent="ink"
                  size="md"
                />
                {trace.stage_3_xgb.actual_Mt !== null && (
                  <StatBig
                    value={`${trace.stage_3_xgb.actual_Mt.toFixed(1)} Mt`}
                    label="Actual 2024"
                    accent="sea"
                    size="md"
                  />
                )}
                {trace.stage_3_xgb.err_pct !== null && (
                  <StatBig
                    value={`${trace.stage_3_xgb.err_pct >= 0 ? '+' : ''}${trace.stage_3_xgb.err_pct.toFixed(2)}%`}
                    label="Error"
                    accent={Math.abs(trace.stage_3_xgb.err_pct) <= 5 ? 'sage' : 'amber'}
                    size="md"
                  />
                )}
              </div>
              <Hairline className="mt-3" />
              <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                <span>Inference</span>
                <span className="tab-num text-ink">
                  {trace.stage_3_xgb.inference_ms !== null
                    ? `${trace.stage_3_xgb.inference_ms.toFixed(2)} ms · XGBoost ${trace.stage_3_xgb.model}`
                    : '— ms · cached'}
                </span>
              </div>
            </Stage>

            <Arrow />

            <Stage
              code="04"
              title="NGFS scenario overlay"
              subtitle={`${trace.stage_4_scenario.scenario} · g = ${(trace.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}% p.a.`}
              onInspect={() => setInspect('04')}
              accent="amber"
            >
              <p className="font-serif italic text-[14px] leading-relaxed text-ink">
                E({trace.stage_1_inputs.year}) = {trace.stage_3_xgb.ghg_pred_Mt.toFixed(1)} × (1 + {(trace.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}%)<sup>{trace.stage_4_scenario.years_compounded}</sup> = <span className="not-italic font-semibold">{trace.stage_4_scenario.target_Mt.toFixed(1)} Mt</span>
              </p>
              <Hairline className="mt-3" />
              <p className="mt-2 font-mono text-[11px] tab-num text-muted">
                Δ vs Hot House ({trace.stage_4_scenario.hothouse_Mt.toFixed(1)} Mt): {(trace.stage_4_scenario.delta_pct * 100).toFixed(2)}%
              </p>
            </Stage>

            <Arrow />

            <Stage
              code="05"
              title="Loss-ratio mapping"
              subtitle={`LR = base × (1 + ε × Δ%) · GWP × LR = expected loss`}
              onInspect={() => setInspect('05')}
              accent="ink"
            >
              <div className="grid grid-cols-3 gap-3">
                <StatBig
                  value={`${(trace.stage_5_loss.lr * 100).toFixed(1)}%`}
                  label="Loss ratio"
                  accent={trace.stage_5_loss.lr_pp_vs_base < 0 ? 'sage' : 'rust'}
                  size="md"
                />
                <StatBig
                  value={`USD ${trace.stage_5_loss.loss_USDm.toFixed(0)}m`}
                  label="Expected loss"
                  accent="ink"
                  size="md"
                />
                <StatBig
                  value={`${trace.stage_5_loss.loss_swing_vs_hothouse_USDm >= 0 ? '+' : '−'}USD ${Math.abs(trace.stage_5_loss.loss_swing_vs_hothouse_USDm).toFixed(0)}m`}
                  label="Δ vs Hot House"
                  accent="sea"
                  size="md"
                />
              </div>
            </Stage>
          </>
        ) : (
          <Card><p className="text-[12px] text-muted">Loading pipeline…</p></Card>
        )}

        <p className="px-1 text-center font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          {trace?.trace_meta.served_by === 'fastapi' ? 'Live · FastAPI' : 'Cached · static JSON'} · seed {trace?.trace_meta.seed ?? 2026} · pipeline v{trace?.trace_meta.pipeline_version ?? '1.0'}
        </p>
      </div>

      {/* Inspect modal */}
      <InspectSheet kind={inspect} trace={trace} country={country} onClose={() => setInspect(null)} />
    </div>
  );
}

function Stage({
  code, title, subtitle, accent, onInspect, children,
}: {
  code: string;
  title: string;
  subtitle?: string;
  accent: 'ink' | 'sea' | 'rust' | 'amber';
  onInspect: () => void;
  children: React.ReactNode;
}) {
  const accentBar = {
    ink:   'before:bg-ink',
    sea:   'before:bg-sea',
    rust:  'before:bg-rust',
    amber: 'before:bg-amber',
  }[accent];
  return (
    <section
      className={[
        'relative border border-rule bg-paper px-5 py-4 transition',
        'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
        accentBar,
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <Eyebrow>Stage {code}</Eyebrow>
          <h2 className="display mt-0.5 text-[20px] leading-tight text-ink lg:text-[26px]">{title}</h2>
          {subtitle && <p className="mt-1 text-[11px] text-muted">{subtitle}</p>}
        </div>
        <button
          onClick={onInspect}
          aria-label={`Inspect stage ${code}: ${title}`}
          className="shrink-0 border border-rule px-2 py-1 font-mono text-[9px] uppercase tracking-eyebrow text-sea hover:bg-sea/5"
        >
          inspect <span aria-hidden="true">→</span>
        </button>
      </div>
      <Hairline className="mt-3" />
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Arrow() {
  return (
    <div aria-hidden="true" className="flex justify-center py-1">
      <span className="font-mono text-[14px] text-muted">↓</span>
    </div>
  );
}

function SliderRow({
  id, label, unit, value, min, max, step, format, onChange,
}: {
  id: string; label: string; unit: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void;
}) {
  const inputId = `slider-${id}`;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-[11px] text-ink">{label}</label>
        <span className="font-mono text-[11px] tab-num text-ink">{format(value)}</span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${format(value)} ${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rule-slider"
      />
    </div>
  );
}

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
  return (
    <>
      <h2 id={titleId} className="display text-[28px] leading-tight text-ink">Raw input vector</h2>
      <p className="mt-1 text-[12px] text-muted">Pulled from sea_panel row · {trace.stage_1_inputs.country} · base year {trace.stage_1_inputs.mode === 'hindcast' ? 2023 : 2024}.</p>
      <Hairline className="mt-3" />
      <table className="mt-3 w-full text-[12px]">
        <thead>
          <tr className="border-b border-rule">
            <th className="py-1 text-left text-[10px] uppercase tracking-eyebrow text-muted">Feature</th>
            <th className="py-1 text-right text-[10px] uppercase tracking-eyebrow text-muted">Base</th>
            <th className="py-1 text-right text-[10px] uppercase tracking-eyebrow text-muted">Override</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {Object.entries(trace.stage_1_inputs.raw_features).map(([k, v]) => {
            const ov = trace.stage_1_inputs.applied_overrides[k];
            return (
              <tr key={k}>
                <td className="py-1.5 text-ink">{PRETTY_FEATURE[k] ?? k}</td>
                <td className="py-1.5 text-right font-mono tab-num text-ink/70">{typeof v === 'number' ? v.toFixed(3) : String(v)}</td>
                <td className="py-1.5 text-right font-mono tab-num text-amber">{ov !== undefined ? ov.toFixed(3) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
          <Eyebrow>Performance · feature gain (M3b)</Eyebrow>
          <ul className="mt-2 space-y-1.5">
            {DRIVERS.slice(0, 6).map((d) => (
              <li key={d.feature} className="flex items-center gap-2">
                <span className="w-32 text-[11px] text-ink">{d.feature}</span>
                <div className="h-2 flex-1 bg-ink/10">
                  <div className="h-full bg-sea" style={{ width: `${(d.gain * 100).toFixed(1)}%` }} />
                </div>
                <span className="w-10 text-right font-mono text-[10px] tab-num text-ink">{(d.gain * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Eyebrow>Diagnostic · sign-flips</Eyebrow>
          <table className="mt-2 w-full text-[11px]">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-1 text-left text-[9px] uppercase tracking-eyebrow text-muted">Feature</th>
                <th className="py-1 text-right text-[9px] uppercase tracking-eyebrow text-muted">Pair r</th>
                <th className="py-1 text-right text-[9px] uppercase tracking-eyebrow text-muted">Partial r</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {canon.partial_correlations.map((r) => (
                <tr key={r.feature}>
                  <td className="py-1 text-ink">
                    {r.feature}
                    {r.flag === 'SIGN-FLIP' && <span className="ml-1 font-mono text-[8px] uppercase tracking-eyebrow text-amber">FLIP</span>}
                  </td>
                  <td className="py-1 text-right font-mono tab-num text-sea">{r.pairwise_r >= 0 ? '+' : ''}{r.pairwise_r.toFixed(2)}</td>
                  <td className="py-1 text-right font-mono tab-num text-rust">{r.partial_r >= 0 ? '+' : ''}{r.partial_r.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <p className="mt-1 text-[11px] text-muted">% over what scale-implied STIRPAT predicts.</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {SECTORS.map((s) => {
              const v = row[s] ?? 0;
              return (
                <li key={s} className="flex items-baseline justify-between border-b border-rule/50 py-0.5">
                  <span className="text-ink">{s}</span>
                  <span className={['font-mono tab-num', v >= 150 ? 'text-rust' : v >= 25 ? 'text-amber' : v <= -25 ? 'text-sage' : 'text-muted'].join(' ')}>
                    {v >= 0 ? '+' : ''}{v}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function Inspect05({ trace, titleId }: { trace: Trace; titleId: string }) {
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
