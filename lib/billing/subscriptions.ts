import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface BillingSubscriptionRecord {
  subscriptionId: string;
  userId: string;
  planSlug: string | null;
  status: string;
  payerEmail: string | null;
  rawEvent?: unknown;
}

/**
 * Upserts a subscription row from a verified Clerk billing webhook event.
 * Safe to call repeatedly with the same subscriptionId (webhook replays, out-of-order
 * delivery) — it always overwrites with the latest known state.
 *
 * No-ops (does not throw) when Supabase isn't configured, since the webhook still needs to
 * return 200 quickly to Clerk regardless of whether local persistence is set up yet.
 */
export async function upsertBillingSubscription(record: BillingSubscriptionRecord): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn("Billing webhook received but SUPABASE_SECRET_KEY is not configured; skipping persistence.");
    return;
  }

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      subscription_id: record.subscriptionId,
      user_id: record.userId,
      plan_slug: record.planSlug,
      status: record.status,
      payer_email: record.payerEmail,
      raw_event: record.rawEvent ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "subscription_id" }
  );

  if (error) {
    console.error("Failed to upsert billing subscription:", error);
  }
}

export async function getUserSubscriptions(userId: string): Promise<BillingSubscriptionRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("subscription_id, user_id, plan_slug, status, payer_email")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    subscriptionId: String(row.subscription_id),
    userId: String(row.user_id),
    planSlug: row.plan_slug ? String(row.plan_slug) : null,
    status: String(row.status),
    payerEmail: row.payer_email ? String(row.payer_email) : null,
  }));
}
