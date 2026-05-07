// Live-progress simulation modal — the demo's wow moment.
// Stages reveal sequentially with status icons (greyed → spinner → ✓), then
// the result tile renders with all numbers + Save/Open Report CTAs.
//
// Stages 01–06 compute locally from cedent.ts helpers; stage 07 calls the real
// /predict (or cached fallback); stage 08–09 derive from stage 07 output. If
// the API is offline, the modal shows a "cached" pill and otherwise behaves
// identically.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow, Hairline, StatBig } from './Card';
import { useFocusTrap } from '../lib/useFocusTrap';
import {
  COUNTRY_TIER, LOADING, SECTORS, SECTOR_RESIDUAL_PCT,
  adaptiveTier, composite, sectorTier, type Tier,
} from '../data/cedent';
import { NDGAIN_2023 } from '../data/keyNumbers';
import { predict, type Trace } from '../lib/pipeline';

type Mix = Record<(typeof SECTORS)[number], number>;

export type SimulationInputs = {
  country: string;
  mix: Mix;
  ndcPlanFiled: boolean;
  energyMixPct: number;
  scenario: string;
  elasticity: number;
  gwpUsdM: number;
  baseLossRatio: number;
};

export type SimulationResult = {
  weightedResidual: number;
  countryTier: Tier;
  sectorTier: Tier;
  adaptiveTier: Tier;
  composite: Tier;
  loadingPct: number;
  loadingLabel: string;
  ndgain: number;
  trace: Trace | null;
  cached: boolean;
  inferenceMs: number | null;
  lr: number;
  expectedLossUsdM: number;
  swingUsdM: number;
  capitalAddPct: number;
  hothouseLr: number;
  // Override flags surfaced to UI
  override1Sector: boolean;
  override2Energy: boolean;
  override3Ndc: boolean;
};

type StageStatus = 'pending' | 'running' | 'done';

type StageId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09';

const STAGE_LIST: { id: StageId; title: string; subtitle: string }[] = [
  { id: '01', title: 'Capture inputs',          subtitle: 'Counterparty, sector mix, scenario, capital' },
  { id: '02', title: 'Country tier',            subtitle: 'STIRPAT residual lookup → A–E letter' },
  { id: '03', title: 'Sector tier',             subtitle: 'Weighted residual on cedent GWP mix' },
  { id: '04', title: 'Adaptive tier',           subtitle: 'ND-GAIN 2023 composite band' },
  { id: '05', title: 'Composite + overrides',   subtitle: 'Mode + NDC / Energy / Sector D-E overrides' },
  { id: '06', title: 'Premium loading',         subtitle: 'Loading curve from composite tier' },
  { id: '07', title: 'NGFS scenario · /predict', subtitle: 'Real inference call to the FastAPI service' },
  { id: '08', title: 'Loss ratio + capital',     subtitle: 'ε mapping, BNM CRST §6.3 capital buffer' },
  { id: '09', title: 'Pricing recommendation',  subtitle: 'Final tier · loading · LR · capital' },
];

const TIER_BG: Record<Tier, string> = {
  A: '#3F8A66', B: '#0E7C86', C: '#B8761C', D: '#8B2E1F', E: '#0A1A2A',
};

const STAGE_DELAY_MS = 480; // 9 stages × ~480 ms ≈ 4.3 s total
const STAGE_RUN_MS = 280;

function computeLocal(inputs: SimulationInputs) {
  const ct = COUNTRY_TIER[inputs.country]?.tier ?? 'B';
  const residuals = SECTOR_RESIDUAL_PCT[inputs.country] ?? {};
  const weightedResidual = SECTORS.reduce(
    (sum, s) => sum + (inputs.mix[s] / 100) * (residuals[s] ?? 0),
    0,
  );

  let st = sectorTier(weightedResidual);
  // Override 2: high-carbon energy mix forces sector tier ≥ C
  let override2 = false;
  if (inputs.energyMixPct >= 50 && (st === 'A' || st === 'B')) {
    st = 'C';
    override2 = true;
  }
  if (inputs.energyMixPct >= 65 && st === 'C') {
    st = 'D';
    override2 = true;
  }

  const ndg = NDGAIN_2023.find((n) => n.country === inputs.country)?.gain ?? 50;
  const at = adaptiveTier(ndg);

  // Override 1 is baked into composite() — sector D/E forces composite ≥ D
  const compBeforeNdc = composite(ct, st, at);
  const override1 = (st === 'D' || st === 'E');
  let comp = compBeforeNdc;
  let override3 = false;
  // Override 3: missing NDC plan downgrades A/B composite to C
  if (!inputs.ndcPlanFiled && (comp === 'A' || comp === 'B')) {
    comp = 'C';
    override3 = true;
  }
  return {
    countryTier: ct, sectorTier: st, adaptiveTier: at, composite: comp,
    weightedResidual, ndgain: ndg,
    override1Sector: override1, override2Energy: override2, override3Ndc: override3,
  };
}

export function SimulationModal({
  open,
  inputs,
  onClose,
  onSave,
  onResult,
}: {
  open: boolean;
  inputs: SimulationInputs | null;
  onClose: () => void;
  onSave?: (result: SimulationResult) => void;
  onResult?: (result: SimulationResult) => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const [statuses, setStatuses] = useState<Record<StageId, StageStatus>>({
    '01': 'pending', '02': 'pending', '03': 'pending', '04': 'pending',
    '05': 'pending', '06': 'pending', '07': 'pending', '08': 'pending', '09': 'pending',
  });
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const cancelledRef = useRef(false);

  const localPreview = useMemo(() => {
    if (!inputs) return null;
    return computeLocal(inputs);
  }, [inputs]);

  // Reset + run when modal opens with fresh inputs.
  useEffect(() => {
    if (!open || !inputs || !localPreview) return;
    cancelledRef.current = false;
    setResult(null);
    setStatuses({
      '01': 'pending', '02': 'pending', '03': 'pending', '04': 'pending',
      '05': 'pending', '06': 'pending', '07': 'pending', '08': 'pending', '09': 'pending',
    });

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const setStage = (id: StageId, s: StageStatus) => {
      if (cancelledRef.current) return;
      setStatuses((prev) => ({ ...prev, [id]: s }));
    };

    const ids: StageId[] = ['01', '02', '03', '04', '05', '06'];

    (async () => {
      // Stages 01–06 run as fast local computations with delays for visual
      // feedback. The numbers themselves were already computed once via
      // computeLocal() and stored in localPreview.
      for (const id of ids) {
        if (cancelledRef.current) return;
        setStage(id, 'running');
        await sleep(STAGE_RUN_MS);
        setStage(id, 'done');
        await sleep(STAGE_DELAY_MS - STAGE_RUN_MS);
      }
      if (cancelledRef.current) return;

      // Stage 07 — the real /predict call (or cached fallback).
      setStage('07', 'running');
      const t0 = performance.now();
      let trace: Trace | null = null;
      try {
        trace = await predict({
          mode: 'forward',
          country: inputs.country,
          scenario: inputs.scenario,
          elasticity: inputs.elasticity,
          gwp_usdm: inputs.gwpUsdM,
          base_lr: inputs.baseLossRatio,
          target_year: 2030,
        });
      } catch {
        trace = null;
      }
      const t1 = performance.now();
      if (cancelledRef.current) return;
      setStage('07', 'done');
      await sleep(STAGE_DELAY_MS - STAGE_RUN_MS);

      // Stage 08 — loss ratio + capital. Prefer backend numbers when present.
      if (cancelledRef.current) return;
      setStage('08', 'running');
      await sleep(STAGE_RUN_MS);
      const lr = trace?.stage_5_loss.lr ?? inputs.baseLossRatio;
      const expectedLoss = trace?.stage_5_loss.loss_USDm ?? inputs.gwpUsdM * lr;
      const swing = trace?.stage_5_loss.loss_swing_vs_hothouse_USDm ?? 0;
      const lrAboveBase = lr - inputs.baseLossRatio;
      const capitalAddPct = Math.max(0, Math.round(lrAboveBase * 100 * 0.7));
      const hothouseLr = inputs.baseLossRatio;
      setStage('08', 'done');
      await sleep(STAGE_DELAY_MS - STAGE_RUN_MS);

      // Stage 09 — final composition.
      if (cancelledRef.current) return;
      setStage('09', 'running');
      await sleep(STAGE_RUN_MS);

      const cached = trace?.trace_meta.served_by !== 'fastapi';
      const inferenceMs = trace?.stage_3_xgb.inference_ms ?? null;
      const elapsed = Math.round(t1 - t0);

      const final: SimulationResult = {
        weightedResidual: localPreview.weightedResidual,
        countryTier: localPreview.countryTier,
        sectorTier: localPreview.sectorTier,
        adaptiveTier: localPreview.adaptiveTier,
        composite: localPreview.composite,
        loadingPct: LOADING[localPreview.composite].pct,
        loadingLabel: LOADING[localPreview.composite].label,
        ndgain: localPreview.ndgain,
        trace,
        cached,
        // Surface end-to-end latency when the inference timing is missing
        // (cached mode), so the user sees something honest in the UI.
        inferenceMs: inferenceMs ?? (cached ? null : elapsed),
        lr,
        expectedLossUsdM: expectedLoss,
        swingUsdM: swing,
        capitalAddPct,
        hothouseLr,
        override1Sector: localPreview.override1Sector,
        override2Energy: localPreview.override2Energy,
        override3Ndc: localPreview.override3Ndc,
      };
      setResult(final);
      setStage('09', 'done');
      onResult?.(final);
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [open, inputs, localPreview, onResult]);

  if (!open || !inputs || !localPreview) return null;

  const allDone = result !== null;

  const handleSave = () => {
    if (!result) return;
    onSave?.(result);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sim-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-ink/55 backdrop-blur-[2px]"
      />
      <article
        className="relative mx-auto flex w-full max-w-canvas max-h-[92vh] flex-col rounded-t-[18px] border-t border-rule bg-paper shadow-plate lg:rounded-[18px] lg:border lg:my-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0))' }}
      >
        {/* Header */}
        <header className="flex items-baseline justify-between gap-3 border-b border-rule px-5 py-4">
          <div>
            <Eyebrow>Live simulation · POST /predict</Eyebrow>
            <h2 id="sim-modal-title" className="display mt-0.5 text-[22px] leading-tight text-ink lg:text-[28px]">
              Pricing the {inputs.country} cedent.
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close simulation"
            className="font-mono text-[11px] uppercase tracking-eyebrow text-muted hover:text-ink"
          >
            Close <span aria-hidden="true">✕</span>
          </button>
        </header>

        {/* Body — scrolling stages list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ol className="space-y-2">
            {STAGE_LIST.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                status={statuses[stage.id]}
                inputs={inputs}
                preview={localPreview}
                result={result}
              />
            ))}
          </ol>

          {/* Result tile — appears after all stages complete */}
          {allDone && result && (
            <ResultTile
              result={result}
              inputs={inputs}
              onSave={handleSave}
              savedToast={savedToast}
              onClose={onClose}
            />
          )}
        </div>
      </article>
    </div>
  );
}

function StageRow({
  stage,
  status,
  inputs,
  preview,
  result,
}: {
  stage: { id: StageId; title: string; subtitle: string };
  status: StageStatus;
  inputs: SimulationInputs;
  preview: NonNullable<ReturnType<typeof computeLocal>>;
  result: SimulationResult | null;
}) {
  const isDone = status === 'done';
  const isRunning = status === 'running';
  const isPending = status === 'pending';

  return (
    <li
      className={[
        'relative border px-4 py-3 transition',
        isPending ? 'border-rule/60 bg-paper/40 text-muted' : 'border-rule bg-paper text-ink',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <StageIcon status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Stage {stage.id}
            </p>
            {isRunning && (
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-amber pulse-mark">
                Running…
              </span>
            )}
            {isDone && (
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-sage">
                Done
              </span>
            )}
          </div>
          <h3 className={['mt-0.5 text-[14px] font-semibold leading-tight', isPending ? 'text-muted' : 'text-ink'].join(' ')}>
            {stage.title}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">{stage.subtitle}</p>

          {/* Stage-specific reveal once done */}
          {isDone && (
            <div className="mt-2 border-t border-rule/60 pt-2">
              <StageDetail
                stageId={stage.id}
                inputs={inputs}
                preview={preview}
                result={result}
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StageIcon({ status }: { status: StageStatus }) {
  if (status === 'done') {
    return (
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center border border-sage bg-sage/10 text-sage"
      >
        <span className="text-[12px] font-bold">✓</span>
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center border border-amber bg-amber/10"
      >
        <span className="block h-3 w-3 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="grid h-6 w-6 shrink-0 place-items-center border border-rule/70 bg-paper text-muted"
    >
      <span className="block h-1.5 w-1.5 rounded-full bg-rule" />
    </span>
  );
}

function StageDetail({
  stageId,
  inputs,
  preview,
  result,
}: {
  stageId: StageId;
  inputs: SimulationInputs;
  preview: NonNullable<ReturnType<typeof computeLocal>>;
  result: SimulationResult | null;
}) {
  if (stageId === '01') {
    const dom = SECTORS.map((s) => ({ s, w: inputs.mix[s] })).sort((a, b) => b.w - a.w).slice(0, 3);
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <Row label="Country" value={inputs.country} />
        <Row label="Scenario" value={inputs.scenario} />
        <Row label="ε" value={inputs.elasticity.toFixed(2)} mono />
        <Row label="GWP" value={`USD ${Math.round(inputs.gwpUsdM)}m`} mono />
        <Row label="NDC" value={inputs.ndcPlanFiled ? 'Filed' : 'Not filed'} />
        <Row label="Energy mix" value={`${inputs.energyMixPct.toFixed(0)}%`} mono />
        <Row label="Top sectors" value={dom.map((d) => `${d.s.split(' ')[0]} ${d.w.toFixed(0)}%`).join(' · ')} />
      </dl>
    );
  }

  if (stageId === '02') {
    const c = COUNTRY_TIER[inputs.country];
    return (
      <div className="flex items-center gap-3">
        <TierBadge tier={preview.countryTier} size="sm" />
        <p className="font-mono text-[11px] tab-num text-ink">
          STIRPAT residual {c.residualPct >= 0 ? '+' : ''}{c.residualPct}% → tier <b>{preview.countryTier}</b>
        </p>
      </div>
    );
  }

  if (stageId === '03') {
    return (
      <div className="flex items-center gap-3">
        <TierBadge tier={preview.sectorTier} size="sm" />
        <p className="font-mono text-[11px] tab-num text-ink">
          Weighted residual {preview.weightedResidual >= 0 ? '+' : ''}{preview.weightedResidual.toFixed(0)}% → tier <b>{preview.sectorTier}</b>
        </p>
      </div>
    );
  }

  if (stageId === '04') {
    return (
      <div className="flex items-center gap-3">
        <TierBadge tier={preview.adaptiveTier} size="sm" />
        <p className="font-mono text-[11px] tab-num text-ink">
          ND-GAIN {preview.ndgain.toFixed(1)} → adaptive tier <b>{preview.adaptiveTier}</b>
        </p>
      </div>
    );
  }

  if (stageId === '05') {
    const flags: string[] = [];
    if (preview.override1Sector) flags.push('Sector D/E ⇒ comp ≥ D');
    if (preview.override2Energy) flags.push('Energy mix ⇒ sector ↑');
    if (preview.override3Ndc) flags.push('Missing NDC ⇒ A/B → C');
    return (
      <div className="flex items-center gap-3">
        <TierBadge tier={preview.composite} size="sm" />
        <div className="flex-1">
          <p className="font-mono text-[11px] tab-num text-ink">
            Composite <b>{preview.composite}</b> = mode({preview.countryTier}, {preview.sectorTier}, {preview.adaptiveTier}) + overrides
          </p>
          {flags.length > 0 && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-amber">
              {flags.join(' · ')}
            </p>
          )}
          {flags.length === 0 && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              No overrides triggered
            </p>
          )}
        </div>
      </div>
    );
  }

  if (stageId === '06') {
    const l = LOADING[preview.composite];
    return (
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] text-ink">{l.label}</p>
        <span className={['display tab-num text-[20px] italic', l.pct > 0 ? 'text-amber' : l.pct < 0 ? 'text-sage' : 'text-ink'].join(' ')}>
          {l.pct >= 0 ? '+' : ''}{l.pct}%
        </span>
      </div>
    );
  }

  if (stageId === '07') {
    if (!result) return null;
    const t = result.trace;
    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] tab-num text-ink">
            E(2030) ≈ <b>{t ? t.stage_4_scenario.target_Mt.toFixed(1) : '—'} Mt</b>
            {t && <> · g = {(t.stage_4_scenario.growth_rate_pa * 100).toFixed(1)}% p.a.</>}
          </p>
          <span
            className={[
              'border px-2 py-0.5 font-mono text-[9px] uppercase tracking-eyebrow',
              result.cached ? 'border-amber/60 bg-amber/10 text-amber' : 'border-sage/60 bg-sage/10 text-sage',
            ].join(' ')}
          >
            {result.cached ? 'Cached mode' : 'Live · FastAPI'}
          </span>
        </div>
        {t && (
          <p className="font-mono text-[10px] tab-num text-muted">
            Δ vs Hot House {(t.stage_4_scenario.delta_pct * 100).toFixed(2)}%
            {result.inferenceMs !== null && ` · ${result.inferenceMs.toFixed(1)} ms`}
          </p>
        )}
      </div>
    );
  }

  if (stageId === '08') {
    if (!result) return null;
    return (
      <div className="grid grid-cols-3 gap-3">
        <StatBig
          value={`${(result.lr * 100).toFixed(1)}%`}
          label="Loss ratio"
          accent={result.lr <= inputs.baseLossRatio ? 'sage' : 'rust'}
          size="sm"
        />
        <StatBig
          value={`USD ${Math.round(result.expectedLossUsdM)}m`}
          label="Expected loss"
          accent="ink"
          size="sm"
        />
        <StatBig
          value={`+${result.capitalAddPct}%`}
          label="Capital buffer"
          accent={result.capitalAddPct >= 8 ? 'rust' : result.capitalAddPct >= 4 ? 'amber' : 'sage'}
          size="sm"
          align="right"
        />
      </div>
    );
  }

  if (stageId === '09') {
    if (!result) return null;
    return (
      <p className="font-serif italic text-[13px] leading-relaxed text-ink">
        Composite tier <b className="not-italic">{result.composite}</b>, premium loading <b className="not-italic">{result.loadingPct >= 0 ? '+' : ''}{result.loadingPct}%</b>, loss ratio <b className="not-italic">{(result.lr * 100).toFixed(1)}%</b>, capital buffer <b className="not-italic">+{result.capitalAddPct}%</b>.
      </p>
    );
  }

  return null;
}

function ResultTile({
  result,
  inputs,
  onSave,
  savedToast,
  onClose,
}: {
  result: SimulationResult;
  inputs: SimulationInputs;
  onSave: () => void;
  savedToast: boolean;
  onClose: () => void;
}) {
  const swingAbs = Math.abs(Math.round(result.swingUsdM));
  return (
    <section className="mt-5 border border-ink bg-ink px-5 py-5 text-paper lg:px-7 lg:py-6">
      <div className="flex items-baseline justify-between">
        <Eyebrow tone="paper">Pricing recommendation</Eyebrow>
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-paper/60">
          {inputs.scenario} · ε {inputs.elasticity.toFixed(2)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-5">
        <div
          className="grid h-[88px] w-[88px] place-items-center text-paper"
          style={{ background: TIER_BG[result.composite] }}
        >
          <span className="display text-[64px] leading-none italic">{result.composite}</span>
        </div>
        <div>
          <p className="text-[14px] font-semibold">{result.loadingLabel}</p>
          <p className="mt-1 text-[11px] text-paper/70">
            Country {result.countryTier} · Sector {result.sectorTier} · Adaptive {result.adaptiveTier}
          </p>
        </div>
      </div>

      <Hairline className="mt-4 border-paper/20" strong />

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBig
          value={`${result.loadingPct >= 0 ? '+' : ''}${result.loadingPct}%`}
          label="Loading"
          accent={result.loadingPct > 0 ? 'amber' : 'sage'}
          size="md"
        />
        <StatBig
          value={`${(result.lr * 100).toFixed(1)}%`}
          label="Loss ratio"
          accent={result.lr <= inputs.baseLossRatio ? 'sage' : 'rust'}
          size="md"
        />
        <StatBig
          value={`USD ${Math.round(result.expectedLossUsdM)}m`}
          label="Expected loss"
          accent="paper"
          size="md"
        />
        <StatBig
          value={`+${result.capitalAddPct}%`}
          label="Capital buffer"
          accent={result.capitalAddPct >= 8 ? 'rust' : result.capitalAddPct >= 4 ? 'amber' : 'sage'}
          size="md"
        />
      </div>

      <div className="mt-4 border-t border-paper/15 bg-paper/5 px-3 py-2 text-center">
        <span className="font-mono text-[11px] uppercase tracking-eyebrow text-paper/85">
          Δ vs Hot House:&nbsp;
          <span className="font-semibold">
            {result.swingUsdM >= 0 ? '+' : '−'}USD {swingAbs}m
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <button
          onClick={onSave}
          className="border border-paper bg-paper px-4 py-3 text-[13px] font-semibold text-ink transition hover:bg-sand"
        >
          {savedToast ? 'Saved ✓' : 'Save profile →'}
        </button>
        <Link
          to="/brief"
          onClick={onClose}
          className="border border-paper px-4 py-3 text-center text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
        >
          Open report →
        </Link>
      </div>
    </section>
  );
}

function TierBadge({ tier, size = 'md' }: { tier: Tier; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-9 text-[14px]' : 'h-10 w-12 text-[18px]';
  return (
    <span
      className={`grid ${dim} place-items-center font-bold text-paper`}
      style={{ background: TIER_BG[tier] }}
    >
      {tier}
    </span>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <dt className="text-[10px] uppercase tracking-eyebrow text-muted">{label}</dt>
      <dd className={['text-ink', mono ? 'font-mono tab-num text-[11px]' : 'text-[11px]'].join(' ')}>{value}</dd>
    </div>
  );
}
