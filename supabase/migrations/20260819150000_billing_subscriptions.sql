-- Server-side record of Clerk Billing subscriptions, populated by the
-- /api/webhooks/clerk billing webhook handler. Clerk's session claims (has({ plan })) remain
-- the source of truth for access control; this table exists for admin visibility, cost/usage
-- attribution and anything that needs subscription history Clerk itself doesn't expose.
create table if not exists public.billing_subscriptions (
  subscription_id text primary key,
  user_id text not null,
  plan_slug text,
  status text not null,
  payer_email text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id, updated_at desc);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "users can read their own subscriptions" on public.billing_subscriptions;
create policy "users can read their own subscriptions"
  on public.billing_subscriptions for select
  using ((auth.jwt() ->> 'sub') = user_id);

-- No insert/update/delete policy: only the service-role key (used by the webhook handler
-- and other server-only code via getSupabaseAdmin()) may write to this table.
