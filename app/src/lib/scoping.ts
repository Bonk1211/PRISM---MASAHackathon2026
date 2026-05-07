// Phase 1 scoping profile — useScoping() hook + localStorage mirror + Supabase sync.
//
// The consultant chat (Gemini, server-side) writes ScopingProfile partials each
// turn via tool calls; this client mirrors those into localStorage so phases 2-6
// can read scope context with `getScopingSnapshot()` (sync, no async). When
// Supabase env is configured, the session profile + transcript are also
// persisted server-side keyed by `session_id`. Soft gate: phases 2-6 still
// render with default scope when scoping is incomplete.
//
// Shape mirrors serve/scoping.py::ScopingProfile — see that module for the
// authoritative enum lists. Frontend stays permissive (string instead of
// strict union) so a backend that adds enum values doesn't break the build.

import { useCallback, useEffect, useState } from 'react';
import { ensureAnonAuth, getSupabase, HAS_SUPABASE } from './supabase';

export type LOB = 'property_cat' | 'agriculture' | 'life' | 'casualty' | 'specialty';
export type Framework =
  | 'TCFD'
  | 'ISSB_S2'
  | 'Solvency_II_ORSA'
  | 'NAIC'
  | 'Internal_Capital'
  | 'Other';
export type Disclosure = 'TCFD' | 'ISSB_S2' | 'Regulatory_Stress_Test' | 'Internal_Only';

export type ScopingAxis =
  | 'line_of_business'
  | 'geography'
  | 'time_horizon'
  | 'frameworks'
  | 'disclosures';

export const SCOPING_AXES: ScopingAxis[] = [
  'line_of_business',
  'geography',
  'time_horizon',
  'frameworks',
  'disclosures',
];

export type TimeHorizon = { uw_years: number; life_years: number };

// Partial during interview; backend marks complete=true once every axis is
// pinned at confidence >= 0.7.
export type ScopingProfile = {
  line_of_business?: Partial<Record<LOB, number>>;
  geography?: string[];
  time_horizon?: TimeHorizon;
  frameworks?: string[];
  disclosures?: string[];
  client_label?: string;
  confidence?: Partial<Record<ScopingAxis, number>>;
  complete?: boolean;
};

export type ChatRole = 'user' | 'assistant';

export type ChatTurn = {
  role: ChatRole;
  content: string;
  ts: string;
};

export const PROFILE_KEY = 'prism.scoping.v1';
export const SESSION_KEY = 'prism.scoping.session_id.v1';
export const TRANSCRIPT_KEY = 'prism.scoping.transcript.v1';

// --- session id ----------------------------------------------------------

export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // localStorage unavailable — fresh per call (no persistence; backend tolerates).
    return crypto.randomUUID();
  }
}

// --- snapshot reads (sync) ----------------------------------------------

export function getScopingSnapshot(): ScopingProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ScopingProfile;
  } catch {
    return {};
  }
}

export function getTranscriptSnapshot(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

// --- writers -------------------------------------------------------------

export function saveProfile(p: ScopingProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function saveTranscript(t: ChatTurn[]): void {
  try {
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

export function resetScoping(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(TRANSCRIPT_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// --- supabase sync (best-effort, never blocks UI) -----------------------

export async function upsertSupabaseProfile(
  sessionId: string,
  profile: ScopingProfile,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await ensureAnonAuth();
  if (!uid) return;
  try {
    await sb
      .from('scoping_sessions')
      .upsert(
        {
          id: sessionId,
          user_id: uid,
          client_label: profile.client_label ?? null,
          complete: !!profile.complete,
          profile,
        },
        { onConflict: 'id' },
      );
  } catch {
    /* offline-tolerant */
  }
}

export async function appendSupabaseMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'tool',
  content: string,
  toolName?: string,
  toolArgs?: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const uid = await ensureAnonAuth();
  if (!uid) return;
  try {
    await sb.from('scoping_messages').insert({
      session_id: sessionId,
      role,
      content,
      tool_name: toolName ?? null,
      tool_args: toolArgs ?? null,
    });
  } catch {
    /* offline-tolerant */
  }
}

// --- progress helper -----------------------------------------------------

export function pinnedAxes(profile: ScopingProfile): ScopingAxis[] {
  const conf = profile.confidence ?? {};
  return SCOPING_AXES.filter((axis) => {
    const c = conf[axis] ?? 0;
    return profile[axis] !== undefined && c >= 0.7;
  });
}

// --- session list (Supabase-backed history) ------------------------------

export type SessionSummary = {
  id: string;
  created_at: string;
  client_label: string | null;
  complete: boolean;
  profile: ScopingProfile | null;
};

export async function listSessions(limit = 50): Promise<SessionSummary[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const uid = await ensureAnonAuth();
  if (!uid) return [];
  try {
    const { data, error } = await sb
      .from('scoping_sessions')
      .select('id, created_at, client_label, complete, profile')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as SessionSummary[];
  } catch {
    return [];
  }
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatTurn[]> {
  const sb = getSupabase();
  if (!sb || !sessionId) return [];
  const uid = await ensureAnonAuth();
  if (!uid) return [];
  try {
    const { data, error } = await sb
      .from('scoping_messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(400);
    if (error || !data) return [];
    return data
      .filter((r): r is { role: string; content: string; created_at: string } =>
        (r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string' && r.content.length > 0,
      )
      .map((r) => ({
        role: r.role as ChatRole,
        content: r.content,
        ts: r.created_at,
      }));
  } catch {
    return [];
  }
}

// --- hook ----------------------------------------------------------------

export function useScoping() {
  const [profile, setProfile] = useState<ScopingProfile>(() => getScopingSnapshot());
  const [transcript, setTranscript] = useState<ChatTurn[]>(() => getTranscriptSnapshot());
  const [sessionId, setSessionId] = useState<string>(() => getOrCreateSessionId());

  // Eagerly mint an anonymous auth session so the sidebar (and future writes)
  // have a uid the moment the user lands on /phase1. Idempotent.
  useEffect(() => {
    void ensureAnonAuth();
  }, []);

  const setFullProfile = useCallback(
    (full: ScopingProfile) => {
      const next = { ...full };
      setProfile(next);
      saveProfile(next);
      if (HAS_SUPABASE) void upsertSupabaseProfile(sessionId, next);
    },
    [sessionId],
  );

  const appendTurn = useCallback(
    (turn: ChatTurn) => {
      setTranscript((prev) => {
        const next = [...prev, turn];
        saveTranscript(next);
        if (HAS_SUPABASE) void appendSupabaseMessage(sessionId, turn.role, turn.content);
        return next;
      });
    },
    [sessionId],
  );

  const reset = useCallback(() => {
    resetScoping();
    setProfile({});
    setTranscript([]);
    // Recreate fresh session id so the next turn starts a new server-side row.
    const fresh = crypto.randomUUID();
    try {
      localStorage.setItem(SESSION_KEY, fresh);
    } catch {
      /* ignore */
    }
    setSessionId(fresh);
  }, []);

  // Switch to an existing Supabase session: load its transcript + profile and
  // make it the active session_id (subsequent turns append to it).
  const switchSession = useCallback(async (id: string) => {
    if (!id || id === sessionId) return;
    const [msgs, sb] = await Promise.all([fetchSessionMessages(id), Promise.resolve(getSupabase())]);
    let nextProfile: ScopingProfile = {};
    if (sb) {
      try {
        const { data } = await sb
          .from('scoping_sessions')
          .select('profile')
          .eq('id', id)
          .limit(1);
        nextProfile = (data?.[0]?.profile as ScopingProfile) ?? {};
      } catch {
        nextProfile = {};
      }
    }
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {
      /* ignore */
    }
    setSessionId(id);
    setTranscript(msgs);
    saveTranscript(msgs);
    setProfile(nextProfile);
    saveProfile(nextProfile);
  }, [sessionId]);

  // Re-sync from storage when other tabs mutate it.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === PROFILE_KEY) setProfile(getScopingSnapshot());
      if (e.key === TRANSCRIPT_KEY) setTranscript(getTranscriptSnapshot());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { profile, transcript, sessionId, setFullProfile, appendTurn, reset, switchSession };
}
