-- 001_scoping.sql — Phase 1 (Scoping & Context) Supabase schema.
-- Project ref: ncpvewfibvjyppoqrcbk
-- Apply via: python serve/migrations/apply.py
--   (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in serve/.env)
-- Or paste into Supabase Dashboard → SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists scoping_sessions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  client_label text,
  complete    bool default false,
  profile     jsonb
);

create table if not exists scoping_messages (
  id          bigserial primary key,
  session_id  uuid references scoping_sessions(id) on delete cascade,
  role        text not null check (role in ('user','assistant','tool')),
  content     text,
  tool_name   text,
  tool_args   jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_scoping_messages_session
  on scoping_messages(session_id, created_at);

alter table scoping_sessions enable row level security;
alter table scoping_messages enable row level security;

-- Hackathon-grade: anon role full read/write. Tighten post-grand-final.
drop policy if exists anon_all_sessions on scoping_sessions;
create policy anon_all_sessions
  on scoping_sessions for all
  to anon
  using (true) with check (true);

drop policy if exists anon_all_messages on scoping_messages;
create policy anon_all_messages
  on scoping_messages for all
  to anon
  using (true) with check (true);
