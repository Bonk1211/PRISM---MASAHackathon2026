// Phase 3 — Indicator mapping. Interactive chip picker over the WDI panel.
// User toggles which indicators feed the model; coloured by risk axis.
// Selection persists to localStorage. No correlation tables — those live
// in the notebook and report §3.2.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow, Hairline } from '../components/Card';
import { PHASE_3_INDICATOR_MAP, type RiskAxis } from '../data/keyNumbers';

type IndicatorRow = {
  code: string;
  label: string;
  axis: RiskAxis;
  rationale: string;
};

const AXIS_LABEL: Record<RiskAxis, string> = {
  transition: 'Transition',
  physical_vulnerability: 'Physical · Vulnerability',
  adaptive_capacity: 'Adaptive capacity',
  exposure_base: 'Exposure base',
};

const AXIS_TONE: Record<RiskAxis, string> = {
  transition: 'border-amber bg-amber/10 text-amber',
  physical_vulnerability: 'border-rust bg-rust/10 text-rust',
  adaptive_capacity: 'border-sage bg-sage/10 text-sage',
  exposure_base: 'border-sea bg-sea/10 text-sea',
};

const STORAGE_KEY = 'prism.indicators.v1';

function loadSelected(allCodes: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set(allCodes);
}

function saveSelected(codes: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...codes]));
  } catch {
    /* ignore */
  }
}

export function Phase3IndicatorMapping() {
  const nav = useNavigate();

  const rows: IndicatorRow[] = useMemo(
    () =>
      Object.entries(PHASE_3_INDICATOR_MAP).map(([code, entry]) => ({
        code,
        label: entry.label,
        axis: entry.risk_axis,
        rationale: entry.rationale,
      })),
    [],
  );

  const allCodes = useMemo(() => rows.map((r) => r.code), [rows]);
  const [selected, setSelected] = useState<Set<string>>(() => loadSelected(allCodes));
  const [filter, setFilter] = useState<RiskAxis | 'all'>('all');

  useEffect(() => {
    saveSelected(selected);
  }, [selected]);

  function toggle(code: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }
  function selectAll() {
    setSelected(new Set(allCodes));
  }
  function clearAll() {
    setSelected(new Set());
  }

  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.axis === filter)),
    [filter, rows],
  );

  const axisCounts = useMemo(() => {
    const c: Record<RiskAxis, number> = {
      transition: 0,
      physical_vulnerability: 0,
      adaptive_capacity: 0,
      exposure_base: 0,
    };
    rows.forEach((r) => {
      if (selected.has(r.code)) c[r.axis] += 1;
    });
    return c;
  }, [rows, selected]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-1">
      <header className="flex items-baseline justify-between">
        <div>
          <Eyebrow>Phase 3 · Indicator mapping</Eyebrow>
          <h1 className="display mt-1 text-[28px] leading-[1.05] text-ink lg:text-[36px]">
            Pick the proxies.
          </h1>
        </div>
        <span className="font-mono text-[10px] tab-num text-muted">
          {selected.size}/{rows.length} active
        </span>
      </header>
      <Hairline />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={[
            'border px-3 py-1 text-[11px] uppercase tracking-eyebrow transition',
            filter === 'all'
              ? 'border-ink bg-ink text-paper'
              : 'border-rule bg-paper text-ink hover:border-ink',
          ].join(' ')}
        >
          All · {selected.size}
        </button>
        {(Object.keys(AXIS_LABEL) as RiskAxis[]).map((a) => {
          const sel = filter === a;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setFilter(a)}
              className={[
                'border px-3 py-1 text-[11px] uppercase tracking-eyebrow transition',
                sel ? AXIS_TONE[a] : 'border-rule bg-paper text-muted hover:border-ink hover:text-ink',
              ].join(' ')}
            >
              {AXIS_LABEL[a]} · {axisCounts[a]}
            </button>
          );
        })}
        <span className="flex-1" />
        <button
          type="button"
          onClick={selectAll}
          className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-ink"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-rust"
        >
          Clear
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {visible.map((r) => {
          const sel = selected.has(r.code);
          return (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => toggle(r.code)}
                aria-pressed={sel}
                className={[
                  'flex w-full flex-col items-start gap-1 border bg-paper px-3 py-2.5 text-left transition',
                  sel
                    ? 'border-ink'
                    : 'border-rule opacity-60 hover:border-ink hover:opacity-100',
                ].join(' ')}
              >
                <div className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">{r.label}</span>
                  <span
                    className={[
                      'shrink-0 border px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-eyebrow',
                      AXIS_TONE[r.axis],
                    ].join(' ')}
                  >
                    {AXIS_LABEL[r.axis]}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted">{r.code}</span>
                <span className="text-[11px] leading-snug text-ink/70">{r.rationale}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => nav('/phase4')}
          className="border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
        >
          Continue to Phase 4 →
        </button>
      </div>
    </div>
  );
}
