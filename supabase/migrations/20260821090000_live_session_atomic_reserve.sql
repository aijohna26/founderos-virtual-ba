-- Closes a real race in the original P0 #1-3 metering work: getUsedMinutesThisPeriod() (read)
-- and createLiveUsageSession() (write) were two separate round trips, so two near-simultaneous
-- requests (e.g. the same user open in two browser tabs) could both read "under allowance"
-- before either had written a row, letting both through even with only a few minutes left.

-- Layer 1: make two concurrent active sessions for the same user structurally impossible,
-- regardless of allowance timing -- a user only has one mouth, they don't need two
-- simultaneous Live calls anyway. Same "at most one matching row" partial-unique-index
-- trick already used for ltd_offers_single_active_idx.
create unique index if not exists live_usage_sessions_single_active_idx
  on public.live_usage_sessions ((user_id))
  where status = 'active';

-- Layer 2: the allowance check itself becomes atomic. FOR UPDATE on this user's existing
-- rows in the period serializes concurrent reservation attempts against each other (the
-- second call blocks until the first commits its insert, then re-reads the now-current sum)
-- rather than each computing "used minutes" from an independently stale read.
create or replace function public.reserve_live_session(
  p_id text,
  p_user_id text,
  p_venture_id text,
  p_plan_slug text,
  p_model text,
  p_allowance_minutes numeric,
  p_period_start timestamptz,
  p_max_session_minutes numeric
) returns public.live_usage_sessions
language plpgsql
as $$
declare
  v_used_minutes numeric;
  v_row public.live_usage_sessions;
begin
  perform 1 from public.live_usage_sessions
    where user_id = p_user_id and started_at >= p_period_start
    for update;

  select coalesce(sum(
    extract(epoch from (
      least(coalesce(ended_at, now()), started_at + (p_max_session_minutes || ' minutes')::interval) - started_at
    )) / 60
  ), 0)
  into v_used_minutes
  from public.live_usage_sessions
  where user_id = p_user_id and started_at >= p_period_start;

  if v_used_minutes >= p_allowance_minutes then
    raise exception 'allowance_exhausted' using errcode = 'P0001';
  end if;

  insert into public.live_usage_sessions (id, user_id, venture_id, plan_slug, model, started_at, status)
  values (p_id, p_user_id, p_venture_id, p_plan_slug, p_model, now(), 'active')
  returning * into v_row;

  return v_row;
end;
$$;
