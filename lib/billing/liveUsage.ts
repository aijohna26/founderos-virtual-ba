import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  DEFAULT_LIVE_ALLOWANCE_MINUTES,
  LIVE_MINUTES_BY_PLAN,
  MAX_LIVE_SESSION_MINUTES,
} from "@/lib/config/liveUsageConfig";
import { recordLiveVoiceCost } from "@/lib/billing/aiCostLedger";

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

export type ReserveLiveSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: "allowance_exhausted" | "already_active" | "not_configured" };

/**
 * Atomically checks the allowance and creates the session row in one transaction (Postgres
 * function reserve_live_session), instead of a separate read-then-write. Two round trips let
 * two near-simultaneous requests (e.g. the same user open in two browser tabs) both read
 * "under allowance" before either had written a row -- letting both through even with only a
 * few minutes left. A partial unique index also makes two concurrent *active* sessions for
 * the same user structurally impossible regardless of the allowance math, which is what
 * actually surfaces as "already_active" here.
 */
export async function reserveLiveSession(params: {
  userId: string;
  ventureId: string;
  planSlug: string;
  allowanceMinutes: number;
  model: string;
}): Promise<ReserveLiveSessionResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, reason: "not_configured" };

  const id = `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin.rpc("reserve_live_session", {
    p_id: id,
    p_user_id: params.userId,
    p_venture_id: params.ventureId,
    p_plan_slug: params.planSlug,
    p_model: params.model,
    p_allowance_minutes: params.allowanceMinutes,
    p_period_start: getCurrentPeriodStart(),
    p_max_session_minutes: MAX_LIVE_SESSION_MINUTES,
  });

  if (error) {
    if (error.message?.includes("allowance_exhausted")) {
      return { ok: false, reason: "allowance_exhausted" };
    }
    if (error.code === "23505" || error.message?.toLowerCase().includes("duplicate key")) {
      return { ok: false, reason: "already_active" };
    }
    console.error("Failed to reserve live session:", error);
    return { ok: false, reason: "not_configured" };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return { ok: false, reason: "not_configured" };
  return { ok: true, sessionId: String(row.id) };
}

/**
 * Idempotent -- the `status = 'active'` guard means a repeat call (e.g. both a normal
 * disconnect and a pagehide beacon firing) is a harmless no-op on the second call.
 *
 * Also records this session's AI cost ledger entry (P0 #6), computed from the same
 * server-set started_at/ended_at pair that the allowance check itself trusts -- not
 * anything the client reports. Gemini Live is full-duplex (mic capture and audio playback
 * both effectively run for the whole call), so there's no clean way to split "input" from
 * "output" time without deeper per-turn analysis; this counts the full duration toward both,
 * which is a deliberate simplification, not a precise input/output breakdown.
 */
export async function endLiveUsageSession(sessionId: string, userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data, error } = await admin
    .from("live_usage_sessions")
    .update({ ended_at: new Date().toISOString(), status: "ended" })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "active")
    .select("started_at, ended_at, venture_id, plan_slug, model")
    .maybeSingle();

  if (error) {
    console.error("Failed to end live usage session:", error);
    return;
  }
  // maybeSingle() returns no row on the idempotent repeat-call case (already ended) -- fine,
  // the cost entry was already recorded the first time.
  if (!data) return;

  const startedAt = Date.parse(String(data.started_at));
  const endedAt = Date.parse(String(data.ended_at));
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return;

  const durationMinutes = Math.max(0, (endedAt - startedAt) / 60000);
  await recordLiveVoiceCost({
    userId,
    ventureId: data.venture_id ? String(data.venture_id) : null,
    planSlug: data.plan_slug ? String(data.plan_slug) : null,
    sessionId,
    model: String(data.model),
    inputMinutes: durationMinutes,
    outputMinutes: durationMinutes,
    sessionDurationSeconds: durationMinutes * 60,
  });
}

/**
 * P0 #4: closes out sessions abandoned without a clean disconnect (crash, force-quit, a
 * pagehide beacon that never arrived) and writes their AI cost ledger entry. Allowance
 * enforcement already treats these correctly -- getUsedMinutesThisPeriod (via
 * reserve_live_session) caps any still-active session at MAX_LIVE_SESSION_MINUTES on read,
 * so nobody gets extra allowance from an orphaned session. But that's a read-time cap, not a
 * write: ai_cost_ledger only ever gets a row from endLiveUsageSession(), which never runs for
 * a session that's never explicitly closed. Without this, Cost Ops would under-report real
 * spend. Meant to run on a schedule (see app/api/cron/reconcile-live-sessions).
 */
export async function reconcileStaleLiveSessions(): Promise<{ reconciled: number }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { reconciled: 0 };

  const staleCutoff = new Date(Date.now() - MAX_LIVE_SESSION_MINUTES * 60 * 1000).toISOString();

  const { data: staleSessions, error: selectError } = await admin
    .from("live_usage_sessions")
    .select("id, user_id, venture_id, plan_slug, model, started_at")
    .eq("status", "active")
    .lt("started_at", staleCutoff);

  if (selectError) {
    console.error("Failed to find stale live sessions:", selectError);
    return { reconciled: 0 };
  }
  if (!staleSessions || staleSessions.length === 0) return { reconciled: 0 };

  let reconciled = 0;
  for (const session of staleSessions) {
    const startedAt = Date.parse(String(session.started_at));
    if (!Number.isFinite(startedAt)) continue;
    const cappedEndedAt = new Date(startedAt + MAX_LIVE_SESSION_MINUTES * 60 * 1000).toISOString();

    // status='active' guard: if a real disconnect/beacon closed this out in the gap between
    // the select above and this update, this just no-ops instead of double-finalizing it.
    const { error: updateError } = await admin
      .from("live_usage_sessions")
      .update({ ended_at: cappedEndedAt, status: "ended" })
      .eq("id", session.id)
      .eq("status", "active");

    if (updateError) {
      console.error(`Failed to reconcile stale live session ${session.id}:`, updateError);
      continue;
    }

    await recordLiveVoiceCost({
      userId: String(session.user_id),
      ventureId: session.venture_id ? String(session.venture_id) : null,
      planSlug: session.plan_slug ? String(session.plan_slug) : null,
      sessionId: String(session.id),
      model: String(session.model),
      inputMinutes: MAX_LIVE_SESSION_MINUTES,
      outputMinutes: MAX_LIVE_SESSION_MINUTES,
      sessionDurationSeconds: MAX_LIVE_SESSION_MINUTES * 60,
    });
    reconciled += 1;
  }

  return { reconciled };
}
