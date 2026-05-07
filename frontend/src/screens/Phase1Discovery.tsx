// Phase 1 · Discovery (consolidated, in-chat). The single screen that replaces
// the former Scoping + Taxonomy + Indicators tabs. ILMU walks the user through
// three steps inside one chat feed:
//   1. Scope    — multi-turn interview, five axes pin via the Gemini agent.
//   2. Taxonomy — assistant proposes 4 risk buckets (auto-derived from scope).
//   3. Indicators — assistant proposes the WDI proxy panel (auto-derived from
//                   bucket coverage).
// Each step renders as an interactive assistant bubble *inside* the chat
// transcript, so the user never leaves the conversation. Persistence keys are
// unchanged (prism.taxonomy.v1, prism.indicators.v1) — Phases 4–6 read them.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatThread } from '../components/ChatThread';
import { Hairline } from '../components/Card';
import {
  PHASE_3_INDICATOR_MAP,
  type RiskAxis,
} from '../data/keyNumbers';
import {
  getScopingSnapshot,
  PROFILE_KEY,
  pinnedAxes,
  SCOPING_AXES,
  type ScopingProfile,
} from '../lib/scoping';

// === Taxonomy ============================================================

type BucketKey = 'physical_acute' | 'physical_chronic' | 'transition' | 'liability';
type Severity = 'L' | 'M' | 'H';

type Bucket = {
  key: BucketKey;
  title: string;
  blurb: string;
};

const BUCKETS: Bucket[] = [
  { key: 'physical_acute',   title: 'Physical · Acute',   blurb: 'Cyclones, floods, wildfires.' },
  { key: 'physical_chronic', title: 'Physical · Chronic', blurb: 'Sea-level rise, precipitation shift.' },
  { key: 'transition',       title: 'Transition',         blurb: 'Carbon pricing, stranded assets.' },
  { key: 'liability',        title: 'Liability',          blurb: 'Climate D&O litigation.' },
];

const SEVERITY_TONE: Record<Severity, string> = {
  L: 'border-sage/40 bg-sage/10 text-sage',
  M: 'border-amber/40 bg-amber/10 text-amber',
  H: 'border-rust/40 bg-rust/10 text-rust',
};

type TaxonomyState = Record<BucketKey, { covered: boolean; severity: Severity }>;

const TAXONOMY_KEY = 'prism.taxonomy.v1';

function deriveTaxonomy(profile: ScopingProfile): TaxonomyState {
  const lob = profile.line_of_business ?? {};
  const propPct = lob.property_cat ?? 0;
  const agriPct = lob.agriculture ?? 0;
  const lifePct = lob.life ?? 0;
  const casPct = lob.casualty ?? 0;
  const specPct = lob.specialty ?? 0;
  const fw = profile.frameworks ?? [];
  const hasTcfd = fw.some((f) => /TCFD|ISSB/i.test(f));
  const hasOrsa = fw.some((f) => /ORSA|Solvency/i.test(f));

  const acuteCovered = propPct + specPct > 0;
  const acuteSev: Severity =
    propPct + specPct >= 60 ? 'H' : propPct + specPct >= 30 ? 'M' : 'L';

  const chronicCovered = agriPct + lifePct > 0 || (profile.geography?.length ?? 0) > 0;
  const chronicSev: Severity =
    agriPct >= 25 || (profile.geography?.length ?? 0) >= 2 ? 'H' : chronicCovered ? 'M' : 'L';

  const transitionCovered = hasTcfd || hasOrsa || propPct + agriPct >= 50;
  const transitionSev: Severity = hasTcfd && hasOrsa ? 'H' : transitionCovered ? 'M' : 'L';

  const liabilityCovered = casPct + lifePct >= 15;
  const liabilitySev: Severity = casPct + lifePct >= 35 ? 'M' : 'L';

  return {
    physical_acute:   { covered: acuteCovered,      severity: acuteSev },
    physical_chronic: { covered: chronicCovered,    severity: chronicSev },
    transition:       { covered: transitionCovered, severity: transitionSev },
    liability:        { covered: liabilityCovered,  severity: liabilitySev },
  };
}

// === Indicators ==========================================================

const AXIS_LABEL: Record<RiskAxis, string> = {
  transition: 'Transition',
  physical_vulnerability: 'Physical',
  adaptive_capacity: 'Adaptive',
  exposure_base: 'Exposure',
};

const AXIS_TONE: Record<RiskAxis, string> = {
  transition: 'border-amber bg-amber/10 text-amber',
  physical_vulnerability: 'border-rust bg-rust/10 text-rust',
  adaptive_capacity: 'border-sage bg-sage/10 text-sage',
  exposure_base: 'border-sea bg-sea/10 text-sea',
};

const INDICATORS_KEY = 'prism.indicators.v1';

function deriveIndicators(taxonomy: TaxonomyState, allCodes: string[]): Set<string> {
  const axisOn: Record<RiskAxis, boolean> = {
    transition: taxonomy.transition.covered,
    physical_vulnerability: taxonomy.physical_acute.covered || taxonomy.physical_chronic.covered,
    adaptive_capacity: taxonomy.physical_chronic.covered || taxonomy.liability.covered,
    exposure_base: true,
  };
  const out = new Set<string>();
  for (const code of allCodes) {
    const axis = PHASE_3_INDICATOR_MAP[code]?.risk_axis;
    if (axis && axisOn[axis]) out.add(code);
  }
  if (out.size < 4) return new Set(allCodes);
  return out;
}

// === Step kind ===========================================================

type Step = 'scoping' | 'taxonomy' | 'indicators' | 'done';

// === Component ===========================================================

export function Phase1Discovery() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<ScopingProfile>(() => getScopingSnapshot());

  useEffect(() => {
    const tick = () => setProfile(getScopingSnapshot());
    const id = window.setInterval(tick, 800);
    function onStorage(e: StorageEvent) {
      if (e.key === PROFILE_KEY) tick();
    }
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const allIndicatorCodes = useMemo(() => Object.keys(PHASE_3_INDICATOR_MAP), []);
  const indicatorRows = useMemo(
    () =>
      Object.entries(PHASE_3_INDICATOR_MAP).map(([code, entry]) => ({
        code,
        label: entry.label,
        axis: entry.risk_axis,
      })),
    [],
  );

  const [step, setStep] = useState<Step>('scoping');
  const [taxonomy, setTaxonomy] = useState<TaxonomyState>(() => deriveTaxonomy(profile));
  const [indicators, setIndicators] = useState<Set<string>>(
    () => deriveIndicators(deriveTaxonomy(profile), allIndicatorCodes),
  );

  const pinned = pinnedAxes(profile);
  const scopingComplete = pinned.length === SCOPING_AXES.length;

  // Auto-advance from scoping → taxonomy when the agent reports complete.
  // Re-derive both from the just-pinned profile so first impression matches.
  useEffect(() => {
    if (step === 'scoping' && scopingComplete) {
      const t = deriveTaxonomy(profile);
      setTaxonomy(t);
      setIndicators(deriveIndicators(t, allIndicatorCodes));
      setStep('taxonomy');
    }
  }, [step, scopingComplete, profile, allIndicatorCodes]);

  // Persist to the keys Phases 4–6 read.
  useEffect(() => {
    try {
      localStorage.setItem(TAXONOMY_KEY, JSON.stringify(taxonomy));
    } catch {
      /* ignore */
    }
  }, [taxonomy]);

  useEffect(() => {
    try {
      localStorage.setItem(INDICATORS_KEY, JSON.stringify([...indicators]));
    } catch {
      /* ignore */
    }
  }, [indicators]);

  const inScopeCount = BUCKETS.filter((b) => taxonomy[b.key].covered).length;

  function toggleBucket(k: BucketKey) {
    setTaxonomy((s) => ({ ...s, [k]: { ...s[k], covered: !s[k].covered } }));
  }
  function setSeverity(k: BucketKey, sev: Severity) {
    setTaxonomy((s) => ({ ...s, [k]: { ...s[k], severity: sev } }));
  }
  function toggleIndicator(code: string) {
    setIndicators((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  // Approve flows
  const approveTaxonomy = () => {
    // Re-derive indicators from the (possibly edited) taxonomy as the new default
    // — but only on first entry. If user already touched indicators, preserve.
    setIndicators((prev) => (prev.size === 0 ? deriveIndicators(taxonomy, allIndicatorCodes) : prev));
    setStep('indicators');
  };
  const approveIndicators = () => setStep('done');
  const editTaxonomy = () => setStep('taxonomy');

  // === In-chat wizard bubbles ============================================

  const wizardBubbles = (
    <>
      {/* Scoping nudge — only while user is still in the interview */}
      {step === 'scoping' && !scopingComplete && (
        <Bubble role="hint">
          <p className="text-[12px] leading-snug text-muted">
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-sea">Step 1 of 3 · </span>
            Pin all five axes (LOB · Geo · Horizon · Frameworks · Disclosures) and I'll
            propose the risk taxonomy here in chat.
          </p>
          <Hairline className="my-2" />
          <ProgressDots done={pinned.length} total={SCOPING_AXES.length} />
        </Bubble>
      )}

      {/* Taxonomy — assistant proposes; user toggles inline */}
      {(step === 'taxonomy' || step === 'indicators' || step === 'done') && (
        <Bubble role="assistant" pinned={step !== 'taxonomy'}>
          <Header
            stepNo={2}
            total={3}
            title="Risk taxonomy proposal"
            badge={`${inScopeCount}/4 buckets`}
          />
          {step === 'taxonomy' ? (
            <>
              <p className="text-[12px] leading-snug text-muted">
                Based on your scope I've turned on the buckets I think apply. Toggle off anything
                you don't want stressed; pick a severity for each.
              </p>
              <ul className="mt-3 space-y-2">
                {BUCKETS.map((b) => {
                  const s = taxonomy[b.key];
                  return (
                    <li
                      key={b.key}
                      className={[
                        'border bg-paper px-3 py-2 transition',
                        s.covered ? 'border-ink' : 'border-rule opacity-60',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={s.covered}
                          onClick={() => toggleBucket(b.key)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={[
                              'relative h-4 w-7 shrink-0 border transition',
                              s.covered ? 'border-ink bg-ink' : 'border-rule bg-paper',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'absolute top-[1px] h-[11px] w-[11px] transition',
                                s.covered ? 'left-[15px] bg-paper' : 'left-[1px] bg-ink',
                              ].join(' ')}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-ink">{b.title}</span>
                            <span className="block text-[11px] leading-snug text-muted">{b.blurb}</span>
                          </span>
                        </button>
                        <div
                          className={[
                            'shrink-0',
                            s.covered ? '' : 'pointer-events-none opacity-40',
                          ].join(' ')}
                        >
                          <div className="flex gap-1">
                            {(['L', 'M', 'H'] as Severity[]).map((sev) => {
                              const sel = s.severity === sev;
                              return (
                                <button
                                  key={sev}
                                  type="button"
                                  onClick={() => setSeverity(b.key, sev)}
                                  className={[
                                    'border px-1.5 py-0.5 font-mono text-[9px] uppercase transition',
                                    sel
                                      ? SEVERITY_TONE[sev]
                                      : 'border-rule bg-paper text-muted hover:border-ink hover:text-ink',
                                  ].join(' ')}
                                >
                                  {sev}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const t = deriveTaxonomy(profile);
                    setTaxonomy(t);
                  }}
                  className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-ink"
                >
                  Reset to LLM defaults
                </button>
                <button
                  type="button"
                  onClick={approveTaxonomy}
                  className="border border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
                >
                  Approve · next ↓
                </button>
              </div>
            </>
          ) : (
            <CompactSummary
              items={BUCKETS.filter((b) => taxonomy[b.key].covered).map((b) => ({
                label: b.title,
                tone: SEVERITY_TONE[taxonomy[b.key].severity],
                badge: taxonomy[b.key].severity,
              }))}
              empty="No buckets selected."
              actionLabel="Edit"
              onAction={editTaxonomy}
            />
          )}
        </Bubble>
      )}

      {/* Indicators — only after taxonomy is approved */}
      {(step === 'indicators' || step === 'done') && (
        <Bubble role="assistant" pinned={step !== 'indicators'}>
          <Header
            stepNo={3}
            total={3}
            title="Indicator panel proposal"
            badge={`${indicators.size}/${allIndicatorCodes.length} active`}
          />
          {step === 'indicators' ? (
            <>
              <p className="text-[12px] leading-snug text-muted">
                These WDI proxies feed the model. I've activated the ones aligned to your
                covered buckets — toggle any chip to override.
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {indicatorRows.map((r) => {
                  const on = indicators.has(r.code);
                  return (
                    <li key={r.code}>
                      <button
                        type="button"
                        onClick={() => toggleIndicator(r.code)}
                        aria-pressed={on}
                        title={r.code}
                        className={[
                          'border px-2 py-1 text-[11px] transition',
                          on ? AXIS_TONE[r.axis] : 'border-rule bg-paper text-muted opacity-70 hover:border-ink hover:opacity-100',
                        ].join(' ')}
                      >
                        <span className="font-mono text-[9px] uppercase tracking-eyebrow opacity-70 mr-1.5">
                          {AXIS_LABEL[r.axis]}
                        </span>
                        {r.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIndicators(deriveIndicators(taxonomy, allIndicatorCodes))}
                  className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-ink"
                >
                  Reset to LLM defaults
                </button>
                <button
                  type="button"
                  onClick={() => setStep('taxonomy')}
                  className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-ink"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={approveIndicators}
                  className="border border-ink bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
                >
                  Approve · finish ↓
                </button>
              </div>
            </>
          ) : (
            <CompactSummary
              items={[{ label: `${indicators.size} indicators across 4 risk axes`, tone: 'border-sea/40 bg-sea/10 text-sea', badge: '✓' }]}
              empty="No indicators selected."
              actionLabel="Edit"
              onAction={() => setStep('indicators')}
            />
          )}
        </Bubble>
      )}

      {/* Final handoff */}
      {step === 'done' && (
        <Bubble role="assistant">
          <Header stepNo={3} total={3} title="Discovery complete" badge="Ready" />
          <p className="text-[12px] leading-snug text-muted">
            Scope locked. Taxonomy and indicators committed to the pipeline contract. Hit
            continue to run the model on your selection.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => nav('/phase4')}
              className="border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
            >
              Continue to Pipeline →
            </button>
          </div>
        </Bubble>
      )}
    </>
  );

  // Composer hint shifts based on step so the user knows where to act next.
  const composerHint =
    step === 'scoping'
      ? null
      : step === 'taxonomy'
      ? 'Step 2 · approve the risk taxonomy above ↑'
      : step === 'indicators'
      ? 'Step 3 · approve the indicator panel above ↑'
      : 'All set — continue to Pipeline above ↑';

  return (
    <ChatThread
      continueTo={null}
      showContinue={false}
      extraBubbles={wizardBubbles}
      composerHint={composerHint}
    />
  );
}

// === Bubble primitives ===================================================

function Bubble({
  role,
  pinned = false,
  children,
}: {
  role: 'assistant' | 'hint';
  pinned?: boolean;
  children: React.ReactNode;
}) {
  if (role === 'hint') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] border border-dashed border-rule bg-paper/60 px-3 py-2">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={[
          'w-full max-w-[88%] rounded-2xl rounded-bl-sm border bg-paper px-4 py-3',
          pinned ? 'border-rule/70 opacity-80' : 'border-ink',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

function Header({
  stepNo,
  total,
  title,
  badge,
}: {
  stepNo: number;
  total: number;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule/60 pb-2">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-sea">
          Step {stepNo}/{total}
        </span>
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      </div>
      {badge && (
        <span className="font-mono text-[10px] tab-num text-muted">{badge}</span>
      )}
    </div>
  );
}

function CompactSummary({
  items,
  empty,
  actionLabel,
  onAction,
}: {
  items: { label: string; tone: string; badge?: string }[];
  empty: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-[11px] text-muted">{empty}</span>
        ) : (
          items.map((it) => (
            <span
              key={it.label}
              className={['inline-flex items-center gap-1 border px-2 py-0.5 text-[11px]', it.tone].join(' ')}
            >
              {it.badge && (
                <span className="font-mono text-[9px] uppercase tracking-eyebrow">{it.badge}</span>
              )}
              {it.label}
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:text-ink"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ProgressDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            'h-1.5 w-6 transition',
            i < done ? 'bg-sea' : 'bg-rule',
          ].join(' ')}
        />
      ))}
      <span className="ml-2 font-mono text-[9px] tab-num text-muted">
        {done}/{total}
      </span>
    </div>
  );
}
