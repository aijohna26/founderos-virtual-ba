-- Admin controls for LTD offers (task: "Build LTD admin controls" / "Require confirmation
-- before changing an active LTD offer" -- the confirmation itself lives in the admin UI;
-- these functions are what make "at most one active offer" an actual guarantee rather than
-- just an app-level convention.

-- Defense in depth: even if the app-level activate logic has a bug, or two activate calls
-- race, Postgres itself refuses a second row with status = 'active'. Indexing a constant
-- expression restricted by a partial WHERE is the standard "at most one matching row" trick.
create unique index if not exists ltd_offers_single_active_idx
  on public.ltd_offers ((1))
  where status = 'active';

create or replace function public.activate_ltd_offer(p_offer_id text)
returns public.ltd_offers
language plpgsql
as $$
declare
  v_target public.ltd_offers;
  v_result public.ltd_offers;
begin
  select * into v_target from public.ltd_offers where offer_id = p_offer_id;
  if not found then
    raise exception 'offer_not_found';
  end if;
  if v_target.quantity_sold >= v_target.quantity_total then
    raise exception 'offer_already_full';
  end if;

  -- Deactivate whatever else is currently active first so the partial unique index above
  -- never sees two active rows at once, even momentarily within this transaction.
  update public.ltd_offers
    set status = 'closed', updated_at = now()
    where status = 'active' and offer_id != p_offer_id;

  update public.ltd_offers
    set status = 'active', updated_at = now()
    where offer_id = p_offer_id
    returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.close_ltd_offer(p_offer_id text)
returns public.ltd_offers
language plpgsql
as $$
declare
  v_result public.ltd_offers;
begin
  update public.ltd_offers
    set status = 'closed', updated_at = now()
    where offer_id = p_offer_id and status = 'active'
    returning * into v_result;

  if not found then
    raise exception 'offer_not_active';
  end if;

  return v_result;
end;
$$;
