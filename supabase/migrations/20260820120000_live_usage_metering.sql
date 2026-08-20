-- Server-authoritative Live Voice usage ledger (docs/founderally-next-implementation-todo.md
-- P0 #1-#3). started_at/ended_at are always server-set timestamps -- the client never
-- reports its own duration, so this can't be gamed by a modified/compromised browser.
create table if not exists public.live_usage_sessions (
  id text primary key,
  user_id text not null,
  venture_id text not null,
  plan_slug text not null,
  model text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);

-- Drives both "sum this user's usage this period" (allowance enforcement) and the future
-- usage-visibility screen (task #11).
create index if not exists live_usage_sessions_user_period_idx
  on public.live_usage_sessions (user_id, started_at desc);

alter table public.live_usage_sessions enable row level security;

drop policy if exists "users can read their own live usage" on public.live_usage_sessions;
create policy "users can read their own live usage"
  on public.live_usage_sessions for select
  using ((auth.jwt() ->> 'sub') = user_id);

-- No insert/update/delete policy: only the service-role key (getSupabaseAdmin(), used by
-- app/api/live-session and app/api/live-session/end) may write to this table.
