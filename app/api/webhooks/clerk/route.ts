import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { upsertBillingSubscription } from "@/lib/billing/subscriptions";

// Clerk billing webhook. Made public in proxy.ts — Clerk signs each request with
// CLERK_WEBHOOK_SIGNING_SECRET instead of a session, and verifyWebhook() checks that
// signature below, so this route authenticates itself rather than relying on auth.protect().
//
// Register this endpoint in Clerk Dashboard -> Webhooks pointed at /api/webhooks/clerk and
// subscribe it to: subscription.created, subscription.updated, subscription.active,
// subscription.pastDue, subscriptionItem.canceled, subscriptionItem.pastDue.
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk billing webhook: signature verification failed", err);
    return new NextResponse("Verification failed", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.pastDue": {
        const { id, payer, items, status } = evt.data;
        const userId = payer?.user_id;
        // B2C only for now (payer.user_id). Organization subscriptions (payer.organization_id)
        // aren't wired up yet since this app doesn't offer org billing.
        if (!userId) break;
        const planSlug = items?.[0]?.plan?.slug ?? null;
        await upsertBillingSubscription({
          subscriptionId: id,
          userId,
          planSlug,
          status,
          payerEmail: payer?.email ?? null,
          rawEvent: evt.data,
        });
        break;
      }

      // Subscription item events carry only the item, not the parent subscription id, so
      // there's no record to key an upsert on yet without also tracking item ids. The
      // subscription.updated event that follows carries the same status change at the
      // subscription level, so it's the one that actually updates billing_subscriptions.
      case "subscriptionItem.canceled":
      case "subscriptionItem.pastDue":
        break;

      default:
        break;
    }
  } catch (err) {
    // Always return 200 once the signature is verified so Clerk doesn't retry-storm a
    // handler bug; log for investigation instead.
    console.error("Clerk billing webhook: handler error", err);
  }

  return new NextResponse("OK", { status: 200 });
}
