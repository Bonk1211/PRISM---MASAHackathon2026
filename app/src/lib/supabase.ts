// Browser Supabase client — Phase 1 scoping persistence mirror.
//
// Tolerates missing env config: createSupabaseClient() returns null when
// VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are unset. Callers fall back to
// localStorage-only mode so the demo keeps working when Supabase is unreachable
// (per plan §Risks "Supabase outage during demo").

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!URL || !ANON_KEY) {
    cached = null;
    return cached;
  }
  try {
    cached = createClient(URL, ANON_KEY, {
      auth: { persistSession: false },
    });
  } catch {
    cached = null;
  }
  return cached;
}

export const HAS_SUPABASE = !!(URL && ANON_KEY);
