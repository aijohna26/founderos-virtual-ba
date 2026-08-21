import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { claimLtdConversionSlot, recordLtdConversion } from "@/lib/billing/ltd";

// Subscription-item statuses that still represent live billing -- anything else (canceled/
// ended/expired/abandoned) is already inert and needs no action from us.
const CANCELABLE_STATUSES = new Set(["active", "past_due", "upcoming", "incomplete"]);

/**
 * Subscriber -> Lifetime conversion (Immediate Implementation Order #1). Call this *after*
 * claimLtdOfferSlot has already recorded the ltd_purchases row -- isLifetime is derived
 * purely from that row existing (see getUserLtdPurchase/resolveLiveAllowance), so Lifetime
 * access is already unconditional and immediate by the time this runs. This function only
 * ever removes a now-redundant recurring subscription; it never touches access, so it's safe
 * to let it fail (logged, not thrown) without undoing the grant above.
 *
 * Idempotent under Stripe webhook redelivery: claimLtdConversionSlot's atomic claim ensures
 * only one delivery ever calls Clerk Billing's cancel API for a given purchase, even if two
 * deliveries of the same checkout.session.completed event are processed concurrently.
 */
export async function convertSubscriberToLifetime(userId: string, stripePaymentIntentId: string): Promise<void> {
  const wonClaim = await claimLtdConversionSlot(stripePaymentIntentId);
  if (!wonClaim) return; // Another delivery of this webhook already handled conversion.

  let previousPlanSlug: string | null = null;
  let previousSubscriptionId: string | null = null;
  let subscriptionCancelledAt: string | null = null;

  try {
    const client = await clerkClient();
    const subscription = await client.billing.getUserBillingSubscription(userId);
    const activeItems = subscription.subscriptionItems.filter((item) => CANCELABLE_STATUSES.has(item.status));

    for (const item of activeItems) {
      // endNow: false -- schedule cancellation at the end of the current billing period
      // rather than cutting it off immediately. Lifetime access is already granted either
      // way, so there's no access gap either way; scheduling instead of an immediate cancel
      // avoids needing to reason about mid-cycle refunds/proration for time already paid for,
      // and still satisfies "prevent future recurring charges" since it will never renew.
      await client.billing.cancelSubscriptionItem(item.id, { endNow: false });
      previousPlanSlug = item.plan?.slug ?? previousPlanSlug;
    }

    if (activeItems.length > 0) {
      previousSubscriptionId = subscription.id;
      subscriptionCancelledAt = new Date().toISOString();
    }
  } catch (err) {
    // getUserBillingSubscription throws when the payer has no Clerk Billing subscription at
    // all -- by far the common case, since most LTD buyers are new rather than converting
    // subscribers. Anything else (a real Clerk API failure) is logged for manual follow-up:
    // the conversion claim above is permanent (never retried), so a failure here means the
    // subscription may still be live and needs an admin to check/cancel it by hand.
    console.error("Subscriber->Lifetime conversion: failed to check/cancel Clerk Billing subscription", {
      userId,
      stripePaymentIntentId,
      err,
    });
  }

  await recordLtdConversion({
    stripePaymentIntentId,
    previousPlanSlug,
    previousSubscriptionId,
    subscriptionCancelledAt,
  });
}
