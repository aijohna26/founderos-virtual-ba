-- AI cost ledger (docs/founderally-next-implementation-todo.md P0 #6): enough information to
-- calculate actual cost per customer, across text chat, Live Voice, TTS, and (in future)
-- document processing / background jobs.
create table if not exists public.ai_cost_ledger (
  id text primary key,
  user_id text,
  venture_id text,
  plan_slug text,
  session_id text,
  model text not null,
  interaction_type text not null check (
    interaction_type in ('text_chat', 'live_voice', 'tts', 'document_processing', 'background_job')
  ),
  input_tokens integer,
  output_tokens integer,
  live_input_minutes numeric,
  live_output_minutes numeric,
  session_duration_seconds numeric,
  document_processing_units numeric,
  estimated_cost_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_cost_ledger_user_idx
  on public.ai_cost_ledger (user_id, created_at desc);
create index if not exists ai_cost_ledger_venture_idx
  on public.ai_cost_ledger (venture_id, created_at desc);
create index if not exists ai_cost_ledger_created_idx
  on public.ai_cost_ledger (created_at desc);

alter table public.ai_cost_ledger enable row level security;

drop policy if exists "users can read their own ai cost entries" on public.ai_cost_ledger;
create policy "users can read their own ai cost entries"
  on public.ai_cost_ledger for select
  using ((auth.jwt() ->> 'sub') = user_id);

-- No insert/update/delete policy: only the service-role key (getSupabaseAdmin()) writes here.
-- The planned Cost Ops dashboard (P0 #7) reads this table with an admin-privileged query, not
-- through this user-scoped RLS policy.
