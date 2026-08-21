import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { LIVE_MINUTES_BY_PLAN, MAX_LIVE_SESSION_MINUTES } from "@/lib/config/liveUsageConfig";
import { getCurrentPeriodStart } from "@/lib/billing/liveUsage";

export interface CostOpsFilters {
  from?: string;
  to?: string;
  planSlug?: string;
  userId?: string;
}

export interface CostOpsAccountRow {
  userId: string;
  email: string | null;
  costUsd: number;
  interactionCount: number;
}

export interface CostOpsCohortRow {
  releaseNumber: number;
  offerId: string;
  memberCount: number;
  revenueUsd: number;
  costUsd: number;
  marginUsd: number;
  marginPercent: number | null;
}

export interface CostOpsCapRow {
  userId: string;
  email: string | null;
  planSlug: string;
  usedMinutes: number;
  allowanceMinutes: number;
  percentUsed: number;
}

export interface CostOpsSummary {
  totalCostUsd: number;
  costByInteractionType: Record<string, number>;
  costByPlan: Record<string, number>;
  topAccounts: CostOpsAccountRow[];
  liveMinutesByUser: Array<{ userId: string; email: string | null; minutes: number }>;
  avgLiveSessionMinutes: number;
  ltdCohorts: CostOpsCohortRow[];
  accountsApproachingCap: CostOpsCapRow[];
}

async function emailsForUserIds(userIds: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (userIds.length === 0) return result;
  try {
    const client = await clerkClient();
    // Bounded to whatever short list actually needs enrichment (top accounts, cap warnings)
    // -- not every user in the ledger, so this stays cheap regardless of ledger size.
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const user = await client.users.getUser(id);
          result.set(id, user.primaryEmailAddress?.emailAddress ?? null);
        } catch {
          result.set(id, null);
        }
      }),
    );
  } catch {
    // Clerk not reachable for some reason -- fall back to showing raw user ids.
  }
  return result;
}

/**
 * Everything the Cost Ops dashboard needs, in one pass. Fetches bounded row sets from
 * ai_cost_ledger / live_usage_sessions / ltd_purchases and aggregates in JS rather than deep
 * SQL aggregation -- appropriate at this app's actual data scale (pre-launch), and much
 * easier to keep correct than hand-written aggregate SQL for a half-dozen different cuts of
 * the same handful of tables.
 */
export async function getCostOpsSummary(filters: CostOpsFilters): Promise<CostOpsSummary | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  let ledgerQuery = admin
    .from("ai_cost_ledger")
    .select("user_id, plan_slug, interaction_type, estimated_cost_usd, created_at");
  if (filters.from) ledgerQuery = ledgerQuery.gte("created_at", filters.from);
  if (filters.to) ledgerQuery = ledgerQuery.lte("created_at", filters.to);
  if (filters.planSlug) ledgerQuery = ledgerQuery.eq("plan_slug", filters.planSlug);
  if (filters.userId) ledgerQuery = ledgerQuery.eq("user_id", filters.userId);

  const [{ data: ledgerRows, error: ledgerError }, { data: ltdPurchases, error: ltdError }, { data: ltdOffers }] =
    await Promise.all([
      ledgerQuery,
      admin.from("ltd_purchases").select("user_id, offer_id, amount_paid_cents"),
      admin.from("ltd_offers").select("offer_id, release_number"),
    ]);

  if (ledgerError) {
    console.error("Cost Ops: failed to read ai_cost_ledger:", ledgerError);
    return null;
  }
  if (ltdError) {
    console.error("Cost Ops: failed to read ltd_purchases:", ltdError);
  }

  const rows = ledgerRows ?? [];

  let totalCostUsd = 0;
  const costByInteractionType: Record<string, number> = {};
  const costByPlan: Record<string, number> = {};
  const costByUser = new Map<string, { costUsd: number; count: number }>();

  for (const row of rows) {
    const cost = Number(row.estimated_cost_usd) || 0;
    totalCostUsd += cost;
    const interactionType = String(row.interaction_type);
    costByInteractionType[interactionType] = (costByInteractionType[interactionType] ?? 0) + cost;
    const planSlug = row.plan_slug ? String(row.plan_slug) : "unknown";
    costByPlan[planSlug] = (costByPlan[planSlug] ?? 0) + cost;
    if (row.user_id) {
      const userId = String(row.user_id);
      const existing = costByUser.get(userId) ?? { costUsd: 0, count: 0 };
      existing.costUsd += cost;
      existing.count += 1;
      costByUser.set(userId, existing);
    }
  }

  const topAccountEntries = [...costByUser.entries()].sort((a, b) => b[1].costUsd - a[1].costUsd).slice(0, 10);

  // Live minutes per user, over the same filtered window, using the same capped-duration
  // logic as allowance enforcement (an unfinished session can't inflate this past the max).
  let sessionsQuery = admin.from("live_usage_sessions").select("user_id, started_at, ended_at");
  if (filters.from) sessionsQuery = sessionsQuery.gte("started_at", filters.from);
  if (filters.to) sessionsQuery = sessionsQuery.lte("started_at", filters.to);
  if (filters.userId) sessionsQuery = sessionsQuery.eq("user_id", filters.userId);
  const { data: sessionRows, error: sessionsError } = await sessionsQuery;
  if (sessionsError) console.error("Cost Ops: failed to read live_usage_sessions:", sessionsError);

  const minutesByUser = new Map<string, number>();
  let totalSessionMinutes = 0;
  let sessionCount = 0;
  const now = Date.now();
  for (const row of sessionRows ?? []) {
    const startedAt = Date.parse(String(row.started_at));
    if (!Number.isFinite(startedAt)) continue;
    const cappedEnd = startedAt + MAX_LIVE_SESSION_MINUTES * 60 * 1000;
    const endedAt = row.ended_at ? Date.parse(String(row.ended_at)) : now;
    const minutes = Math.max(0, Math.min(endedAt, cappedEnd) - startedAt) / 60000;
    if (row.user_id) {
      const userId = String(row.user_id);
      minutesByUser.set(userId, (minutesByUser.get(userId) ?? 0) + minutes);
    }
    totalSessionMinutes += minutes;
    sessionCount += 1;
  }
  const avgLiveSessionMinutes = sessionCount > 0 ? totalSessionMinutes / sessionCount : 0;
  const liveMinutesEntries = [...minutesByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  // LTD cohorts: revenue is a hard fact (amount_paid_cents); cost is whatever ai_cost_ledger
  // attributes to that cohort's members within the filtered window. There's no revenue
  // figure available for Clerk Billing subscribers here -- Clerk owns that, this app only
  // mirrors plan/status, not payment amounts -- so margin is only computable for LTD.
  const offerToRelease = new Map((ltdOffers ?? []).map((o) => [String(o.offer_id), Number(o.release_number)]));
  const cohortAgg = new Map<number, { offerId: string; memberCount: number; revenueCents: number; userIds: Set<string> }>();
  for (const purchase of ltdPurchases ?? []) {
    const releaseNumber = offerToRelease.get(String(purchase.offer_id));
    if (releaseNumber === undefined) continue;
    const entry = cohortAgg.get(releaseNumber) ?? {
      offerId: String(purchase.offer_id),
      memberCount: 0,
      revenueCents: 0,
      userIds: new Set<string>(),
    };
    entry.memberCount += 1;
    entry.revenueCents += Number(purchase.amount_paid_cents) || 0;
    entry.userIds.add(String(purchase.user_id));
    cohortAgg.set(releaseNumber, entry);
  }
  const ltdCohorts: CostOpsCohortRow[] = [...cohortAgg.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([releaseNumber, entry]) => {
      const costUsd = [...entry.userIds].reduce((sum, userId) => sum + (costByUser.get(userId)?.costUsd ?? 0), 0);
      const revenueUsd = entry.revenueCents / 100;
      const marginUsd = revenueUsd - costUsd;
      return {
        releaseNumber,
        offerId: entry.offerId,
        memberCount: entry.memberCount,
        revenueUsd,
        costUsd,
        marginUsd,
        marginPercent: revenueUsd > 0 ? (marginUsd / revenueUsd) * 100 : null,
      };
    });

  // Accounts approaching their Live allowance -- always the *current* period regardless of
  // the dashboard's own date filter, since that's what actually gates access right now.
  // Simplification worth knowing: LTD members get the real 300-minute Lifetime allowance
  // (resolvable directly from ltd_purchases); everyone else is shown against the free_user
  // allowance as a stand-in, because resolving another user's actual Clerk Billing plan
  // requires Clerk's Backend API per user, which isn't wired up here yet -- so a paying
  // subscriber's true (larger) allowance isn't reflected, only the most conservative one.
  const periodStart = getCurrentPeriodStart();
  const { data: currentPeriodSessions } = await admin
    .from("live_usage_sessions")
    .select("user_id, started_at, ended_at")
    .gte("started_at", periodStart);
  const currentPeriodMinutesByUser = new Map<string, number>();
  for (const row of currentPeriodSessions ?? []) {
    const startedAt = Date.parse(String(row.started_at));
    if (!Number.isFinite(startedAt) || !row.user_id) continue;
    const cappedEnd = startedAt + MAX_LIVE_SESSION_MINUTES * 60 * 1000;
    const endedAt = row.ended_at ? Date.parse(String(row.ended_at)) : now;
    const minutes = Math.max(0, Math.min(endedAt, cappedEnd) - startedAt) / 60000;
    const userId = String(row.user_id);
    currentPeriodMinutesByUser.set(userId, (currentPeriodMinutesByUser.get(userId) ?? 0) + minutes);
  }
  const ltdUserIds = new Set((ltdPurchases ?? []).map((p) => String(p.user_id)));
  const capRows: CostOpsCapRow[] = [];
  for (const [userId, usedMinutes] of currentPeriodMinutesByUser.entries()) {
    const planSlug = ltdUserIds.has(userId) ? "lifetime" : "free_user";
    const allowanceMinutes = LIVE_MINUTES_BY_PLAN[planSlug] ?? LIVE_MINUTES_BY_PLAN.free_user;
    const percentUsed = allowanceMinutes > 0 ? (usedMinutes / allowanceMinutes) * 100 : 0;
    if (percentUsed >= 80) {
      capRows.push({ userId, email: null, planSlug, usedMinutes, allowanceMinutes, percentUsed });
    }
  }
  capRows.sort((a, b) => b.percentUsed - a.percentUsed);

  const emailTargets = [
    ...new Set([...topAccountEntries.map(([userId]) => userId), ...capRows.map((row) => row.userId)]),
  ];
  const emails = await emailsForUserIds(emailTargets);

  return {
    totalCostUsd,
    costByInteractionType,
    costByPlan,
    topAccounts: topAccountEntries.map(([userId, entry]) => ({
      userId,
      email: emails.get(userId) ?? null,
      costUsd: entry.costUsd,
      interactionCount: entry.count,
    })),
    liveMinutesByUser: liveMinutesEntries.map(([userId, minutes]) => ({
      userId,
      email: emails.get(userId) ?? null,
      minutes,
    })),
    avgLiveSessionMinutes,
    ltdCohorts,
    accountsApproachingCap: capRows.map((row) => ({ ...row, email: emails.get(row.userId) ?? null })),
  };
}
