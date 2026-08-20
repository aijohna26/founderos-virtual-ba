import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  DEFAULT_LIVE_ALLOWANCE_MINUTES,
  LIVE_MINUTES_BY_PLAN,
  MAX_LIVE_SESSION_MINUTES,
} from "@/lib/config/liveUsageConfig";

export interface LiveAllowance {
  planSlug: string;
  allowanceMinutes: number;
}

/**
 * Resolves which plan grants this user's Live Voice allowance. Checks Lifetime (LTD) first
 * since a lifetime purchase isn't a Clerk Billing plan and would never show up in has().
 */
export async function resolveLiveAllowance(
  userId: string,
  has: (params: { plan: string }) => boolean,
): Promise<LiveAllowance> {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin
      .from("ltd_purchases")
      .select("stripe_payment_intent_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (data) return { planSlug: "lifetime", allowanceMinutes: LIVE_MINUTES_BY_PLAN.lifetime };
  }

  for (const planSlug of Object.keys(LIVE_MINUTES_BY_PLAN)) {
    if (planSlug !== "lifetime" && has({ plan: planSlug })) {
      return { planSlug, allowanceMinutes: LIVE_MINUTES_BY_PLAN[planSlug] };
    }
  }

  return { planSlug: "free_user", allowanceMinutes: LIVE_MINUTES_BY_PLAN.free_user ?? DEFAULT_LIVE_ALLOWANCE_MINUTES };
}

/** Calendar-month reset, UTC. No rollover, per the doc. */
export function getCurrentPeriodStart(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Server-authoritative minutes used this period. Returns null (distinct from 0) when usage
 * can't actually be verified -- Supabase not configured, or the query itself fails (e.g. the
 * live_usage_sessions migration hasn't been applied yet) -- so the caller can fail closed
 * instead of silently treating "couldn't check" as "hasn't used anything."
 */
export async function getUsedMinutesThisPeriod(userId: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const periodStart = getCurrentPeriodStart();
  const { data, error } = await admin
    .from("live_usage_sessions")
    .select("started_at, ended_at")
    .eq("user_id", userId)
    .gte("started_at", periodStart);

  if (error) {
    console.error("Failed to read live usage sessions:", error);
    return null;
  }

  const now = Date.now();
  let totalMs = 0;
  for (const row of data ?? []) {
    const startedAt = Date.parse(String(row.started_at));
    if (!Number.isFinite(startedAt)) continue;
    // A session with no ended_at is still "active" (or its end call never arrived) -- bound
    // it at MAX_LIVE_SESSION_MINUTES rather than counting it as running indefinitely. The
    // Gemini ephemeral token this session was issued (see app/api/live-session) itself
    // expires at that same limit, so this is a real ceiling, not a guess.
    const cappedEnd = startedAt + MAX_LIVE_SESSION_MINUTES * 60 * 1000;
    const endedAt = row.ended_at ? Date.parse(String(row.ended_at)) : now;
    const boundedEnd = Math.min(endedAt, cappedEnd);
    totalMs += Math.max(0, boundedEnd - startedAt);
  }
  return totalMs / 60000;
}

/** Returns the new session's id, or null if it couldn't be recorded (metering unavailable). */
export async function createLiveUsageSession(params: {
  userId: string;
  ventureId: string;
  planSlug: string;
  model: string;
}): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await admin.from("live_usage_sessions").insert({
    id,
    user_id: params.userId,
    venture_id: params.ventureId,
    plan_slug: params.planSlug,
    model: params.model,
    started_at: new Date().toISOString(),
    status: "active",
  });

  if (error) {
    console.error("Failed to create live usage session:", error);
    return null;
  }
  return id;
}

/** Idempotent -- the `status = 'active'` guard means a repeat call (e.g. both a normal
 * disconnect and a pagehide beacon firing) is a harmless no-op on the second call. */
export async function endLiveUsageSession(sessionId: string, userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { error } = await admin
    .from("live_usage_sessions")
    .update({ ended_at: new Date().toISOString(), status: "ended" })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) console.error("Failed to end live usage session:", error);
}
