import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// Raw Stripe, separate from Clerk Billing. Clerk Billing only supports recurring
// subscriptions, so the Lifetime Deal (a capped, one-time payment) goes through this
// direct Stripe integration instead -- same Stripe account you already connected to Clerk,
// but its own API key and its own webhook (see /api/webhooks/stripe), independent of the
// Clerk Billing webhook that only ever fires for subscription events.
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
