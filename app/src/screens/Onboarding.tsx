// Onboarding gate — first-visit signup / signin. Once authenticated the user
// is redirected back to whatever path they tried to reach. Keeps a guest
// option so judges can demo without committing an email.

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eyebrow, Hairline } from '../components/Card';
import { continueAsGuest, signIn, signUp } from '../lib/supabase';

type Mode = 'signup' | 'signin';

export function Onboarding() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as { from?: string } | null)?.from ?? '/phase1';

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signup' | 'signin' | 'guest' | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    setBusy(mode);
    const result =
      mode === 'signup'
        ? await signUp({ email, password, displayName: displayName || email.split('@')[0] })
        : await signIn({ email, password });
    setBusy(null);
    if (result.error) {
      setErr(result.error);
      return;
    }
    if (result.user) nav(redirectTo, { replace: true });
  }

  async function handleGuest() {
    if (busy) return;
    setErr(null);
    setBusy('guest');
    const result = await continueAsGuest();
    setBusy(null);
    if (result.error) {
      setErr(result.error);
      return;
    }
    if (result.user) nav(redirectTo, { replace: true });
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-md place-items-center px-5">
      <div className="w-full border border-rule bg-paper px-6 py-7 lg:px-8 lg:py-9">
        <Eyebrow>PRISM · Sign in</Eyebrow>
        <h1 className="display mt-2 text-[28px] leading-[1.05] text-ink lg:text-[36px]">
          {mode === 'signup' ? (
            <>
              Welcome to <span className="italic">PRISM</span>.
            </>
          ) : (
            <>
              Welcome <span className="italic">back</span>.
            </>
          )}
        </h1>
        <p className="mt-2 text-[12px] leading-snug text-muted">
          {mode === 'signup'
            ? 'Create an account so your scoping interviews and saved cedents follow you across devices.'
            : 'Sign in to continue your engagement.'}
        </p>
        <Hairline className="mt-4" />

        {/* Tabs */}
        <div role="tablist" className="mt-4 grid grid-cols-2 border border-rule">
          {(['signup', 'signin'] as Mode[]).map((m) => {
            const sel = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={sel}
                onClick={() => {
                  setMode(m);
                  setErr(null);
                }}
                className={[
                  'border-r border-rule py-2 font-mono text-[10px] uppercase tracking-eyebrow transition last:border-r-0',
                  sel ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/[0.04]',
                ].join(' ')}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'signup' && (
            <Field label="Display name">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jiale"
                autoComplete="name"
                maxLength={64}
                className="w-full border border-rule bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              autoComplete={mode === 'signup' ? 'email' : 'email'}
              className="w-full border border-rule bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full border border-rule bg-paper px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
            />
          </Field>

          {err && (
            <p
              role="alert"
              className="border border-rust bg-paper px-2 py-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-rust"
            >
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== null}
            className="w-full border border-ink bg-ink py-2 text-[13px] font-semibold text-paper transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === mode ? 'Working…' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-rule" />
          <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">or</span>
          <span className="h-px flex-1 bg-rule" />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={busy !== null}
          className="mt-4 w-full border border-rule bg-paper py-2 text-[12px] text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === 'guest' ? 'Working…' : 'Continue as guest'}
        </button>
        <p className="mt-2 text-[10px] leading-snug text-muted">
          Guest sessions persist in this browser only. Sign up to keep history across devices.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
