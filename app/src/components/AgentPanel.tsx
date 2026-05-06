import { useState } from 'react';
import { Eyebrow, Hairline } from './Card';

type Screen = 'cedent' | 'stress';

type AgentResponse = {
  updates: Record<string, unknown>;
  narration: string;
  model_output: Record<string, unknown> | null;
  tool_called: string | null;
  error: string | null;
};

const PIPELINE_API = (import.meta.env.VITE_PIPELINE_API as string | undefined) ?? '';
const AGENT_API =
  (import.meta.env.VITE_AGENT_API as string | undefined) ??
  (PIPELINE_API ? `${PIPELINE_API}/agent` : '/agent');

const PLACEHOLDER: Record<Screen, string> = {
  cedent: 'e.g. "Vietnamese power cedent, 70% thermal mix, no NDC plan filed"',
  stress: 'e.g. "Net Zero 2050 at elasticity 0.9"',
};

const STARTERS: Record<Screen, string[]> = {
  cedent: [
    'Indonesian utility, 60% coal, 20% gas, NDC filed',
    'Malaysian industrial cedent, balanced mix, energy override 70%',
  ],
  stress: [
    'Show Net Zero 2050 at base elasticity',
    'Hot House World with stressed peril mix',
  ],
};

export function AgentPanel({
  screen,
  currentState,
  onUpdate,
}: {
  screen: Screen;
  currentState: Record<string, unknown>;
  onUpdate: (partial: Record<string, unknown>) => void;
}) {
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AgentResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    setErr(null);
    setResp(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(AGENT_API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, screen, current_state: currentState }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as AgentResponse;
      setResp(data);
      if (data.updates && Object.keys(data.updates).length) {
        onUpdate(data.updates);
      }
      if (data.error) setErr(data.error);
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      const m = e instanceof Error ? e.message : String(e);
      setErr(name === 'AbortError' ? 'Timed out (12s)' : m);
    } finally {
      clearTimeout(t);
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(msg);
  }

  const appliedKeys = resp?.updates ? Object.keys(resp.updates) : [];

  return (
    <aside
      aria-label="AI input panel"
      className="border border-rule bg-paper px-4 py-4 lg:sticky lg:top-20"
    >
      <div className="flex items-baseline justify-between">
        <Eyebrow>AI input · Gemini Flash</Eyebrow>
        <span className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
          Beta
        </span>
      </div>
      <Hairline className="mt-2" />

      <form onSubmit={onSubmit} className="mt-3 space-y-2">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={PLACEHOLDER[screen]}
          aria-label={`Describe your ${screen} request`}
          className="w-full resize-y border border-rule bg-paper px-2 py-1.5 text-[13px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">
            {msg.length}/2000
          </span>
          <button
            type="submit"
            disabled={loading || !msg.trim()}
            className="border border-ink bg-paper px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-paper disabled:hover:text-ink"
          >
            {loading ? 'Thinking…' : 'Apply →'}
          </button>
        </div>
      </form>

      {!resp && !loading && !err && (
        <div className="mt-3 space-y-1">
          <Eyebrow>Try</Eyebrow>
          <ul className="space-y-1">
            {STARTERS[screen].map((s) => (
              <li key={s}>
                <button
                  onClick={() => {
                    setMsg(s);
                    submit(s);
                  }}
                  className="text-left font-serif text-[12px] italic leading-snug text-sea hover:underline"
                >
                  {s} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {appliedKeys.length > 0 && (
        <div className="mt-3 border-t border-rule pt-2">
          <Eyebrow>Applied</Eyebrow>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-sea">
            {appliedKeys.join(' · ')}
          </p>
        </div>
      )}

      {resp?.narration && (
        <p className="mt-3 border-t border-rule pt-3 font-serif text-[13px] italic leading-relaxed text-ink">
          {resp.narration}
        </p>
      )}

      {err && (
        <p
          role="alert"
          className="mt-3 border border-rust bg-paper px-2 py-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-rust"
        >
          {err}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-snug text-muted">
        AI parses your request into form values; numbers come from the deterministic
        pipeline, not the LLM.
      </p>
    </aside>
  );
}
