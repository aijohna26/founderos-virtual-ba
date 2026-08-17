create table if not exists public.founder_commitments (
  id text not null,
  user_id text not null,
  venture_id text not null,
  commitment text not null,
  deadline text,
  status text not null check (status in ('pending', 'completed', 'missed')),
  related_ticket_id text,
  source text not null check (source in ('daily_standup', 'retrospective', 'ad_hoc')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (id, user_id)
);

create table if not exists public.founder_learnings (
  id text not null,
  user_id text not null,
  venture_id text not null,
  pattern text not null,
  evidence text not null,
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  suggested_coaching_behavior text not null,
  date_detected timestamptz not null default now(),
  relevant_sprint_id integer,
  primary key (id, user_id)
);

create table if not exists public.venture_memories (
  id text not null,
  user_id text not null,
  venture_id text not null,
  category text not null check (category in ('Customer', 'Market', 'Pricing', 'Problem', 'Product', 'Constraint', 'Decision')),
  fact text not null,
  source text not null check (source in ('interview', 'founder', 'ai_inference', 'experiment', 'decision')),
  confidence text not null check (confidence in ('High', 'Medium', 'Low')),
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.ai_operation_logs (
  id text not null,
  user_id text not null,
  venture_id text not null,
  ceremony text not null,
  gemini_model text not null,
  tool_requested text not null,
  tool_arguments jsonb not null default '{}'::jsonb,
  tool_result jsonb not null default '{}'::jsonb,
  reasoning_category text not null,
  latency_ms integer not null check (latency_ms >= 0),
  success boolean not null,
  created_at timestamptz not null default now(),
  primary key (id, user_id)
);

-- Remove the old demo-only records if they were ever copied into production.
delete from public.founder_learnings
where id = 'lp-1'
  and pattern = 'Founder tends to focus on polish & secondary settings before completing customer interviews.';

delete from public.venture_memories
where (id = 'm-1' and fact = 'Primary ICP: Solo founders and boutique software builders who need structured BA guidance.')
   or (id = 'm-2' and fact = 'Target pricing: $29/mo for Founder Pro tier with 20% annual discount.');

create index if not exists founder_commitments_owner_venture_idx on public.founder_commitments (user_id, venture_id, created_at desc);
create index if not exists founder_learnings_owner_venture_idx on public.founder_learnings (user_id, venture_id, date_detected desc);
create index if not exists venture_memories_owner_venture_idx on public.venture_memories (user_id, venture_id, created_at desc);
create index if not exists ai_operation_logs_owner_venture_idx on public.ai_operation_logs (user_id, venture_id, created_at desc);

alter table public.founder_commitments enable row level security;
alter table public.founder_learnings enable row level security;
alter table public.venture_memories enable row level security;
alter table public.ai_operation_logs enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['founder_commitments', 'founder_learnings', 'venture_memories', 'ai_operation_logs']
  loop
    execute format('drop policy if exists "owner can select" on public.%I', table_name);
    execute format('drop policy if exists "owner can insert" on public.%I', table_name);
    execute format('drop policy if exists "owner can update" on public.%I', table_name);
    execute format('drop policy if exists "owner can delete" on public.%I', table_name);
    execute format('create policy "owner can select" on public.%I for select using ((auth.jwt() ->> ''sub'') = user_id)', table_name);
    execute format('create policy "owner can insert" on public.%I for insert with check ((auth.jwt() ->> ''sub'') = user_id)', table_name);
    execute format('create policy "owner can update" on public.%I for update using ((auth.jwt() ->> ''sub'') = user_id) with check ((auth.jwt() ->> ''sub'') = user_id)', table_name);
    execute format('create policy "owner can delete" on public.%I for delete using ((auth.jwt() ->> ''sub'') = user_id)', table_name);
  end loop;
end $$;
