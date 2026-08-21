import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { dockerAvailable, startTestDb, type TestDb } from "./db/testDb";

// P0 #3: automated Live concurrency/integrity tests, run against a real Postgres instance
// with the actual reserve_live_session() / live_usage_sessions migrations applied (see
// tests/db/testDb.ts) -- same reasoning as tests/ltd-concurrency.test.ts: the invariants
// here (the partial unique "one active session" index, the allowance boundary check) only
// mean something tested against the real row-locking behavior, not a mock.
//
// endLiveUsageSession/reconcileStaleLiveSessions in lib/billing/liveUsage.ts aren't
// Postgres functions (unlike reserve_live_session) -- they're plain Supabase-JS table
// updates, which need a running PostgREST layer this harness doesn't stand up. The SQL
// below (endSession/reconcileOneStaleSession) mirrors those update statements exactly
// (same table, same column set, same `where status = 'active'` idempotency guard) so the
// concurrency behavior under test is identical; only the JS-level wrapper glue isn't covered
// here.
//
// Skips (doesn't fail) when Docker isn't available locally.

const MAX_SESSION_MINUTES = 30; // matches MAX_LIVE_SESSION_MINUTES in lib/config/liveUsageConfig.ts
const FIXED_PERIOD_START = new Date("2024-01-01T00:00:00Z"); // arbitrary, decouples tests from wall-clock month boundaries

type ReserveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function reserve(
  pool: Pool,
  params: { id?: string; userId: string; ventureId: string; planSlug: string; allowanceMinutes: number; periodStart?: Date },
): Promise<ReserveResult> {
  try {
    const { rows } = await pool.query(
      `select * from reserve_live_session($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.id ?? `live-${randomUUID()}`,
        params.userId,
        params.ventureId,
        params.planSlug,
        "gemini-live-test-model",
        params.allowanceMinutes,
        (params.periodStart ?? FIXED_PERIOD_START).toISOString(),
        MAX_SESSION_MINUTES,
      ],
    );
    return { ok: true, id: String(rows[0].id) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Seeds a completed session directly, to pre-load "usage already consumed this period". */
async function insertEndedSession(
  pool: Pool,
  params: { userId: string; ventureId: string; startedAt: Date; durationMinutes: number },
) {
  const endedAt = new Date(params.startedAt.getTime() + params.durationMinutes * 60_000);
  await pool.query(
    `insert into live_usage_sessions (id, user_id, venture_id, plan_slug, model, started_at, ended_at, status)
     values ($1, $2, $3, 'lifetime', 'gemini-live-test-model', $4, $5, 'ended')`,
    [`live-${randomUUID()}`, params.userId, params.ventureId, params.startedAt.toISOString(), endedAt.toISOString()],
  );
}

/** Seeds a still-active session with an arbitrary started_at, to simulate an abandoned one. */
async function insertActiveSessionAt(pool: Pool, params: { userId: string; ventureId: string; startedAt: Date }): Promise<string> {
  const id = `live-${randomUUID()}`;
  await pool.query(
    `insert into live_usage_sessions (id, user_id, venture_id, plan_slug, model, started_at, status)
     values ($1, $2, $3, 'lifetime', 'gemini-live-test-model', $4, 'active')`,
    [id, params.userId, params.ventureId, params.startedAt.toISOString()],
  );
  return id;
}

/** Mirrors endLiveUsageSession's update exactly (see file header). */
async function endSession(pool: Pool, id: string, userId: string) {
  const { rows } = await pool.query(
    `update live_usage_sessions set ended_at = now(), status = 'ended'
     where id = $1 and user_id = $2 and status = 'active'
     returning started_at, ended_at`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Mirrors one iteration of reconcileStaleLiveSessions' per-row update exactly (see file header). */
async function reconcileOneStaleSession(pool: Pool, id: string, startedAt: Date) {
  const cappedEndedAt = new Date(startedAt.getTime() + MAX_SESSION_MINUTES * 60_000).toISOString();
  const { rows } = await pool.query(
    `update live_usage_sessions set ended_at = $2, status = 'ended'
     where id = $1 and status = 'active'
     returning id`,
    [id, cappedEndedAt],
  );
  return rows.length > 0;
}

test("Live session concurrency/integrity invariants", { skip: dockerAvailable() ? false : "Docker is not available in this environment" }, async (t) => {
  let db: TestDb;

  t.before(async () => {
    db = await startTestDb();
  });
  t.after(async () => {
    await db.stop();
  });

  await t.test("two simultaneous Live starts for one user: exactly one succeeds", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;

    const [a, b] = await Promise.all([
      reserve(db.pool, { userId, ventureId, planSlug: "lifetime", allowanceMinutes: 300 }),
      reserve(db.pool, { userId, ventureId, planSlug: "lifetime", allowanceMinutes: 300 }),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r): r is Extract<ReserveResult, { ok: false }> => !r.ok);
    assert.equal(successes.length, 1, "only one concurrent Live start for the same user may succeed");
    assert.equal(failures.length, 1);
    assert.equal(
      failures[0].error.toLowerCase().includes("duplicate key") || failures[0].error.includes("live_usage_sessions_single_active_idx"),
      true,
      "the loser must fail on the single-active-session constraint, not some other error",
    );

    const { rows } = await db.pool.query(`select count(*)::int as n from live_usage_sessions where user_id = $1 and status = 'active'`, [userId]);
    assert.equal(rows[0].n, 1, "exactly one active session row must exist for this user");
  });

  await t.test(
    "refresh / duplicate end-session requests: ending an already-ended session is a no-op",
    async () => {
      const userId = `user_${randomUUID()}`;
      const ventureId = `venture_${randomUUID()}`;
      const started = await reserve(db.pool, { userId, ventureId, planSlug: "lifetime", allowanceMinutes: 300 });
      assert.equal(started.ok, true);
      const sessionId = (started as Extract<ReserveResult, { ok: true }>).id;

      // Simulate a normal disconnect racing a pagehide beacon for the same session -- both
      // fire the "end" call at roughly the same time.
      const [first, second] = await Promise.all([endSession(db.pool, sessionId, userId), endSession(db.pool, sessionId, userId)]);
      const winners = [first, second].filter(Boolean);
      assert.equal(winners.length, 1, "only one of the two concurrent end calls may finalize the session (no double-billing)");

      // A subsequent, sequential retry (e.g. a refreshed tab retrying its own beacon) must
      // also be a harmless no-op, not an error and not a second finalization.
      const third = await endSession(db.pool, sessionId, userId);
      assert.equal(third, null);

      const { rows } = await db.pool.query(`select status from live_usage_sessions where id = $1`, [sessionId]);
      assert.equal(rows[0].status, "ended");
    },
  );

  await t.test(
    "browser crash / network loss / device sleep: an abandoned session is reconciled and capped at the session max",
    async () => {
      const userId = `user_${randomUUID()}`;
      const ventureId = `venture_${randomUUID()}`;
      // Started well past the max session length with no end call ever arriving -- exactly
      // what a crashed tab, a dead network, or a slept laptop leaves behind.
      const startedAt = new Date(Date.now() - (MAX_SESSION_MINUTES + 20) * 60_000);
      const sessionId = await insertActiveSessionAt(db.pool, { userId, ventureId, startedAt });

      const reconciled = await reconcileOneStaleSession(db.pool, sessionId, startedAt);
      assert.equal(reconciled, true);

      const { rows } = await db.pool.query(
        `select status, extract(epoch from (ended_at - started_at)) / 60 as duration_minutes from live_usage_sessions where id = $1`,
        [sessionId],
      );
      assert.equal(rows[0].status, "ended");
      // Capped at MAX_SESSION_MINUTES, not the ~50 minutes it was actually abandoned for --
      // an orphaned session must never be billed/counted for longer than it could legitimately run.
      assert.equal(Math.round(Number(rows[0].duration_minutes)), MAX_SESSION_MINUTES);
    },
  );

  await t.test("concurrent stale-session reconciliation runs never double-finalize the same session", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    const startedAt = new Date(Date.now() - (MAX_SESSION_MINUTES + 20) * 60_000);
    const sessionId = await insertActiveSessionAt(db.pool, { userId, ventureId, startedAt });

    // Two overlapping cron runs (e.g. a slow previous run still finishing when the next
    // scheduled tick fires) both pick up the same stale row and race to close it out.
    const results = await Promise.all([
      reconcileOneStaleSession(db.pool, sessionId, startedAt),
      reconcileOneStaleSession(db.pool, sessionId, startedAt),
    ]);
    const winners = results.filter(Boolean);
    assert.equal(winners.length, 1, "only one reconciliation pass may finalize a given stale session -- the other must no-op");
  });

  await t.test("a user at exactly their allowance cannot start another session; one minute short still can", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    const allowanceMinutes = 300; // lifetime plan, per LIVE_MINUTES_BY_PLAN

    // reserve_live_session caps each individual session's contribution to "used minutes" at
    // MAX_SESSION_MINUTES (30) -- correct, since no real session can ever legitimately run
    // longer than that (the ephemeral Gemini token itself expires at the same limit). So
    // accumulating 300 real minutes of usage means ten realistic ~30-minute sessions, not one
    // long one -- seeding a single artificially-long row would silently under-count here.
    for (let i = 0; i < 10; i += 1) {
      await insertEndedSession(db.pool, {
        userId,
        ventureId,
        startedAt: new Date(FIXED_PERIOD_START.getTime() + i * 3_600_000),
        durationMinutes: MAX_SESSION_MINUTES,
      });
    }

    const atCap = await reserve(db.pool, { userId, ventureId, planSlug: "lifetime", allowanceMinutes });
    assert.equal(atCap.ok, false);
    assert.equal((atCap as Extract<ReserveResult, { ok: false }>).error.includes("allowance_exhausted"), true);

    // A second user, one minute under the same allowance, must still be admitted -- the
    // boundary is ">=", not "> or close to".
    const userB = `user_${randomUUID()}`;
    for (let i = 0; i < 9; i += 1) {
      await insertEndedSession(db.pool, {
        userId: userB,
        ventureId,
        startedAt: new Date(FIXED_PERIOD_START.getTime() + i * 3_600_000),
        durationMinutes: MAX_SESSION_MINUTES,
      });
    }
    await insertEndedSession(db.pool, {
      userId: userB,
      ventureId,
      startedAt: new Date(FIXED_PERIOD_START.getTime() + 9 * 3_600_000),
      durationMinutes: MAX_SESSION_MINUTES - 1, // 9*30 + 29 = 299, one minute under the 300 allowance
    });
    const underCap = await reserve(db.pool, { userId: userB, ventureId, planSlug: "lifetime", allowanceMinutes });
    assert.equal(underCap.ok, true, "a user with any allowance remaining must still be able to start a session");
  });

  await t.test("a normal end racing the stale-session reconciler finalizes the session exactly once", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    // Old enough that the reconciler considers it stale, but the founder's own disconnect
    // beacon is *also* in flight at the same moment -- e.g. a laptop waking from sleep right
    // as a scheduled reconciliation pass runs.
    const startedAt = new Date(Date.now() - (MAX_SESSION_MINUTES + 5) * 60_000);
    const sessionId = await insertActiveSessionAt(db.pool, { userId, ventureId, startedAt });

    const [endResult, reconcileResult] = await Promise.all([
      endSession(db.pool, sessionId, userId),
      reconcileOneStaleSession(db.pool, sessionId, startedAt),
    ]);
    const winners = [Boolean(endResult), reconcileResult].filter(Boolean);
    assert.equal(winners.length, 1, "exactly one of {normal end, stale reconciliation} may finalize this session -- never both, never neither");

    const { rows } = await db.pool.query(`select status, ended_at from live_usage_sessions where id = $1`, [sessionId]);
    assert.equal(rows[0].status, "ended");
    assert.notEqual(rows[0].ended_at, null, "the session must end up with exactly one ended_at, from whichever side won");
  });

  await t.test("usage stays consistent after a session is ended: no double-counted or missing duration", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    const started = await reserve(db.pool, { userId, ventureId, planSlug: "lifetime", allowanceMinutes: 300, periodStart: FIXED_PERIOD_START });
    assert.equal(started.ok, true);
    const sessionId = (started as Extract<ReserveResult, { ok: true }>).id;

    // Two racing end calls, as in the duplicate-end-session case above.
    await Promise.all([endSession(db.pool, sessionId, userId), endSession(db.pool, sessionId, userId)]);

    const { rows } = await db.pool.query(
      `select count(*)::int as n, coalesce(sum(extract(epoch from (ended_at - started_at))), 0) as total_seconds
       from live_usage_sessions where user_id = $1 and status = 'ended'`,
      [userId],
    );
    assert.equal(rows[0].n, 1, "exactly one usage row must exist for this session regardless of the racing end calls");
    assert.equal(Number(rows[0].total_seconds) >= 0, true, "duration must never go negative from a lost race");
  });
});
