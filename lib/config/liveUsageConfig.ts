// Centralized so Live Voice allowances are never hard-coded at each call site (per
// docs/founderally-next-implementation-todo.md item #2). Tune these freely -- nothing else
// needs to change.
//
// Only "lifetime" (300 min, per the doc) comes from an actual spec. The subscription-tier
// numbers below are reasonable placeholders to make the mechanism end-to-end functional;
// revisit them once real Live-minute cost data exists (see item #6, the AI cost ledger).
export const LIVE_MINUTES_BY_PLAN: Record<string, number> = {
  free_user: 30,
  solo_founder: 150,
  venture_pro: 600,
  lifetime: 300,
};

export const DEFAULT_LIVE_ALLOWANCE_MINUTES = LIVE_MINUTES_BY_PLAN.free_user;

// Also doubles as the safe upper bound for a session whose "end" call never arrives (crash,
// closed laptop, dead network) -- see getUsedMinutesThisPeriod in lib/billing/liveUsage.ts.
// Matches the ephemeral Gemini token's own expiry in app/api/live-session/route.ts, so no
// live session can actually run longer than this regardless of client behavior.
export const MAX_LIVE_SESSION_MINUTES = 30;
