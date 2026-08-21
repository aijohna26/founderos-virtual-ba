-- Subscriber -> Lifetime conversion (Immediate Implementation Order #1): when someone who
-- already has an active Clerk Billing subscription (solo_founder/venture_pro) buys the
-- Lifetime Deal, /api/webhooks/stripe cancels that subscription (via
-- lib/billing/subscriptionConversion.ts) so it never renews, and records what they converted
-- from here for Usage/Account display and admin visibility.
--
-- conversion_claimed_at is the idempotency guard for that side-effect: unlike
-- claim_ltd_offer_slot (which is naturally idempotent -- a redelivered webhook just re-reads
-- the existing row), cancelling a subscription is a call to an external system, so a plain
-- "if no previous_subscription_id yet, cancel" check would call Clerk Billing's cancel API a
-- second time on webhook replay. Application code claims the right to run the conversion with
-- a single conditional UPDATE ... WHERE conversion_claimed_at IS NULL (see
-- claimLtdConversionSlot in lib/billing/ltd.ts) before ever calling Clerk, so only the
-- delivery that wins the race performs it.
alter table public.ltd_purchases
  add column if not exists conversion_claimed_at timestamptz,
  add column if not exists previous_plan_slug text,
  add column if not exists previous_subscription_id text,
  add column if not exists subscription_cancelled_at timestamptz;
