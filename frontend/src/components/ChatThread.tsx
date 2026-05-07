// Phase 1 multi-turn consultant chat — chatbot-style UI.
//
// Differs from AgentPanel:
//   1. Multi-turn — server replays Supabase-backed transcript on every turn.
//   2. Sends session_id so the server can stitch turns into one interview.
//   3. Surfaces full ScopingProfile + per-axis confidence as a sticky rail.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow, Hairline } from './Card';
import {
  type ChatTurn,
  type ScopingAxis,
  type ScopingProfile,
  type SessionSummary,
  SCOPING_AXES,
  deleteSession,
  listSessions,
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
// always gets relevant prompts. Phrasings were originally hardened against
// the smallest ILMU tier; the default model is now `nemo-super`, but the
// same wording stays on the safe side (exact enum casing, no abbreviations
// like "UW"). Re-test if ILMU_MODEL on the backend is downgraded.
//
// Three-chip set per axis: the canonical SEA-typhoon demo persona first, a
// diversified middle option, then a contrasting profile for variety.
const SUGGESTIONS_BY_AXIS: Record<ScopingAxis, string[]> = {
  line_of_business: [
    'Mostly property cat — 70% property cat, 20% agriculture, 10% specialty',
    'Diversified — 50% property cat, 25% agriculture, 25% specialty',
    'Cat-heavy with casualty tail — 80% property cat, 15% specialty, 5% casualty',
  ],
  geography: [
    'SEA core — Vietnam, Philippines, Indonesia',
    'Mekong only — Vietnam and Philippines',
    'Asean-5 — Indonesia, Thailand, Malaysia',
  ],
  time_horizon: [
    '1-year underwriting horizon, 30-year liability tail',
    '3-year underwriting horizon, 20-year liability tail',
    '1-year underwriting horizon, 50-year liability tail',
  ],
  frameworks: [
    'TCFD and ISSB_S2',
    'TCFD and Solvency_II_ORSA',
    'ISSB_S2 and Internal_Capital',
  ],
  disclosures: [
    'Public TCFD and ISSB_S2 annual disclosure',
    'Regulatory_Stress_Test only — confidential',
    'Internal_Only',
  ],
};

// Opener chips on a fresh chat. First option = the canonical demo persona so
// judges can hit one button and watch ILMU pin LOB instantly; the other two
// give variety. Same phrasings reuse the LOB axis chip set.
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

const HISTORY_OPEN_KEY = 'prism.scoping.history_open.v1';

function getInitialHistoryOpen(): boolean {
  try {
    const v = localStorage.getItem(HISTORY_OPEN_KEY);
    if (v !== null) return v === '1';
  } catch {
    /* ignore */
  }
  // Default open on desktop, closed on small screens.
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(min-width: 1024px)').matches;
  }
  return true;
}

function sessionLabel(s: SessionSummary): string {
  if (s.client_label) return s.client_label;
  const lob = s.profile?.line_of_business;
  if (lob) {
    const top = (Object.entries(lob) as [string, number][])
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort(([, a], [, b]) => b - a)[0];
    if (top) return `${top[0].replace('_', ' ')} ${Math.round(top[1])}%`;
  }
  const geo = s.profile?.geography;
  if (geo && geo.length > 0) return geo.slice(0, 2).join(', ');
  return 'Untitled scope';
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.round((now - then) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ChatThread({
  continueTo = '/phase2',
  continueLabel = 'Continue to Phase 2 →',
  showContinue = true,
  extraBubbles = null,
  composerHint = null,
}: {
  continueTo?: string | null;
  continueLabel?: string;
  showContinue?: boolean;
  extraBubbles?: React.ReactNode;
  composerHint?: React.ReactNode;
} = {}) {
  const nav = useNavigate();
  const { profile, transcript, sessionId, setFullProfile, appendTurn, reset, switchSession } =
    useScoping();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Inline axis-viz tracker. Records which axis got pinned at which assistant
  // turn, so we can render a small visualisation right inside that bubble.
  // Keyed by transcript index (assistant-turn position). Only fills on live
  // turns; replays from supabase don't repopulate it.
  const prevProfileRef = useRef<ScopingProfile>({});
  const [pinnedAtTurn, setPinnedAtTurn] = useState<Record<number, ScopingAxis>>({});

  // History sidebar state.
  const [historyOpen, setHistoryOpen] = useState<boolean>(() => getInitialHistoryOpen());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const reloadSessions = useCallback(async () => {
    setHistoryLoading(true);
    const rows = await listSessions(50);
    setSessions(rows);
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [reloadSessions]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_OPEN_KEY, historyOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [historyOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length, loading, extraBubbles]);

  // Detect a newly-pinned axis between renders and tag it onto the most
  // recent assistant turn. The tag is what AxisViz reads.
  useEffect(() => {
    const newlyPinned = SCOPING_AXES.find(
      (a) =>
        profile[a as keyof ScopingProfile] !== undefined &&
        prevProfileRef.current[a as keyof ScopingProfile] === undefined,
    );
    prevProfileRef.current = profile;
    if (!newlyPinned) return;
    let lastAsstIdx = -1;
    for (let i = transcript.length - 1; i >= 0; i--) {
      if (transcript[i].role === 'assistant') {
        lastAsstIdx = i;
        break;
      }
    }
    if (lastAsstIdx < 0) return;
    setPinnedAtTurn((p) => (p[lastAsstIdx] ? p : { ...p, [lastAsstIdx]: newlyPinned as ScopingAxis }));
  }, [profile, transcript.length]);

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

  function handleNewChat() {
    reset();
    setPinnedAtTurn({});
    prevProfileRef.current = {};
    void reloadSessions();
  }

  async function handleSwitch(id: string) {
    await switchSession(id);
    setErr(null);
    setPinnedAtTurn({});
    prevProfileRef.current = {};
  }

  // Soft-confirm delete from the sidebar. If the deleted row was the active
  // session, fall back to a fresh chat so we don't leave the conversation
  // pointing at a phantom id.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  async function handleDelete(id: string) {
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      // Auto-cancel the armed delete after a few seconds so a stray click
      // doesn't quietly stay primed.
      window.setTimeout(() => {
        setPendingDeleteId((curr) => (curr === id ? null : curr));
      }, 4000);
      return;
    }
    setPendingDeleteId(null);
    // Optimistic UI: drop from the list immediately, refetch on next list call.
    setSessions((prev) => prev.filter((s) => s.id !== id));
    const ok = await deleteSession(id);
    if (!ok) {
      setErr('Could not delete session — please retry.');
      void reloadSessions();
      return;
    }
    if (id === sessionId) {
      reset();
      setPinnedAtTurn({});
      prevProfileRef.current = {};
    }
    void reloadSessions();
  }

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
      const { getCurrentUserId } = await import('../lib/supabase');
      const r = await fetch(AGENT_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          screen: 'scoping',
          session_id: sessionId,
          // Anon-auth uid so backend can stamp ownership on inserted rows.
          // Backend uses service-role key which bypasses RLS for write.
          user_id: getCurrentUserId(),
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
      // Refresh history list so the current session shows up.
      void reloadSessions();
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
  const sidebarCols = historyOpen ? 'lg:grid-cols-[260px_1fr_320px]' : 'lg:grid-cols-[40px_1fr_320px]';

  return (
    <div className={['lg:grid lg:gap-3 lg:items-start', sidebarCols].join(' ')}>
      {/* History sidebar */}
      <aside
        aria-label="Chat history"
        className={[
          'mb-3 flex flex-col border border-rule bg-paper transition-all lg:mb-0 lg:h-[80vh]',
          historyOpen ? 'lg:overflow-hidden' : 'lg:overflow-hidden',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-rule px-2 py-2.5">
          {historyOpen ? (
            <>
              <Eyebrow>History</Eyebrow>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="Start a new scoping session"
                  className="font-mono text-[10px] uppercase tracking-eyebrow text-sea hover:text-ink"
                >
                  + New
                </button>
                <button
                  type="button"
                  aria-label="Hide history"
                  onClick={() => setHistoryOpen(false)}
                  className="px-1 font-mono text-[12px] text-muted hover:text-ink"
                >
                  ‹
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              aria-label="Show history"
              onClick={() => setHistoryOpen(true)}
              className="mx-auto px-1 font-mono text-[12px] text-muted hover:text-ink"
            >
              ›
            </button>
          )}
        </div>

        {historyOpen && (
          <ul className="flex-1 overflow-y-auto px-1 py-1">
            {historyLoading && sessions.length === 0 && (
              <li className="px-2 py-2 font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                Loading…
              </li>
            )}
            {!historyLoading && sessions.length === 0 && (
              <li className="px-2 py-2 text-[11px] leading-snug text-muted">
                No history yet. Send a message to start.
              </li>
            )}
            {sessions.map((s) => {
              const sel = s.id === sessionId;
              const armed = pendingDeleteId === s.id;
              return (
                <li key={s.id} className="group/row relative">
                  <button
                    type="button"
                    onClick={() => void handleSwitch(s.id)}
                    aria-current={sel ? 'true' : undefined}
                    className={[
                      'flex w-full items-baseline justify-between gap-2 border-l-2 px-2 py-1.5 pr-8 text-left transition',
                      sel
                        ? 'border-ink bg-ink/[0.04] text-ink'
                        : 'border-transparent text-ink hover:border-rule hover:bg-ink/[0.02]',
                    ].join(' ')}
                  >
                    <span className="min-w-0 flex-1 truncate text-[12px]">{sessionLabel(s)}</span>
                    <span className="shrink-0 font-mono text-[9px] tab-num text-muted">
                      {relativeTime(s.created_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(s.id);
                    }}
                    aria-label={armed ? 'Confirm delete' : 'Delete session'}
                    title={armed ? 'Click again to confirm' : 'Delete'}
                    className={[
                      'absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center font-mono text-[12px] transition',
                      armed
                        ? 'border border-rust bg-rust text-paper'
                        : 'text-muted opacity-0 hover:text-rust group-hover/row:opacity-100 focus:opacity-100',
                    ].join(' ')}
                  >
                    {armed ? '!' : '×'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Conversation column */}
      <div className="flex h-[80vh] flex-col border border-rule bg-paper">
        <div className="flex items-baseline justify-between border-b border-rule px-4 py-3">
          <Eyebrow>Consultant interview · ILMU Nemo Super</Eyebrow>
          <button
            type="button"
            onClick={handleNewChat}
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
                Hi — I'm <span className="italic">ILMU</span>.
              </p>
              <p className="mt-2 max-w-md font-serif text-[15px] italic leading-relaxed text-ink lg:text-[16px]">
                Five questions, then I'll propose the risk taxonomy and the indicator panel
                — all in this chat.
              </p>
              <ul className="mt-5 grid grid-cols-1 gap-1 text-left font-mono text-[10px] uppercase tracking-eyebrow text-muted">
                <li><span className="text-sea mr-2">01</span> Line of business</li>
                <li><span className="text-sea mr-2">02</span> Geography</li>
                <li><span className="text-sea mr-2">03</span> Time horizon</li>
                <li><span className="text-sea mr-2">04</span> Frameworks</li>
                <li><span className="text-sea mr-2">05</span> Disclosures</li>
              </ul>
              <p className="mt-5 max-w-md text-[12px] leading-snug text-muted">
                Pick a chip below to start, or just type. The canonical demo persona is the
                first chip — one tap pins LOB.
              </p>
            </div>
          ) : (
            <ul className="mx-auto max-w-2xl space-y-5">
              {transcript.map((turn, i) => {
                const vizAxis = turn.role === 'assistant' ? pinnedAtTurn[i] : undefined;
                return (
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
                      {vizAxis && (
                        <div className="not-italic mt-3 border-t border-rule pt-3">
                          <AxisViz axis={vizAxis} profile={profile} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
              {loading && (
                <li className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-rule bg-paper px-4 py-2 font-serif text-[13px] italic text-muted">
                    Thinking…
                  </div>
                </li>
              )}
            </ul>
          )}

          {/* Wizard / step bubbles injected by the parent screen, rendered inline
              with the chat transcript so flow feels continuous. */}
          {extraBubbles && (
            <div className="mx-auto mt-5 max-w-2xl space-y-5">{extraBubbles}</div>
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

        {/* Composer + predicted-input chips. composerHint replaces the
            suggestion strip when the parent has taken the wheel (e.g., wizard
            steps await user action inside a bubble). */}
        <div className="border-t border-rule px-4 py-3">
          {composerHint && (
            <p className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
              {composerHint}
            </p>
          )}
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

        {showContinue && continueTo ? (
          profile.complete ? (
            <button
              onClick={() => nav(continueTo)}
              className="mt-3 w-full border border-ink bg-ink px-3 py-2 text-[12px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
            >
              {continueLabel}
            </button>
          ) : (
            <p className="mt-3 text-[11px] leading-snug text-muted">
              All five axes pin at confidence ≥ 70 % to unlock the next step.
            </p>
          )
        ) : (
          <p className="mt-3 text-[11px] leading-snug text-muted">
            {profile.complete
              ? 'All axes pinned · taxonomy + indicators auto-derived below.'
              : 'Pin the five axes to lock taxonomy + indicators below.'}
          </p>
        )}
      </aside>
    </div>
  );
}

// ============================================================================
// AxisViz — small in-bubble visualisations the user sees the moment ILMU pins
// an axis. Each is intentionally compact (≤ 80 px tall) so the chat doesn't
// balloon. All shapes work inside the assistant bubble's max-w[80%].
// ============================================================================

const SECTOR_HUE: Record<string, string> = {
  property_cat: '#8B2E1F',
  agriculture:  '#5C7C3D',
  life:         '#0E7C86',
  casualty:     '#B8761C',
  specialty:    '#4F6D8A',
};

const SEA_TIER_HUE: Record<string, string> = {
  Vietnam: '#B8761C', Philippines: '#3F8A66', Indonesia: '#3F8A66',
  Singapore: '#3F8A66', Thailand: '#0E7C86', Malaysia: '#B8761C',
  Cambodia: '#0E7C86', Myanmar: '#0E7C86', 'Lao PDR': '#8B2E1F',
  'Brunei Darussalam': '#0A1A2A',
};

const FRAMEWORK_HUE: Record<string, string> = {
  TCFD: '#0E7C86', ISSB_S2: '#3F8A66', Solvency_II_ORSA: '#B8761C',
  NAIC: '#4F6D8A', Internal_Capital: '#7A6E55', Other: '#7A8A9C',
};

const DISCLOSURE_HUE: Record<string, string> = {
  TCFD: '#0E7C86', ISSB_S2: '#3F8A66',
  Regulatory_Stress_Test: '#B8761C', Internal_Only: '#0A1A2A',
};

function AxisViz({ axis, profile }: { axis: ScopingAxis; profile: ScopingProfile }) {
  if (axis === 'line_of_business') {
    const lob = profile.line_of_business ?? {};
    const entries = Object.entries(lob)
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort(([, a], [, b]) => b - a);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">Book mix</p>
        <div className="mt-1 flex h-3 w-full overflow-hidden border border-rule">
          {entries.map(([k, v]) => (
            <span
              key={k}
              title={`${k.replace('_', ' ')} ${Math.round(v)}%`}
              style={{ width: `${(v / total) * 100}%`, background: SECTOR_HUE[k] ?? '#7A8A9C' }}
            />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] tab-num text-ink">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0"
                style={{ background: SECTOR_HUE[k] ?? '#7A8A9C' }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-muted">{k.replace('_', ' ')}</span>
              <span className="text-ink">{Math.round(v)}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (axis === 'geography') {
    const tags = profile.geography ?? [];
    return (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          Markets · {tags.length}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 border border-rule bg-paper px-1.5 py-0.5 text-[11px] text-ink"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: SEA_TIER_HUE[t] ?? '#7A8A9C' }}
                aria-hidden="true"
              />
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (axis === 'time_horizon') {
    const th = profile.time_horizon ?? { uw_years: 1, life_years: 30 };
    const max = 50;
    const uwPct = (th.uw_years / max) * 100;
    const lifePct = (th.life_years / max) * 100;
    return (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">Horizon</p>
        <div className="mt-2 space-y-2">
          <HorizonBar label="Underwriting" years={th.uw_years} pct={uwPct} hue="#0E7C86" />
          <HorizonBar label="Liability tail" years={th.life_years} pct={lifePct} hue="#8B2E1F" />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] tab-num text-muted">
          <span>0y</span>
          <span>25y</span>
          <span>50y</span>
        </div>
      </div>
    );
  }

  if (axis === 'frameworks') {
    const tags = profile.frameworks ?? [];
    return (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          Frameworks · {tags.length}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px]"
              style={{
                borderColor: FRAMEWORK_HUE[t] ?? '#7A8A9C',
                color: FRAMEWORK_HUE[t] ?? '#0A1A2A',
              }}
            >
              <span
                className="h-1.5 w-1.5"
                style={{ background: FRAMEWORK_HUE[t] ?? '#7A8A9C' }}
                aria-hidden="true"
              />
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (axis === 'disclosures') {
    const tags = profile.disclosures ?? [];
    return (
      <div>
        <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          Disclosures · {tags.length}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px]"
              style={{
                borderColor: DISCLOSURE_HUE[t] ?? '#7A8A9C',
                color: DISCLOSURE_HUE[t] ?? '#0A1A2A',
              }}
            >
              <span
                className="h-1.5 w-1.5"
                style={{ background: DISCLOSURE_HUE[t] ?? '#7A8A9C' }}
                aria-hidden="true"
              />
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function HorizonBar({ label, years, pct, hue }: { label: string; years: number; pct: number; hue: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between font-mono text-[9px] tab-num text-muted">
        <span>{label}</span>
        <span className="text-ink">{years}y</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full bg-rule">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: hue }} />
      </div>
    </div>
  );
}
