// Phase 2 — Risk Taxonomy. Interactive bucket toggle. User decides which
// risk surfaces are in scope; selection persists to localStorage and is read
// downstream by Phase 3-6 to filter content. No analytical explanation —
// that lives in the notebook and report.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow, Hairline } from '../components/Card';

type BucketKey = 'physical_acute' | 'physical_chronic' | 'transition' | 'liability';
type Severity = 'L' | 'M' | 'H';

type Bucket = {
  key: BucketKey;
  title: string;
  blurb: string;
  examples: string[];
  defaultCovered: boolean;
  defaultSeverity: Severity;
};

const BUCKETS: Bucket[] = [
  {
    key: 'physical_acute',
    title: 'Physical · Acute',
    blurb: 'Tropical cyclones, floods, wildfires — single-event tail risk.',
    examples: ['Tropical cyclone', 'Flood', 'Heatwave', 'Wildfire'],
    defaultCovered: true,
    defaultSeverity: 'H',
  },
  {
    key: 'physical_chronic',
    title: 'Physical · Chronic',
    blurb: 'Sea-level rise, precipitation shift, slow-onset trends.',
    examples: ['Sea-level rise', 'Precipitation shift', 'Temperature trend'],
    defaultCovered: true,
    defaultSeverity: 'M',
  },
  {
    key: 'transition',
    title: 'Transition',
    blurb: 'Carbon pricing, stranded assets, technology substitution.',
    examples: ['Carbon pricing', 'Stranded assets', 'Tech substitution'],
    defaultCovered: true,
    defaultSeverity: 'M',
  },
  {
    key: 'liability',
    title: 'Liability',
    blurb: 'Climate-related litigation against directors and officers.',
    examples: ['D&O litigation'],
    defaultCovered: false,
    defaultSeverity: 'L',
  },
];

const SEVERITY_LABEL: Record<Severity, string> = { L: 'Low', M: 'Moderate', H: 'High' };
const SEVERITY_TONE: Record<Severity, string> = {
  L: 'border-sage/40 bg-sage/10 text-sage',
  M: 'border-amber/40 bg-amber/10 text-amber',
  H: 'border-rust/40 bg-rust/10 text-rust',
};

type State = Record<BucketKey, { covered: boolean; severity: Severity }>;

const STORAGE_KEY = 'prism.taxonomy.v1';

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  return Object.fromEntries(
    BUCKETS.map((b) => [b.key, { covered: b.defaultCovered, severity: b.defaultSeverity }]),
  ) as State;
}

function saveState(s: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function Phase2RiskTaxonomy() {
  const nav = useNavigate();
  const [state, setState] = useState<State>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const inScope = useMemo(
    () => BUCKETS.filter((b) => state[b.key]?.covered).length,
    [state],
  );

  function toggle(key: BucketKey) {
    setState((s) => ({ ...s, [key]: { ...s[key], covered: !s[key].covered } }));
  }
  function setSeverity(key: BucketKey, severity: Severity) {
    setState((s) => ({ ...s, [key]: { ...s[key], severity } }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1">
      <header className="flex items-baseline justify-between">
        <div>
          <Eyebrow>Phase 2 · Risk taxonomy</Eyebrow>
          <h1 className="display mt-1 text-[28px] leading-[1.05] text-ink lg:text-[36px]">
            Pick what's in scope.
          </h1>
        </div>
        <span className="font-mono text-[10px] tab-num text-muted">
          {inScope}/{BUCKETS.length} covered
        </span>
      </header>
      <Hairline />

      <ul className="space-y-2">
        {BUCKETS.map((b) => {
          const s = state[b.key];
          return (
            <li
              key={b.key}
              className={[
                'border bg-paper px-4 py-3 transition',
                s.covered ? 'border-ink' : 'border-rule opacity-60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.covered}
                      onClick={() => toggle(b.key)}
                      className={[
                        'relative h-5 w-9 shrink-0 border transition',
                        s.covered ? 'border-ink bg-ink' : 'border-rule bg-paper',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute top-[1px] h-[15px] w-[15px] transition',
                          s.covered ? 'left-[19px] bg-paper' : 'left-[1px] bg-ink',
                        ].join(' ')}
                      />
                    </button>
                    <h2 className="text-[15px] font-semibold text-ink">{b.title}</h2>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-muted">{b.blurb}</p>
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {b.examples.map((e) => (
                      <li
                        key={e}
                        className="border border-rule bg-paper/60 px-2 py-0.5 text-[10px] text-ink"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={['shrink-0', s.covered ? '' : 'pointer-events-none opacity-40'].join(
                    ' ',
                  )}
                >
                  <Eyebrow>Severity</Eyebrow>
                  <div className="mt-1 flex gap-1">
                    {(['L', 'M', 'H'] as Severity[]).map((sev) => {
                      const sel = s.severity === sev;
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSeverity(b.key, sev)}
                          className={[
                            'border px-2 py-1 font-mono text-[10px] uppercase transition',
                            sel
                              ? SEVERITY_TONE[sev]
                              : 'border-rule bg-paper text-muted hover:border-ink hover:text-ink',
                          ].join(' ')}
                        >
                          {SEVERITY_LABEL[sev]}
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => nav('/phase3')}
          className="border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
        >
          Continue to Phase 3 →
        </button>
      </div>
    </div>
  );
}
