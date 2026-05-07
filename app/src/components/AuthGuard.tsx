// Wraps the Layout outlet. While auth state is unknown shows a spinner; if no
// session exists redirects to /onboarding (carries the original path so the
// onboarding screen can bounce back after signup/signin).

import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';

type AuthState = 'loading' | 'authed' | 'anon';

export function AuthGuard() {
  const loc = useLocation();
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      // No Supabase configured — let the app run unauthenticated; the
      // localStorage fallback in lib/scoping handles it.
      setState('authed');
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!mounted) return;
        setState(data?.session?.user?.id ? 'authed' : 'anon');
      } catch {
        if (mounted) setState('anon');
      }
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState(session?.user?.id ? 'authed' : 'anon');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid min-h-screen place-items-center font-mono text-[11px] uppercase tracking-eyebrow text-muted"
      >
        Loading…
      </div>
    );
  }

  if (state === 'anon') {
    return <Navigate to="/onboarding" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return <Outlet />;
}
