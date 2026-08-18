create table if not exists public.venture_memberships (
  owner_user_id text not null,
  venture_id text not null,
  user_id text not null,
  email text not null default '',
  name text,
  role text not null check (role in ('owner', 'cofounder', 'member', 'advisor', 'external')),
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  can_join_standup boolean not null default true,
  can_edit_board boolean not null default false,
  can_assign_cards boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, venture_id, user_id)
);

create table if not exists public.venture_invitations (
  id text primary key,
  owner_user_id text not null,
  venture_id text not null,
  invited_by_user_id text not null,
  email text not null,
  name text,
  role text not null check (role in ('cofounder', 'member', 'advisor', 'external')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired', 'failed')),
  can_join_standup boolean not null default true,
  can_edit_board boolean not null default false,
  can_assign_cards boolean not null default false,
  token_hash text not null,
  resend_email_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by_user_id text
);

create index if not exists venture_memberships_user_idx
  on public.venture_memberships (user_id, status, updated_at desc);
create index if not exists venture_memberships_venture_idx
  on public.venture_memberships (owner_user_id, venture_id, status);
create unique index if not exists venture_invitations_pending_email_idx
  on public.venture_invitations (owner_user_id, venture_id, lower(email))
  where status = 'pending';
create index if not exists venture_invitations_venture_idx
  on public.venture_invitations (owner_user_id, venture_id, created_at desc);

insert into public.venture_memberships (
  owner_user_id, venture_id, user_id, role, status,
  can_join_standup, can_edit_board, can_assign_cards
)
select user_id, venture_id, user_id, 'owner', 'active', true, true, true
from public.founder_ventures
on conflict (owner_user_id, venture_id, user_id) do nothing;

alter table public.venture_memberships enable row level security;
alter table public.venture_invitations enable row level security;

drop policy if exists "members can read venture memberships" on public.venture_memberships;
create policy "members can read venture memberships"
  on public.venture_memberships for select
  using (
    (auth.jwt() ->> 'sub') = user_id
    or (auth.jwt() ->> 'sub') = owner_user_id
  );

drop policy if exists "invite recipients and owners can read invitations" on public.venture_invitations;
create policy "invite recipients and owners can read invitations"
  on public.venture_invitations for select
  using ((auth.jwt() ->> 'sub') = owner_user_id or (auth.jwt() ->> 'sub') = invited_by_user_id);

