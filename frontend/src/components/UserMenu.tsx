// Top-right user pill — shows current account + dropdown with sign in/out.
// Reads auth state from Supabase session events so it stays live across tabs.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  type AuthUser,
  getCurrentAuthUser,
  getSupabase,
  signOut as supaSignOut,
} from '../lib/supabase';

function initials(user: AuthUser): string {
  const name = user.display_name || user.email || 'User';
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function shortLabel(user: AuthUser): string {
  if (user.is_anonymous) return 'Guest';
  return user.display_name || user.email || 'Account';
}

export function UserMenu() {
  const nav = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let mounted = true;
    void getCurrentAuthUser().then((u) => {
      if (mounted) setUser(u);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      const u = await getCurrentAuthUser();
      if (mounted) setUser(u);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Click-outside / escape closes.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await supaSignOut();
    nav('/onboarding', { replace: true });
  }

  function handleSignIn() {
    setOpen(false);
    nav('/onboarding');
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => nav('/onboarding')}
        className="border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-eyebrow text-ink hover:border-ink"
      >
        Sign in
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account · ${shortLabel(user)}`}
        className={[
          'flex items-center gap-2 border px-2 py-1 transition',
          open ? 'border-ink bg-ink/[0.04]' : 'border-rule hover:border-ink',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'grid h-6 w-6 place-items-center font-mono text-[10px] tab-num',
            user.is_anonymous ? 'border border-rule bg-paper text-muted' : 'bg-ink text-paper',
          ].join(' ')}
        >
          {user.is_anonymous ? '?' : initials(user)}
        </span>
        <span className="hidden max-w-[120px] truncate text-[12px] text-ink lg:inline">
          {shortLabel(user)}
        </span>
        <span aria-hidden="true" className="font-mono text-[9px] text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-[260px] border border-rule bg-paper shadow-plate"
        >
          <div className="border-b border-rule px-3 py-3">
            <p className="font-mono text-[9px] uppercase tracking-eyebrow text-muted">
              {user.is_anonymous ? 'Guest session' : 'Signed in as'}
            </p>
            <p className="mt-1 truncate text-[13px] font-semibold text-ink">
              {user.display_name || user.email || 'Account'}
            </p>
            {user.email && !user.is_anonymous && (
              <p className="mt-0.5 truncate font-mono text-[10px] tab-num text-muted">
                {user.email}
              </p>
            )}
          </div>

          {user.is_anonymous ? (
            <button
              type="button"
              role="menuitem"
              onClick={handleSignIn}
              className="block w-full px-3 py-2 text-left text-[12px] text-ink hover:bg-ink/[0.04]"
            >
              Sign in / Create account →
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={handleSignIn}
              className="block w-full px-3 py-2 text-left text-[12px] text-ink hover:bg-ink/[0.04]"
            >
              Switch account →
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full border-t border-rule px-3 py-2 text-left text-[12px] text-rust hover:bg-rust/[0.04]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
