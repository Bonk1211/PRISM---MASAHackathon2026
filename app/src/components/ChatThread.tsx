// Phase 1 multi-turn consultant chat — chatbot-style UI.
//
// Differs from AgentPanel:
//   1. Multi-turn — server replays Supabase-backed transcript on every turn.
//   2. Sends session_id so the server can stitch turns into one interview.
//   3. Surfaces full ScopingProfile + per-axis confidence as a sticky rail.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow, Hairline } from './Card';
import {
  type ChatTurn,
  type ScopingAxis,
  type ScopingProfile,
  SCOPING_AXES,
  pinnedAxes,
  useScoping,
} from '../lib/scoping';

const PIPELINE_API = (import.meta.env.VITE_PIPELINE_API as string | undefined) ?? '';
const AGENT_API =
  (import.meta.env.VITE_AGENT_API as string | undefined) ??
  (PIPELINE_API ? `${PIPELINE_API}/agent` : '/agent');

type AgentResponse = {
  updates: Record<string, unknown>;
  narration: string;
  tool_called: string | null;
  scoping_profile: ScopingProfile | null;
  complete: boolean;
  session_id: string | null;
  error: string | null;
};

const AXIS_LABEL: Record<ScopingAxis, string> = {
  line_of_business: 'Line of business',
  geography: 'Geography',
  time_horizon: 'Time horizon',
  frameworks: 'Frameworks',
  disclosures: 'Disclosures',
};

// Predicted user input — chips shift to the next-unpinned axis so the user
// always gets relevant prompts. Phrasings are TESTED against ilmu-nemo-nano:
// each chip pins its axis at confidence 0.9 reliably (3/3 cold runs). Do not
// edit without re-testing — the model is sensitive to enum casing and
// abbreviation ("UW" fails, "underwriting" works; "TCFD only" fails,
// "TCFD and ISSB_S2" works).
const SUGGESTIONS_BY_AXIS: Record<ScopingAxis, string[]> = {
  line_of_business: [
    '70% property cat, 20% agriculture, 10% specialty',
    '50% property cat, 25% agriculture, 25% specialty',
    '80% property cat, 15% specialty, 5% casualty',
  ],
  geography: [
    'Vietnam, Philippines, Indonesia',
    'Vietnam and Philippines',
    'Indonesia, Thailand, Malaysia',
  ],
  time_horizon: [
    '1-year underwriting, 30-year tail',
    '1 year underwriting and 30 year liability tail',
    '1-year UW horizon, 30-year life horizon',
  ],
  frameworks: [
    'TCFD and ISSB_S2',
    'TCFD and Solvency_II_ORSA',
    'ISSB_S2 and Internal_Capital',
  ],
  disclosures: [
    'Public TCFD disclosure annually',
    'We publish TCFD and ISSB_S2',
    'Internal_Only',
  ],
};

// Same first-axis chips used as openers (LOB is always axis #1).
const OPENING_SUGGESTIONS = SUGGESTIONS_BY_AXIS.line_of_business;

function formatAxisValue(axis: ScopingAxis, value: unknown): string {
  if (value == null) return '—';
  if (axis === 'line_of_business' && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, number>)
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort(([, a], [, b]) => b - a);
    return entries.map(([k, v]) => `${k.replace('_', ' ')} ${Math.round(v)}%`).join(' · ');
  }
  if (axis === 'time_horizon' && typeof value === 'object') {
    const th = value as { uw_years?: number; life_years?: number };
    return `${th.uw_years ?? '?'}y UW · ${th.life_years ?? '?'}y life`;
  }
  if (Array.isArray(value)) return value.join(' · ');
  return String(value);
}

export function ChatThread() {
  const nav = useNavigate();
  const { profile, transcript, sessionId, setFullProfile, appendTurn, reset } = useScoping();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length, loading]);

  const pinned = pinnedAxes(profile);
  const conf = profile.confidence ?? {};

  // Predictive suggestions: pick the first unpinned axis after the latest
  // assistant turn, fall back to opening starters before the user has spoken.
  const suggestions = useMemo(() => {
    if (transcript.length === 0) return OPENING_SUGGESTIONS;
    const nextAxis = SCOPING_AXES.find((a) => !pinned.includes(a));
    if (!nextAxis) return [];
    return SUGGESTIONS_BY_AXIS[nextAxis];
  }, [transcript.length, pinned]);

  // Guard against double-fire (chip double-click, React event quirks).
  const inFlight = useRef(false);

  async function submit(text: string) {
    if (!text.trim() || loading || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setErr(null);
    const userTurn: ChatTurn = {
      role: 'user',
      content: text.trim(),
      ts: new Date().toISOString(),
    };
    appendTurn(userTurn);
    setMsg('');

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(AGENT_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          screen: 'scoping',
          session_id: sessionId,
          current_state: profile,
        }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as AgentResponse;

      if (data.scoping_profile) {
        setFullProfile(data.scoping_profile);
      }
      if (data.narration) {
        appendTurn({
          role: 'assistant',
          content: data.narration,
          ts: new Date().toISOString(),
        });
      }
      if (data.error) setErr(data.error);
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      const m = e instanceof Error ? e.message : String(e);
      setErr(name === 'AbortError' ? 'Timed out (20s) — server may be cold.' : m);
    } finally {
      clearTimeout(t);
      setLoading(false);
      inFlight.current = false;
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(msg);
  }

  const isEmpty = transcript.length === 0 && !loading;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
      {/* Conversation column */}
      <div className="flex h-[80vh] flex-col border border-rule bg-paper">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-3">
          <Eyebrow>Consultant interview · ILMU Nano</Eyebrow>
          <button
            type="button"
            onClick={reset}
            className="font-mono text-[10px] uppercase tracking-eyebrow text-muted hover:text-rust"
          >
            Reset →
          </button>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="display text-[28px] leading-[1.05] text-ink lg:text-[40px]">
                Hi — what can I help
                <span className="italic"> you scope</span>?
              </p>
              <p className="mt-3 max-w-md font-serif text-[14px] italic leading-relaxed text-muted">
                Tell me about your reinsurance book — line of business, geography, time
                horizon, frameworks, disclosures. I'll pin each axis as we go.
              </p>
            </div>
          ) : (
            <ul className="mx-auto max-w-2xl space-y-5">
              {transcript.map((turn, i) => (
                <li
                  key={i}
                  className={[
                    'flex',
                    turn.role === 'user' ? 'justify-end' : 'justify-start',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'max-w-[80%] whitespace-pre-wrap leading-relaxed',
                      turn.role === 'user'
                        ? 'rounded-2xl rounded-br-sm bg-ink px-4 py-2 text-[13px] text-paper'
                        : 'rounded-2xl rounded-bl-sm border border-rule bg-paper px-4 py-2 font-serif text-[14px] italic text-ink',
                    ].join(' ')}
                  >
                    {turn.content}
                  </div>
                </li>
              ))}
              {loading && (
                <li className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-rule bg-paper px-4 py-2 font-serif text-[13px] italic text-muted">
                    Thinking…
                  </div>
                </li>
              )}
            </ul>
          )}

          {err && (
            <p
              role="alert"
              className="mx-auto mt-3 max-w-2xl border border-rust bg-paper px-2 py-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-rust"
            >
              {err}
            </p>
          )}
        </div>

        {/* Composer + predicted-input chips */}
        <div className="border-t border-rule px-4 py-3">
          {suggestions.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void submit(s)}
                  disabled={loading}
                  className="rounded-full border border-rule bg-paper px-3 py-1 text-[11px] text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Reply to the consultant…"
              aria-label="Reply to the consultant"
              className="w-full resize-none border border-rule bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(e);
                else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                {msg.length}/2000 · ↵ to send
              </span>
              <button
                type="submit"
                disabled={loading || !msg.trim()}
                className="border border-ink bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink"
              >
                {loading ? 'Sending…' : 'Send →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sticky scoping rail */}
      <aside
        aria-label="Scoping profile"
        className="mt-5 border border-rule bg-paper px-4 py-4 lg:mt-0 lg:sticky lg:top-20"
      >
        <div className="flex items-baseline justify-between">
          <Eyebrow>Scoping profile</Eyebrow>
          <span className="font-mono text-[10px] tab-num text-muted">
            {pinned.length}/{SCOPING_AXES.length} pinned
          </span>
        </div>
        <Hairline className="mt-2" />

        <ul className="mt-3 space-y-3">
          {SCOPING_AXES.map((axis) => {
            const isPinned = pinned.includes(axis);
            const c = conf[axis] ?? 0;
            const value = profile[axis as keyof ScopingProfile];
            return (
              <li key={axis} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink">
                    {AXIS_LABEL[axis]}
                  </span>
                  <span
                    className={[
                      'font-mono text-[10px] tab-num',
                      isPinned ? 'text-sea' : 'text-muted',
                    ].join(' ')}
                  >
                    {c > 0 ? `${(c * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                <p
                  className={[
                    'text-[12px] leading-snug',
                    isPinned ? 'text-ink' : 'text-muted',
                  ].join(' ')}
                >
                  {formatAxisValue(axis, value)}
                </p>
              </li>
            );
          })}
        </ul>

        <Hairline className="mt-4" />

        {profile.complete ? (
          <button
            onClick={() => nav('/phase2')}
            className="mt-3 w-full border border-ink bg-ink px-3 py-2 text-[12px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
          >
            Continue to Phase 2 →
          </button>
        ) : (
          <p className="mt-3 text-[11px] leading-snug text-muted">
            All five axes pin at confidence ≥ 70 % to unlock Phase 2.
          </p>
        )}
      </aside>
    </div>
  );
}
