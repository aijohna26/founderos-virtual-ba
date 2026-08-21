import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { getActiveLtdOffer, getUserLtdPurchase } from "@/lib/billing/ltd";

// Starts a one-time Stripe Checkout for the currently active Lifetime Deal offer. Protected
// by proxy.ts (not in the public route list) and by the auth() check below, matching the
// other server-only-writes routes in this app.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Lifetime Deal checkout is not configured", code: "STRIPE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  // Blocks the common (non-concurrent) case of a founder paying for Lifetime twice -- the
  // real race-proof guarantee is the unique index on ltd_purchases.user_id underneath this
  // (see the 20260821100000 migration), which the webhook refunds against if this check is
  // ever raced by two simultaneous checkout attempts.
  const existingPurchase = await getUserLtdPurchase(userId);
  if (existingPurchase) {
    return NextResponse.json(
      { error: "You already have a Lifetime membership -- no need to purchase again.", code: "ALREADY_LIFETIME_MEMBER" },
      { status: 409 },
    );
  }

  const offer = await getActiveLtdOffer();
  if (!offer) {
    return NextResponse.json({ error: "No active Lifetime Deal offer" }, { status: 404 });
  }
  if (offer.status !== "active" || offer.quantitySold >= offer.quantityTotal) {
    return NextResponse.json({ error: "This Lifetime Deal offer is sold out" }, { status: 409 });
  }

  let payerEmail: string | undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    payerEmail = user.primaryEmailAddress?.emailAddress;
  } catch {
    // Non-fatal -- Stripe Checkout collects an email itself if we don't have one on file.
  }

  const origin = process.env.APP_URL || request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: payerEmail,
    line_items: [
      {
        price_data: {
          currency: offer.currency,
          unit_amount: offer.priceCents,
          product_data: {
            name: `FounderAlly Founding Lifetime Membership — Release ${offer.releaseNumber}`,
            description: "One-time payment. Lifetime access, no recurring billing.",
          },
        },
        quantity: 1,
      },
    ],
    // Read back by /api/webhooks/stripe to atomically claim a slot and assign a Founding
    // Member number -- this is the only place that link between the Stripe payment and the
    // Clerk user gets made, so it must survive to the webhook untouched.
    metadata: {
      offerId: offer.offerId,
      userId,
      releaseNumber: String(offer.releaseNumber),
    },
    success_url: `${origin}/account?ltd=success`,
    cancel_url: `${origin}/pricing?ltd=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
