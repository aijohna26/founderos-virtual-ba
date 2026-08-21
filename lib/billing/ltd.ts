import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface LtdOfferPublicState {
  offerId: string;
  releaseNumber: number;
  priceCents: number;
  currency: string;
  quantityTotal: number;
  quantitySold: number;
  status: "active" | "sold_out" | "closed";
}

export interface LtdPurchaseRecord {
  stripePaymentIntentId: string;
  userId: string;
  offerId: string;
  foundingMemberNumber: number;
  amountPaidCents: number;
  currency: string;
  payerEmail: string | null;
  /**
   * Subscriber -> Lifetime conversion bookkeeping (see lib/billing/subscriptionConversion.ts).
   * previousPlanSlug/previousSubscriptionId/subscriptionCancelledAt are null when this member
   * had no active Clerk Billing subscription at purchase time -- most purchases, since LTD
   * buyers are usually new, not converting subscribers.
   */
  previousPlanSlug: string | null;
  previousSubscriptionId: string | null;
  subscriptionCancelledAt: string | null;
}

export interface LtdOfferAdminRow extends LtdOfferPublicState {
  createdAt: string;
}

function toPurchaseRecord(row: Record<string, unknown>): LtdPurchaseRecord {
  return {
    stripePaymentIntentId: String(row.stripe_payment_intent_id),
    userId: String(row.user_id),
    offerId: String(row.offer_id),
    foundingMemberNumber: Number(row.founding_member_number),
    amountPaidCents: Number(row.amount_paid_cents),
    currency: String(row.currency),
    payerEmail: row.payer_email ? String(row.payer_email) : null,
    previousPlanSlug: row.previous_plan_slug ? String(row.previous_plan_slug) : null,
    previousSubscriptionId: row.previous_subscription_id ? String(row.previous_subscription_id) : null,
    subscriptionCancelledAt: row.subscription_cancelled_at ? String(row.subscription_cancelled_at) : null,
  };
}

function toOfferState(data: Record<string, unknown>): LtdOfferPublicState {
  return {
    offerId: String(data.offer_id),
    releaseNumber: Number(data.release_number),
    priceCents: Number(data.price_cents),
    currency: String(data.currency),
    quantityTotal: Number(data.quantity_total),
    quantitySold: Number(data.quantity_sold),
    status: data.status as LtdOfferPublicState["status"],
  };
}

/** The one offer buyers can currently check out against, or null if none is active. */
export async function getActiveLtdOffer(): Promise<LtdOfferPublicState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("ltd_offers")
    .select("offer_id, release_number, price_cents, currency, quantity_total, quantity_sold, status")
    .eq("status", "active")
    .order("release_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return toOfferState(data);
}

export async function getLtdOfferById(offerId: string): Promise<LtdOfferPublicState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("ltd_offers")
    .select("offer_id, release_number, price_cents, currency, quantity_total, quantity_sold, status")
    .eq("offer_id", offerId)
    .maybeSingle();

  if (error || !data) return null;
  return toOfferState(data);
}

/**
 * Atomically claims one membership slot and records the purchase. Idempotent on
 * stripePaymentIntentId. Throws "offer_unavailable" if the offer is inactive/sold out by the
 * time this runs -- the caller (the Stripe webhook handler) is responsible for refunding the
 * payment in that case, since Stripe will already have taken the money.
 */
export async function claimLtdOfferSlot(params: {
  stripePaymentIntentId: string;
  userId: string;
  offerId: string;
  amountPaidCents: number;
  currency: string;
  payerEmail: string | null;
}): Promise<LtdPurchaseRecord> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const { data, error } = await admin.rpc("claim_ltd_offer_slot", {
    p_stripe_payment_intent_id: params.stripePaymentIntentId,
    p_user_id: params.userId,
    p_offer_id: params.offerId,
    p_amount_paid_cents: params.amountPaidCents,
    p_currency: params.currency,
    p_payer_email: params.payerEmail,
  });

  if (error) {
    if (error.message?.includes("offer_unavailable")) {
      throw new Error("offer_unavailable");
    }
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return toPurchaseRecord(row);
}

/**
 * Atomically claims the right to run this purchase's subscriber->Lifetime conversion (see
 * lib/billing/subscriptionConversion.ts): a single conditional UPDATE ... WHERE
 * conversion_claimed_at IS NULL, so under webhook redelivery only the first caller gets
 * `true` back. Callers that get `false` must skip conversion entirely -- it was already
 * handled (or is being handled right now) by an earlier delivery.
 */
export async function claimLtdConversionSlot(stripePaymentIntentId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from("ltd_purchases")
    .update({ conversion_claimed_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", stripePaymentIntentId)
    .is("conversion_claimed_at", null)
    .select("stripe_payment_intent_id")
    .maybeSingle();

  if (error) {
    console.error("Failed to claim LTD conversion slot:", error);
    return false;
  }
  return Boolean(data);
}

/**
 * Records what claimLtdConversionSlot's winner actually found/did. Fields are null when the
 * member had no active Clerk Billing subscription to convert from.
 */
export async function recordLtdConversion(params: {
  stripePaymentIntentId: string;
  previousPlanSlug: string | null;
  previousSubscriptionId: string | null;
  subscriptionCancelledAt: string | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin
    .from("ltd_purchases")
    .update({
      previous_plan_slug: params.previousPlanSlug,
      previous_subscription_id: params.previousSubscriptionId,
      subscription_cancelled_at: params.subscriptionCancelledAt,
    })
    .eq("stripe_payment_intent_id", params.stripePaymentIntentId);

  if (error) {
    console.error("Failed to record LTD conversion result:", error);
  }
}

/**
 * A user's own Lifetime purchase, if any -- safe to call from any authenticated route since
 * it's scoped to the caller-supplied userId (unlike the admin-only listing functions below).
 * At most one row per user_id is actually possible now (see the ltd_purchases_user_unique_idx
 * migration and claim_ltd_offer_slot's up-front check), but this still orders by
 * founding-member number ascending and takes the first as defense in depth, in case any row
 * created before that constraint existed ever left a user with more than one.
 */
export async function getUserLtdPurchase(userId: string): Promise<LtdPurchaseRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("ltd_purchases")
    .select(
      "stripe_payment_intent_id, user_id, offer_id, founding_member_number, amount_paid_cents, currency, payer_email, previous_plan_slug, previous_subscription_id, subscription_cancelled_at"
    )
    .eq("user_id", userId)
    .order("founding_member_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return toPurchaseRecord(data);
}

// --- Admin-only below: callers must gate these behind lib/admin/auth.ts themselves; nothing
// here checks who's asking, same trust boundary as the rest of this file (server-only,
// service-role Supabase access).

export async function listLtdOffers(): Promise<LtdOfferAdminRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("ltd_offers")
    .select("offer_id, release_number, price_cents, currency, quantity_total, quantity_sold, status, created_at")
    .order("release_number", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({ ...toOfferState(row), createdAt: String(row.created_at) }));
}

export async function listLtdPurchases(offerId?: string): Promise<LtdPurchaseRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  let query = admin
    .from("ltd_purchases")
    .select(
      "stripe_payment_intent_id, user_id, offer_id, founding_member_number, amount_paid_cents, currency, payer_email, previous_plan_slug, previous_subscription_id, subscription_cancelled_at"
    )
    .order("founding_member_number", { ascending: false });
  if (offerId) query = query.eq("offer_id", offerId);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(toPurchaseRecord);
}

/**
 * Creates a new release, always inactive (status 'closed'). Per the task doc ("Do not
 * automatically open the next LTD cohort"), creating a release must never make it live --
 * activateLtdOffer() is a separate, deliberate step.
 */
export async function createLtdOffer(params: {
  offerId: string;
  releaseNumber: number;
  priceCents: number;
  quantityTotal: number;
  currency?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured" };

  const { error } = await admin.from("ltd_offers").insert({
    offer_id: params.offerId,
    release_number: params.releaseNumber,
    price_cents: params.priceCents,
    quantity_total: params.quantityTotal,
    currency: params.currency ?? "usd",
    status: "closed",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Activates one offer, atomically closing whatever else was active (RPC enforces this). */
export async function activateLtdOffer(offerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured" };

  const { error } = await admin.rpc("activate_ltd_offer", { p_offer_id: offerId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function closeLtdOffer(offerId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured" };

  const { error } = await admin.rpc("close_ltd_offer", { p_offer_id: offerId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
