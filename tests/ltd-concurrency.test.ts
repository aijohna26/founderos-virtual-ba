import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { dockerAvailable, startTestDb, type TestDb } from "./db/testDb";

// P0 #2: automated LTD concurrency/integrity tests, run against a real Postgres instance
// with the actual claim_ltd_offer_slot() migration applied (see tests/db/testDb.ts) --
// mocking the RPC would just re-test our mock, not the advisory-lock/row-lock logic that
// makes these invariants hold under real concurrent access.
//
// Skips (doesn't fail) when Docker isn't available locally, since that's an environment gap,
// not a code failure.

type ClaimResult =
  | { ok: true; foundingMemberNumber: number }
  | { ok: false; error: string };

async function claim(
  pool: Pool,
  params: { paymentIntentId: string; userId: string; offerId: string; amountCents?: number },
): Promise<ClaimResult> {
  try {
    const { rows } = await pool.query(
      `select * from claim_ltd_offer_slot($1, $2, $3, $4, $5, $6)`,
      [params.paymentIntentId, params.userId, params.offerId, params.amountCents ?? 40000, "usd", null],
    );
    return { ok: true, foundingMemberNumber: Number(rows[0].founding_member_number) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

let offerCounter = 0;
// ltd_offers_single_active_idx (20260819190000_ltd_admin_controls.sql) allows only one
// 'active' offer at a time, same as production -- so each new test offer must go through
// activate_ltd_offer() to atomically deactivate whichever offer (the seed row, or the
// previous test's) is currently active, exactly like the admin dashboard does.
async function makeOffer(pool: Pool, quantityTotal: number): Promise<string> {
  offerCounter += 1;
  const offerId = `test-offer-${Date.now()}-${offerCounter}`;
  await pool.query(
    `insert into ltd_offers (offer_id, release_number, price_cents, quantity_total, status)
     values ($1, $2, 40000, $3, 'closed')`,
    [offerId, 100000 + offerCounter, quantityTotal],
  );
  await pool.query(`select activate_ltd_offer($1)`, [offerId]);
  return offerId;
}

async function getOffer(pool: Pool, offerId: string) {
  const { rows } = await pool.query(
    `select quantity_sold, quantity_total, status from ltd_offers where offer_id = $1`,
    [offerId],
  );
  return { quantitySold: Number(rows[0].quantity_sold), quantityTotal: Number(rows[0].quantity_total), status: rows[0].status as string };
}

test("LTD offer concurrency invariants", { skip: dockerAvailable() ? false : "Docker is not available in this environment" }, async (t) => {
  let db: TestDb;

  t.before(async () => {
    db = await startTestDb();
  });
  t.after(async () => {
    await db.stop();
  });

  await t.test("same payment intent submitted concurrently claims exactly one slot", async () => {
    const offerId = await makeOffer(db.pool, 10);
    const paymentIntentId = `pi_${randomUUID()}`;
    const userId = `user_${randomUUID()}`;

    const results = await Promise.all(
      Array.from({ length: 8 }, () => claim(db.pool, { paymentIntentId, userId, offerId })),
    );

    assert.equal(results.every((r) => r.ok), true, "every replay of the same payment intent must succeed (idempotent)");
    const numbers = new Set((results as Extract<ClaimResult, { ok: true }>[]).map((r) => r.foundingMemberNumber));
    assert.equal(numbers.size, 1, "all replays must return the same founding member number");

    const offer = await getOffer(db.pool, offerId);
    assert.equal(offer.quantitySold, 1, "quantity_sold must only increment once for a duplicated payment intent");
  });

  await t.test("different payment intents for the same user yield exactly one membership", async () => {
    const offerId = await makeOffer(db.pool, 10);
    const userId = `user_${randomUUID()}`;

    const results = await Promise.all(
      Array.from({ length: 6 }, () => claim(db.pool, { paymentIntentId: `pi_${randomUUID()}`, userId, offerId })),
    );

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r): r is Extract<ClaimResult, { ok: false }> => !r.ok);
    assert.equal(successes.length, 1, "exactly one of the concurrent payment intents for this user must win");
    assert.equal(failures.length, 5);
    assert.equal(failures.every((f) => f.error.includes("already_lifetime_member")), true);

    const offer = await getOffer(db.pool, offerId);
    assert.equal(offer.quantitySold, 1, "a rejected duplicate-user claim must not consume inventory");
  });

  await t.test("two different users competing for the final slot: exactly one succeeds", async () => {
    const offerId = await makeOffer(db.pool, 1);
    const userA = `user_${randomUUID()}`;
    const userB = `user_${randomUUID()}`;

    const [a, b] = await Promise.all([
      claim(db.pool, { paymentIntentId: `pi_${randomUUID()}`, userId: userA, offerId }),
      claim(db.pool, { paymentIntentId: `pi_${randomUUID()}`, userId: userB, offerId }),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r): r is Extract<ClaimResult, { ok: false }> => !r.ok);
    assert.equal(successes.length, 1, "exactly one user must win the last slot");
    assert.equal(failures.length, 1);
    assert.equal(failures[0].error.includes("offer_unavailable"), true);

    const offer = await getOffer(db.pool, offerId);
    assert.equal(offer.quantitySold, 1);
    assert.equal(offer.status, "sold_out");
  });

  await t.test("#99 and #100 succeed, #101 cannot claim a sold-out offer; no slot ever disappears", async () => {
    const offerId = await makeOffer(db.pool, 100);
    const claimants = Array.from({ length: 101 }, () => ({
      paymentIntentId: `pi_${randomUUID()}`,
      userId: `user_${randomUUID()}`,
      offerId,
    }));

    const results = await Promise.all(claimants.map((c) => claim(db.pool, c)));
    const successes = results.filter((r): r is Extract<ClaimResult, { ok: true }> => r.ok);
    const failures = results.filter((r): r is Extract<ClaimResult, { ok: false }> => !r.ok);

    assert.equal(successes.length, 100, "exactly 100 of the 101 concurrent claimants must win a slot");
    assert.equal(failures.length, 1, "exactly one claimant must be turned away once the offer is full");
    assert.equal(failures[0].error.includes("offer_unavailable"), true);

    // Founding Member numbers stay globally unique -- no duplicate, no gap-induced collision.
    const numbers = successes.map((r) => r.foundingMemberNumber);
    assert.equal(new Set(numbers).size, 100, "all 100 founding member numbers must be distinct");

    const offer = await getOffer(db.pool, offerId);
    assert.equal(offer.quantitySold, 100, "quantity_sold must land exactly on quantity_total -- no slot lost, none double-counted");
    assert.equal(offer.status, "sold_out");

    const { rows } = await db.pool.query(`select count(*)::int as n from ltd_purchases where offer_id = $1`, [offerId]);
    assert.equal(rows[0].n, 100, "exactly 100 purchase rows must exist for this offer");
  });

  await t.test("a duplicate (sequentially replayed) Stripe webhook makes no additional inventory change", async () => {
    const offerId = await makeOffer(db.pool, 10);
    const paymentIntentId = `pi_${randomUUID()}`;
    const userId = `user_${randomUUID()}`;

    const first = await claim(db.pool, { paymentIntentId, userId, offerId });
    assert.equal(first.ok, true);
    const before = await getOffer(db.pool, offerId);

    const replay = await claim(db.pool, { paymentIntentId, userId, offerId });
    assert.equal(replay.ok, true);
    assert.deepEqual(replay, first, "a replayed webhook must return the exact same claim, not a new one");

    const after = await getOffer(db.pool, offerId);
    assert.equal(after.quantitySold, before.quantitySold, "a duplicate webhook delivery must not change quantity_sold");
  });

  await t.test("failed claims never make LTD inventory disappear", async () => {
    const offerId = await makeOffer(db.pool, 5);
    // 12 distinct users racing for 5 slots: 5 must win, 7 must be cleanly rejected, and the
    // rejections must leave quantity_sold exactly at quantity_total -- not under (a slot
    // silently lost) and not over (oversold).
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        claim(db.pool, { paymentIntentId: `pi_${randomUUID()}`, userId: `user_${randomUUID()}`, offerId }),
      ),
    );
    const successes = results.filter((r) => r.ok);
    assert.equal(successes.length, 5);

    const offer = await getOffer(db.pool, offerId);
    assert.equal(offer.quantitySold, 5, "no slot may vanish or be overcounted across the failed transactions");
    assert.equal(offer.quantitySold, offer.quantityTotal);
  });
});
