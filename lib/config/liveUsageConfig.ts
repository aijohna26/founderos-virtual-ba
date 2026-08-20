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

// How long before the hard cutoff GeminiLiveService nudges the model to wrap up (see
// docs/founderally-next-implementation-todo.md P0 #4 -- "at ~27 minutes" on a 30-minute cap).
export const LIVE_SESSION_WARNING_LEAD_MINUTES = 3;

// Idle detection (P0 #5). Deliberately keyed to *meaningful* interaction -- a final user
// transcript, a tool call, or Sarah actually speaking -- never interim ASR blips or ambient
// audio, so background noise can't reset it and can't be mistaken for presence either.
export const IDLE_WARNING_SECONDS = 60;
export const IDLE_DISCONNECT_SECONDS = 45;
// Brief pause after the "ending the call" sign-off line is sent, so it has time to actually
// start playing before the connection closes underneath it.
export const IDLE_SIGNOFF_GRACE_MS = 4000;
