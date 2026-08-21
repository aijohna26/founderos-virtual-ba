-- Closes a real gap flagged in review: nothing previously stopped a user from buying the
-- Lifetime Deal twice (two separate Stripe payment_intents, each perfectly valid on its own,
-- each claiming its own founding_member_number and its own inventory slot). getUserLtdPurchase
-- was already documented as silently returning just "the earliest" purchase, which papered
-- over the bug rather than preventing it. Fixed at two layers, same as every other "at most
-- one" constraint in this app (ltd_offers_single_active_idx, live_usage_sessions_single_active_idx):
-- an application-level guard in app/api/checkout/ltd/route.ts for the common case, and this
-- unique index as the actual race-proof guarantee underneath it.

create unique index if not exists ltd_purchases_user_unique_idx
  on public.ltd_purchases (user_id);

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

  -- Reject a second membership for the same user up front -- cheap, and covers the common
  -- (non-concurrent) case. Not itself race-proof against two near-simultaneous payments for
  -- the same account (this SELECT can't see a not-yet-committed concurrent transaction); the
  -- unique index is what actually closes that gap, caught in the exception block below.
  if exists (select 1 from public.ltd_purchases where user_id = p_user_id) then
    raise exception 'already_lifetime_member' using errcode = 'P0001';
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

  begin
    insert into public.ltd_purchases (
      stripe_payment_intent_id, user_id, offer_id, founding_member_number,
      amount_paid_cents, currency, payer_email
    ) values (
      p_stripe_payment_intent_id, p_user_id, p_offer_id, v_membership_number,
      p_amount_paid_cents, p_currency, p_payer_email
    ) returning * into v_purchase;
  exception when unique_violation then
    -- Two constraints could raise this: a genuinely concurrent redelivery of this exact
    -- payment_intent_id (the plain select-then-insert above can't rule that out under a tight
    -- enough race), or the new one-per-user_id guarantee catching a second concurrent payment
    -- for the same account. Re-check which: if the other transaction's row is now visible
    -- under this payment_intent_id, this was just a redelivery -- return it, same as the
    -- idempotency check up top. Otherwise it's the user_id constraint; give back the
    -- inventory slot we just reserved (nobody actually ends up with it) and surface the error
    -- the webhook already knows how to refund.
    select * into v_existing from public.ltd_purchases
      where stripe_payment_intent_id = p_stripe_payment_intent_id;
    if found then
      return v_existing;
    end if;

    update public.ltd_offers
      set quantity_sold = quantity_sold - 1,
          status = case when status = 'sold_out' then 'active' else status end,
          updated_at = now()
      where offer_id = p_offer_id;
    raise exception 'already_lifetime_member' using errcode = 'P0001';
  end;

  return v_purchase;
end;
$$;
