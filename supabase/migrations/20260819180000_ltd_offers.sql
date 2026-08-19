-- Lifetime Deal: a capped, one-time Stripe payment, deliberately separate from Clerk
-- Billing's subscription plans (solo_founder/venture_pro). See /api/checkout/ltd and
-- /api/webhooks/stripe.

create table if not exists public.ltd_offers (
  offer_id text primary key,
  release_number integer not null unique,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'usd',
  quantity_total integer not null check (quantity_total > 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  status text not null default 'active' check (status in ('active', 'sold_out', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Global Founding Member numbering: continuous across every release (#001-#100 from
-- release 1, #101-#200 from release 2, ...), never resets when a new offer's own
-- quantity_sold counter starts back at 0. A sequence is the right primitive here --
-- nextval() is atomic under concurrent access by construction.
create sequence if not exists public.ltd_founding_member_seq start 1;

create table if not exists public.ltd_purchases (
  -- Keyed by Stripe's payment_intent id so a redelivered webhook can never double-count.
  stripe_payment_intent_id text primary key,
  user_id text not null,
  offer_id text not null references public.ltd_offers (offer_id),
  founding_member_number integer not null unique,
  amount_paid_cents integer not null,
  currency text not null,
  payer_email text,
  created_at timestamptz not null default now()
);

create index if not exists ltd_purchases_user_idx on public.ltd_purchases (user_id);
create index if not exists ltd_purchases_offer_idx on public.ltd_purchases (offer_id);

alter table public.ltd_offers enable row level security;
alter table public.ltd_purchases enable row level security;

-- Offer price/availability is meant to be public (task: "Build LTD public pricing state"),
-- so anyone can read it -- there's nothing sensitive in this table.
drop policy if exists "anyone can read ltd offers" on public.ltd_offers;
create policy "anyone can read ltd offers"
  on public.ltd_offers for select
  using (true);

-- Purchases are the same trust model as billing_subscriptions: users can see their own,
-- everything else (including all writes) is service-role only via getSupabaseAdmin().
drop policy if exists "users can read their own ltd purchases" on public.ltd_purchases;
create policy "users can read their own ltd purchases"
  on public.ltd_purchases for select
  using ((auth.jwt() ->> 'sub') = user_id);

-- Atomically claims one slot on an active, non-full offer and records the purchase, or
-- raises 'offer_unavailable' if the offer is inactive/sold out/nonexistent by the time this
-- runs. The webhook handler must refund the Stripe payment when that happens -- the charge
-- already succeeded by the time this is called, so this function's only job is to guarantee
-- two concurrent callers can never both win the last slot; it can't prevent Stripe from having
-- already taken the money for a slot that turned out not to exist.
--
-- Idempotent on stripe_payment_intent_id: a redelivered webhook for an already-recorded
-- payment returns the existing row without claiming a second slot or membership number.
create or replace function public.claim_ltd_offer_slot(
  p_stripe_payment_intent_id text,
  p_user_id text,
  p_offer_id text,
  p_amount_paid_cents integer,
  p_currency text,
  p_payer_email text
) returns public.ltd_purchases
language plpgsql
as $$
declare
  v_existing public.ltd_purchases;
  v_offer public.ltd_offers;
  v_membership_number integer;
  v_purchase public.ltd_purchases;
begin
  select * into v_existing from public.ltd_purchases
    where stripe_payment_intent_id = p_stripe_payment_intent_id;
  if found then
    return v_existing;
  end if;

  -- Row-level lock via UPDATE is what makes this race-safe: two concurrent transactions
  -- both hitting this on the same offer serialize on the row, and whichever runs second
  -- re-evaluates quantity_sold < quantity_total against the *post-update* value, so it
  -- correctly fails once the offer is actually full instead of both succeeding.
  update public.ltd_offers
    set quantity_sold = quantity_sold + 1,
        status = case when quantity_sold + 1 >= quantity_total then 'sold_out' else status end,
        updated_at = now()
    where offer_id = p_offer_id
      and status = 'active'
      and quantity_sold < quantity_total
    returning * into v_offer;

  if not found then
    raise exception 'offer_unavailable' using errcode = 'P0001';
  end if;

  v_membership_number := nextval('public.ltd_founding_member_seq');

  insert into public.ltd_purchases (
    stripe_payment_intent_id, user_id, offer_id, founding_member_number,
    amount_paid_cents, currency, payer_email
  ) values (
    p_stripe_payment_intent_id, p_user_id, p_offer_id, v_membership_number,
    p_amount_paid_cents, p_currency, p_payer_email
  ) returning * into v_purchase;

  return v_purchase;
end;
$$;

-- First release: Founding 100 at $400, per docs/founderally-consolidated-task-list.md.
insert into public.ltd_offers (offer_id, release_number, price_cents, quantity_total, status)
values ('ltd-release-1', 1, 40000, 100, 'active')
on conflict (offer_id) do nothing;
