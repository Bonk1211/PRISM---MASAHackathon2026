// Phase 1 multi-turn consultant chat — Claude-style chatbox.
//
// Visual = Claude chat: centered narrow column, no message bubbles for
// assistant (plain text, serif italic for PRISM's voice), user messages in
// a right-aligned gray rounded card, large rounded composer with send
// arrow inside the textarea.
//
// Keeps the scoping data layer untouched (useScoping → localStorage +
// Supabase). Sidebars / rail / suggestion chips / inline AxisViz removed
// per the Claude-pure brief; props (extraBubbles, composerHint,
// continueTo/showContinue) preserved so Phase1Discovery's wizard injection
// still works.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eyebrow } from './Card';
import {
  listSessions,
  pinnedAxes,
  SCOPING_AXES,
  type ChatTurn,
  type ScopingAxis,
  type ScopingProfile,
  type SessionSummary,
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
  scoping_profile: Record<string, unknown> | null;
  complete: boolean;
  session_id: string | null;
  error: string | null;
};

// Predicted-input chips — shift to the next-unpinned axis so the user always
// gets relevant prompts. Phrasings TESTED against ilmu nemo-super: each chip
// pins its axis at confidence ≥0.9 reliably (3/3 cold runs). Don't edit
// without re-testing — the model is sensitive to enum casing and
// abbreviation ("UW" fails, "underwriting" works; "TCFD only" fails,
// "TCFD and ISSB_S2" works).
//
// Three-chip set per axis: canonical SEA-typhoon demo persona first, a
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

// Opener chips on a fresh chat — first option = canonical demo persona so a
// single tap pins LOB instantly; remaining chips give variety.
const OPENING_SUGGESTIONS = SUGGESTIONS_BY_AXIS.line_of_business;

// === History sidebar helpers ============================================

const HISTORY_OPEN_KEY = 'prism.scoping.history_open.v1';

function getInitialHistoryOpen(): boolean {
  try {
    const v = localStorage.getItem(HISTORY_OPEN_KEY);
    if (v !== null) return v === '1';
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(min-width: 1024px)').matches;
  }
  return true;
}

function sessionLabel(s: SessionSummary): string {
  if (s.client_label) return s.client_label;
  const lob = (s.profile as ScopingProfile | null)?.line_of_business;
  if (lob) {
    const top = (Object.entries(lob) as [string, number][])
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort(([, a], [, b]) => b - a)[0];
    if (top) return `${top[0].replace('_', ' ')} ${Math.round(top[1])}%`;
  }
  const geo = (s.profile as ScopingProfile | null)?.geography;
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
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d`;
  return new Date(iso).toISOString().slice(0, 10);
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
  const {
    profile,
    transcript,
    sessionId,
    setFullProfile,
    appendTurn,
    reset,
    switchSession,
  } = useScoping();
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const inFlight = useRef(false);

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

  const handleNewChat = useCallback(() => {
    reset();
    void reloadSessions();
  }, [reset, reloadSessions]);

  const handleSwitch = useCallback(
    async (id: string) => {
      await switchSession(id);
      setErr(null);
    },
    [switchSession],
  );

  // Auto-scroll on new turn / spinner / injected wizard bubbles.
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Auto-grow textarea up to ~10 rows.
  const autoSize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  }, []);

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
    requestAnimationFrame(() => {
      autoSize();
      scrollToBottom();
    });

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
          user_id: getCurrentUserId(),
          current_state: profile,
        }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as AgentResponse;

      if (data.scoping_profile) setFullProfile(data.scoping_profile);
      if (data.narration) {
        appendTurn({
          role: 'assistant',
          content: data.narration,
          ts: new Date().toISOString(),
        });
      }
      if (data.error) setErr(data.error);
      // Refresh history list so the current session label updates.
      void reloadSessions();
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      const m = e instanceof Error ? e.message : String(e);
      setErr(name === 'AbortError' ? 'Timed out (20s) — server may be cold.' : m);
    } finally {
      clearTimeout(t);
      setLoading(false);
      inFlight.current = false;
      requestAnimationFrame(scrollToBottom);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submit(msg);
  }

  // Predicted suggestions: pick the first unpinned axis after the latest
  // assistant turn; opener chips before the user has spoken; nothing once
  // scoping is complete or when the parent has injected its own UI.
  const suggestions = useMemo(() => {
    if (profile.complete) return [];
    if (composerHint) return [];
    if (transcript.length === 0) return OPENING_SUGGESTIONS;
    const pinned = pinnedAxes(profile);
    const nextAxis = SCOPING_AXES.find((a) => !pinned.includes(a));
    if (!nextAxis) return [];
    return SUGGESTIONS_BY_AXIS[nextAxis];
  }, [profile, transcript.length, composerHint]);

  const isEmpty = transcript.length === 0 && !loading;
  const sidebarCols = historyOpen
    ? 'lg:grid-cols-[260px_1fr]'
    : 'lg:grid-cols-[44px_1fr]';

  return (
    <div className={['lg:grid lg:items-start lg:gap-3', sidebarCols].join(' ')}>
      {/* === History sidebar — desktop only === */}
      <aside
        aria-label="Chat history"
        className="mb-3 hidden flex-col border border-rule bg-paper transition-all lg:mb-0 lg:flex lg:h-[80vh] lg:overflow-hidden"
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
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => void handleSwitch(s.id)}
                    aria-current={sel ? 'true' : undefined}
                    className={[
                      'flex w-full items-baseline justify-between gap-2 border-l-2 px-2 py-1.5 text-left transition',
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
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* === Conversation column === */}
      <div className="mx-auto flex h-[80vh] w-full max-w-3xl flex-col lg:mx-0 lg:max-w-none">
      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="display text-[28px] leading-[1.05] text-ink lg:text-[40px]">
              Hi — I'm <span className="italic">PRISM</span>.
            </p>
            <p className="mt-3 max-w-md font-serif text-[15px] italic leading-relaxed text-ink lg:text-[16px]">
              Five questions, then I'll propose the risk taxonomy and the indicator panel
              — all in this chat.
            </p>
            <p className="mt-4 max-w-md font-mono text-[10px] uppercase tracking-eyebrow text-muted">
              Tap a suggested answer below or just type.
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {transcript.map((turn, i) => (
              <li
                key={i}
                className={[
                  'flex',
                  turn.role === 'user' ? 'justify-end' : 'justify-start',
                ].join(' ')}
              >
                {turn.role === 'user' ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-ink/[0.06] px-4 py-2.5 text-[14px] leading-relaxed text-ink">
                    {turn.content}
                  </div>
                ) : (
                  <div className="max-w-full whitespace-pre-wrap font-serif text-[15px] italic leading-relaxed text-ink">
                    {turn.content}
                  </div>
                )}
              </li>
            ))}
            {loading && (
              <li className="flex justify-start">
                <div className="font-serif text-[14px] italic text-muted">Thinking…</div>
              </li>
            )}
          </ul>
        )}

        {/* Wizard / step bubbles injected by parent screen (Phase1Discovery). */}
        {extraBubbles && <div className="mt-6 space-y-5">{extraBubbles}</div>}

        {err && (
          <p
            role="alert"
            className="mt-4 border border-rust bg-paper px-2 py-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-rust"
          >
            {err}
          </p>
        )}
      </div>

      {/* Composer — Claude-style: rounded box, send arrow inside */}
      <div className="px-4 pb-6 pt-2">
        {composerHint && (
          <p className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
            {composerHint}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
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

        <form onSubmit={onSubmit} className="relative">
          <textarea
            ref={taRef}
            value={msg}
            onChange={(e) => {
              setMsg(e.target.value);
              autoSize();
            }}
            rows={1}
            maxLength={2000}
            placeholder="Reply to PRISM…"
            aria-label="Reply to PRISM"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
            className="block w-full resize-none rounded-3xl border border-rule bg-paper px-5 py-4 pr-14 text-[14px] leading-relaxed text-ink placeholder:text-muted focus:border-ink focus:outline-none disabled:opacity-60"
            style={{ minHeight: 56, maxHeight: 240 }}
          />
          <button
            type="submit"
            disabled={loading || !msg.trim()}
            aria-label="Send"
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-ink text-paper transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-rule disabled:text-muted"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-eyebrow text-muted">
          <span>{msg.length}/2000 · ↵ to send · ⇧↵ for newline</span>
          {showContinue && continueTo && profile.complete && (
            <button
              type="button"
              onClick={() => nav(continueTo)}
              className="border border-ink bg-ink px-3 py-1.5 text-[11px] font-semibold text-paper transition hover:bg-paper hover:text-ink"
            >
              {continueLabel}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
