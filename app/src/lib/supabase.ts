// Browser Supabase client — Phase 1 scoping persistence + anonymous auth.
//
// Each visitor gets a real auth.users row via supabase.auth.signInAnonymously()
// on first call to ensureAnonAuth(). The JWT then powers per-user RLS so a
// browser only sees its own scoping_sessions rows. No login form — the demo
// stays one-click.
//
// Falls back to null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
// missing (offline mode); callers degrade to localStorage.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cached: SupabaseClient | null | undefined;
let authPromise: Promise<string | null> | null = null;
let cachedUserId: string | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!URL || !ANON_KEY) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(URL, ANON_KEY, {
      // Persist the anon-auth JWT so the same browser keeps the same uid
      // across reloads (sidebar history follows the user, not the tab).
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'prism.supabase.auth.v1',
      },
    });
  } catch {
    cached = null;
  }
  return cached;
}

export const HAS_SUPABASE = !!(URL && ANON_KEY);

// Sign in anonymously if no session yet; idempotent. Returns the auth uid
// (or null when Supabase is unavailable / anon auth disabled in project).
export async function ensureAnonAuth(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  if (authPromise) return authPromise;
  const sb = getSupabase();
  if (!sb) return null;
  authPromise = (async () => {
    try {
      const { data: existing } = await sb.auth.getSession();
      if (existing?.session?.user?.id) {
        cachedUserId = existing.session.user.id;
        return cachedUserId;
      }
      const { data, error } = await sb.auth.signInAnonymously();
      if (error || !data?.user?.id) {
        // Anon sign-ins disabled in Supabase Auth settings; degrade gracefully.
        return null;
      }
      cachedUserId = data.user.id;
      return cachedUserId;
    } catch {
      return null;
    } finally {
      authPromise = null;
    }
  })();
  return authPromise;
}

export function getCurrentUserId(): string | null {
  return cachedUserId;
}

// --- explicit auth (signup / signin / guest / signout) ----------------------

export type AuthUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_anonymous: boolean;
};

function _toUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; is_anonymous?: boolean } | null | undefined): AuthUser | null {
  if (!user?.id) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: (user.email as string | null) ?? null,
    display_name: (meta.display_name as string | undefined) ?? null,
    is_anonymous: !!user.is_anonymous,
  };
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return _toUser(data?.session?.user ?? null);
  } catch {
    return null;
  }
}

export async function signUp(opts: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: 'Supabase unavailable' };
  try {
    const { data, error } = await sb.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: { data: { display_name: opts.displayName } },
    });
    if (error) return { user: null, error: error.message };
    const user = _toUser(data.user);
    if (user) cachedUserId = user.id;
    return { user, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function signIn(opts: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: 'Supabase unavailable' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email: opts.email,
      password: opts.password,
    });
    if (error) return { user: null, error: error.message };
    const user = _toUser(data.user);
    if (user) cachedUserId = user.id;
    return { user, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function continueAsGuest(): Promise<{ user: AuthUser | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: 'Supabase unavailable' };
  try {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) return { user: null, error: error.message };
    const user = _toUser(data.user);
    if (user) cachedUserId = user.id;
    return { user, error: null };
  } catch (e) {
    return { user: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  cachedUserId = null;
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch {
    /* ignore */
  }
}
