-- Closes a real gap flagged in review: nothing previously stopped a user from buying the
-- Lifetime Deal twice (two separate Stripe payment_intents, each perfectly valid on its own,
-- each claiming its own founding_member_number and its own inventory slot). getUserLtdPurchase
-- was already documented as silently returning just "the earliest" purchase, which papered
-- over the bug rather than preventing it. Fixed at two layers, same as every other "at most
-- one" constraint in this app (ltd_offers_single_active_idx, live_usage_sessions_single_active_idx):
-- an application-level guard in app/api/checkout/ltd/route.ts for the common case, and this
-- unique index as the actual race-proof guarantee underneath it.

do $$
declare
  v_duplicate_count integer;
begin
  select count(*) into v_duplicate_count from (
    select user_id from public.ltd_purchases group by user_id having count(*) > 1
  ) dupes;
  if v_duplicate_count > 0 then
    raise exception
      'ltd_purchases has % user_id(s) with more than one row -- resolve those manually (refund/merge) before this migration can create a unique index on user_id',
      v_duplicate_count;
  end if;
end $$;

create unique index if not exists ltd_purchases_user_unique_idx
  on public.ltd_purchases (user_id);

-- Serializes concurrent claims on the same payment_intent_id or the same user_id via
-- transaction-scoped advisory locks, acquired before any read or write -- rather than letting
-- two concurrent calls both proceed and reconcile the damage afterward. That "reconcile
-- afterward" version was tried first and had a real leak: if transaction B's own
-- quantity_sold increment happened before its insert lost a race against transaction A's
-- (already-committed) row, returning A's row as an idempotent replay left B's increment
-- unrefunded -- an LTD slot could vanish without ever being sold. Locking first means the
-- loser of any race blocks until the winner's whole transaction (including its insert) has
-- committed, then its own idempotency/membership checks below correctly see that outcome and
-- exit before ever touching ltd_offers.quantity_sold. Always locks payment_intent_id before
-- user_id (this is the only function that ever acquires these locks, always in this order),
-- so two concurrent calls can't deadlock against each other.
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
  perform pg_advisory_xact_lock(hashtext('ltd_payment_intent:' || p_stripe_payment_intent_id));
  perform pg_advisory_xact_lock(hashtext('ltd_user:' || p_user_id));

  select * into v_existing from public.ltd_purchases
    where stripe_payment_intent_id = p_stripe_payment_intent_id;
  if found then
    return v_existing;
  end if;

  if exists (select 1 from public.ltd_purchases where user_id = p_user_id) then
    raise exception 'already_lifetime_member' using errcode = 'P0001';
  end if;

  -- Row-level lock via UPDATE is what makes this race-safe against a *different* user
  -- claiming the last slot at the same time: two concurrent transactions both hitting this on
  -- the same offer serialize on the row, and whichever runs second re-evaluates
  -- quantity_sold < quantity_total against the post-update value, so it correctly fails once
  -- the offer is actually full instead of both succeeding. (The advisory locks above only
  -- serialize calls sharing a payment_intent_id or user_id, not every caller of this
  -- function, so this guard still matters.)
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
