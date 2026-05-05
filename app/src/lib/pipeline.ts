// Pipeline client — wraps POST /predict on the FastAPI service.
// Falls back to a local synthesiser using key_numbers_python.json + the real
// pipeline_meta.json (synced from serve/models/meta.json by `npm run sync-data`)
// when the API is unreachable or VITE_PIPELINE_API is unset, so the screen still
// renders honestly in offline / pre-deploy demos.

import canon from '../data/key_numbers_python.json';
import metaFile from '../data/pipeline_meta.json';

export type Mode = 'hindcast' | 'forward';

export interface PredictRequest {
  mode: Mode;
  country: string;
  scenario?: string;
  elasticity?: number;
  gwp_usdm?: number;
  base_lr?: number;
  target_year?: number;
  feature_overrides?: Partial<Record<string, number>>;
}

export interface Trace {
  stage_1_inputs: {
    country: string;
    year: number;
    mode: Mode;
    raw_features: Record<string, number>;
    applied_overrides: Record<string, number>;
  };
  stage_2_features: {
    feature_order: string[];
    X: number[];
    log_transformed_keys: string[];
  };
  stage_3_xgb: {
    log_ghg_pred: number;
    ghg_pred_Mt: number;
    actual_Mt: number | null;
    err_pct: number | null;
    inference_ms: number | null;
    model: 'M3a' | 'M3b';
  };
  stage_4_scenario: {
    scenario: string;
    growth_rate_pa: number;
    years_compounded: number;
    hothouse_Mt: number;
    target_Mt: number;
    delta_pct: number;
  };
  stage_5_loss: {
    lr: number;
    lr_pp_vs_base: number;
    loss_USDm: number;
    loss_swing_vs_hothouse_USDm: number;
  };
  trace_meta: {
    pipeline_version: string;
    seed: number;
    total_latency_ms: number | null;
    served_by: 'fastapi' | 'cached';
    served_at: string;
  };
}

export interface PipelineMeta {
  pipeline_version: string;
  random_state: number;
  m3a_features: string[];
  m3b_features: string[];
  countries: string[];
  last_actual_year: number;
  ngfs_scenarios: Record<string, number>;
  feature_ranges: Record<string, { min: number; max: number }>;
  feature_panel_2023: Record<string, Record<string, number>>;
  feature_panel_2024: Record<string, Record<string, number>>;
  actual_2024: Record<string, number>;
  constants: { gwp_usdm: number; base_lr: number; elasticity: number };
}

const API = import.meta.env.VITE_PIPELINE_API as string | undefined;

let metaCache: PipelineMeta | null = null;
let lastApiError: string | null = null;

// FALLBACK_META is the real meta.json snapshot bundled at build time. All 10 SEA
// countries, 10 features, and the same NGFS scenarios as the server. Eliminates
// the 3-country mislabel risk when API is offline.
const FALLBACK_META: PipelineMeta = metaFile as unknown as PipelineMeta;

export function getLastApiError(): string | null {
  return lastApiError;
}

/**
 * Fetch pipeline metadata. Memoised; falls back to FALLBACK_META if API absent.
 */
export async function getMeta(): Promise<PipelineMeta> {
  if (metaCache) return metaCache;
  if (!API) {
    metaCache = FALLBACK_META;
    return metaCache;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${API}/meta`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`meta ${res.status}`);
    metaCache = (await res.json()) as PipelineMeta;
    lastApiError = null;
    return metaCache;
  } catch (err) {
    lastApiError = err instanceof Error ? err.message : String(err);
    metaCache = FALLBACK_META;
    return metaCache;
  }
}

/**
 * Predict — calls FastAPI; on failure, returns a synthesised cached trace so the UI
 * never sits on an empty state. Pass an external AbortSignal to cancel in-flight
 * requests when a newer one supersedes them (slider drag).
 */
export async function predict(req: PredictRequest, signal?: AbortSignal): Promise<Trace> {
  if (API) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      // Forward external cancellation into our own controller.
      const onAbort = () => ctrl.abort();
      signal?.addEventListener('abort', onAbort);
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      signal?.removeEventListener('abort', onAbort);
      if (!res.ok) throw new Error(`predict ${res.status}`);
      const trace = (await res.json()) as Trace;
      // Light runtime guard — bad numerics from a hostile or buggy API shouldn't crash the UI.
      if (!Number.isFinite(trace?.stage_3_xgb?.ghg_pred_Mt)) {
        throw new Error('predict response had non-finite ghg_pred_Mt');
      }
      lastApiError = null;
      return trace;
    } catch (err) {
      // External-abort: don't fall back; let the caller handle it.
      if (signal?.aborted) throw err;
      lastApiError = err instanceof Error ? err.message : String(err);
      // fall through to synthesiser
    }
  }
  return synthesise(req);
}

/**
 * Cached-mode synthesiser. Uses canon JSON outputs + the real meta panel to produce
 * a stage-shaped trace. Honest about being cached — `inference_ms` is null and
 * `served_by` reads 'cached'. Forward-mode anchor mirrors serve/pipeline.py:122
 * (compound from M3a-predicted 2024 emissions, NOT from exp(log_GHG_lag1)).
 */
function synthesise(req: PredictRequest): Trace {
  const meta = metaCache ?? FALLBACK_META;
  const targetYear = req.target_year ?? (req.mode === 'hindcast' ? 2024 : 2030);
  const country = meta.feature_panel_2024[req.country] ? req.country : 'Vietnam';
  const baseFeatures = meta.feature_panel_2024[country];
  const overridesIn = req.feature_overrides ?? {};
  const overrides: Record<string, number> = Object.fromEntries(
    Object.entries(overridesIn).filter(([, v]) => v != null && Number.isFinite(v)) as [string, number][],
  );
  const raw: Record<string, number> = { ...baseFeatures, ...overrides };

  const X = meta.m3a_features.map((f) => raw[f] ?? 0);

  // Anchor on canon M3a 2024 prediction for both modes — server does the same.
  // Forward mode then compounds via NGFS scenario from that 2024 anchor.
  const canonM3a = canon.m3a_per_country.find((r) => r.country === country);
  const ghg_pred_Mt = canonM3a?.pred_2024 ?? Math.exp(raw.log_GHG_lag1 ?? 6.3);
  const log_ghg_pred = Math.log(Math.max(ghg_pred_Mt, 0.0001));
  const actual_Mt = req.mode === 'hindcast'
    ? (meta.actual_2024[country] ?? canonM3a?.actual_2024 ?? null)
    : null;
  const err_pct = actual_Mt !== null
    ? ((ghg_pred_Mt - actual_Mt) / actual_Mt) * 100
    : null;

  // Stage 4 — scenario compound growth from 2024 anchor. Mirrors server logic.
  const scenario = req.scenario ?? 'Current Policies';
  const g = meta.ngfs_scenarios[scenario] ?? 0;
  const yearsCompounded = Math.max(0, targetYear - 2024);
  const target_Mt = ghg_pred_Mt * Math.pow(1 + g, yearsCompounded);
  const hothouseG = meta.ngfs_scenarios['Current Policies'] ?? 0.025;
  const hothouse_Mt = ghg_pred_Mt * Math.pow(1 + hothouseG, yearsCompounded);
  const delta_pct = hothouse_Mt > 0 ? (target_Mt - hothouse_Mt) / hothouse_Mt : 0;

  // Stage 5 — loss-ratio mapping.
  const elasticity = req.elasticity ?? meta.constants.elasticity;
  const gwp = req.gwp_usdm ?? meta.constants.gwp_usdm;
  const baseLr = req.base_lr ?? meta.constants.base_lr;
  const lr = baseLr * (1 + elasticity * delta_pct);
  const loss_USDm = gwp * lr;
  const hothouseLr = baseLr; // delta=0 by definition
  const hothouseLoss = gwp * hothouseLr;
  const loss_swing_vs_hothouse_USDm = loss_USDm - hothouseLoss;

  return {
    stage_1_inputs: {
      country, year: targetYear, mode: req.mode,
      raw_features: raw, applied_overrides: overrides,
    },
    stage_2_features: {
      feature_order: meta.m3a_features,
      X,
      log_transformed_keys: meta.m3a_features.filter((f) => f.startsWith('log_')),
    },
    stage_3_xgb: {
      log_ghg_pred, ghg_pred_Mt,
      actual_Mt, err_pct,
      inference_ms: null,
      model: 'M3a',
    },
    stage_4_scenario: {
      scenario,
      growth_rate_pa: g,
      years_compounded: yearsCompounded,
      hothouse_Mt, target_Mt, delta_pct,
    },
    stage_5_loss: {
      lr,
      lr_pp_vs_base: (lr - baseLr) * 100,
      loss_USDm,
      loss_swing_vs_hothouse_USDm,
    },
    trace_meta: {
      pipeline_version: meta.pipeline_version,
      seed: meta.random_state,
      total_latency_ms: null,
      served_by: 'cached',
      served_at: new Date().toISOString(),
    },
  };
}

export const HAS_API = !!API;
