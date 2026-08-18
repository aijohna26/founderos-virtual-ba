create table if not exists public.founder_ventures (
  id text not null,
  user_id text not null,
  venture_id text not null,
  workspace jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

create table if not exists public.venture_documents (
  id text not null,
  user_id text not null,
  venture_id text not null,
  title text not null,
  category text not null check (category in ('Customer Interview', 'PRD', 'Market Research', 'Meeting Notes', 'Specification')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

create index if not exists founder_ventures_owner_idx on public.founder_ventures (user_id, updated_at desc);
create index if not exists venture_documents_owner_venture_idx on public.venture_documents (user_id, venture_id, updated_at desc);

alter table public.founder_ventures enable row level security;
alter table public.venture_documents enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['founder_ventures', 'venture_documents']
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
