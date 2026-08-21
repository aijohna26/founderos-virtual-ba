import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { claimLtdOfferSlot } from "@/lib/billing/ltd";

// Raw Stripe webhook for the one-time Lifetime Deal payment -- separate from
// /api/webhooks/clerk, which only ever carries Clerk Billing's recurring subscription events
// and knows nothing about this Stripe integration. Made public in proxy.ts (covered by the
// same "/api/webhooks(.*)" rule); Stripe signs each request with STRIPE_WEBHOOK_SECRET
// instead of a Clerk session, verified below.
//
// Register this endpoint in the Stripe Dashboard -> Developers -> Webhooks, pointed at
// /api/webhooks/stripe, subscribed to: checkout.session.completed.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook received but Stripe isn't configured (missing key/secret).");
    return new NextResponse("Not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook: signature verification failed", err);
    return new NextResponse("Verification failed", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const offerId = session.metadata?.offerId;
    const userId = session.metadata?.userId;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

    if (!offerId || !userId || !paymentIntentId) {
      console.error("Stripe webhook: checkout.session.completed missing offerId/userId/payment_intent", {
        sessionId: session.id,
      });
      return new NextResponse("OK", { status: 200 });
    }

    try {
      await claimLtdOfferSlot({
        stripePaymentIntentId: paymentIntentId,
        userId,
        offerId,
        amountPaidCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        payerEmail: session.customer_details?.email ?? null,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "offer_unavailable") {
        // The offer sold out (or was closed) between Checkout Session creation and this
        // payment completing -- Stripe already took the money for a slot that no longer
        // exists, so refund it immediately rather than silently keeping funds for a
        // membership nobody is getting.
        console.error("LTD offer unavailable at claim time -- refunding", {
          paymentIntentId,
          offerId,
          userId,
        });
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundErr) {
          console.error("LTD auto-refund failed -- needs manual refund", {
            paymentIntentId,
            refundErr,
          });
        }
      } else if (err instanceof Error && err.message === "already_lifetime_member") {
        // The founder already held a Lifetime membership by the time this payment
        // completed -- most likely /api/checkout/ltd's own pre-checkout guard was raced
        // (two tabs) or bypassed some other way. Either way, they've now paid a second time
        // for something they already have; refund it rather than silently keep the money.
        console.error("User already has a Lifetime membership -- refunding duplicate payment", {
          paymentIntentId,
          offerId,
          userId,
        });
        try {
          await stripe.refunds.create({ payment_intent: paymentIntentId });
        } catch (refundErr) {
          console.error("LTD duplicate-purchase auto-refund failed -- needs manual refund", {
            paymentIntentId,
            refundErr,
          });
        }
      } else {
        console.error("Stripe webhook: failed to claim LTD offer slot", err);
      }
    }
  }

  return new NextResponse("OK", { status: 200 });
}
