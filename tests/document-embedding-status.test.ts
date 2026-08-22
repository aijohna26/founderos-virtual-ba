import assert from "node:assert/strict";
import test from "node:test";
import {
  countPersistedEmbeddings,
  describeEmbeddingError,
  resolveEmbeddingStatus,
} from "../lib/rag/documentIngestion";

// Review finding (docs/founderally-rag-requested-changes.md P0 #2 follow-up): a DB write
// failure after a successful Gemini embedding call was silently miscounted as a success,
// because the old code counted embedChunksForIndexing's result length instead of inspecting
// each Postgres UPDATE's own { error }. These tests exercise the fix directly against
// already-resolved {error} shapes -- the actual bug (not checking each result) reproduces
// here without needing to mock Supabase-JS, which this repo has no setup for.

test("countPersistedEmbeddings only counts results with no error", () => {
  const results = [
    { error: null },
    { error: { message: "connection reset" } },
    { error: null },
    { error: null },
    { error: { message: "constraint violation" } },
  ];
  // This is the exact scenario from the review: 10 embeddings generated, 2 DB updates fail --
  // scaled down here, but the same shape: 5 results, 2 failures, 3 genuinely persisted.
  assert.equal(countPersistedEmbeddings(results), 3);
});

test("countPersistedEmbeddings returns the full count when nothing failed", () => {
  const results = Array.from({ length: 10 }, () => ({ error: null }));
  assert.equal(countPersistedEmbeddings(results), 10);
});

test("countPersistedEmbeddings returns 0 when everything failed", () => {
  const results = Array.from({ length: 4 }, () => ({ error: { message: "timeout" } }));
  assert.equal(countPersistedEmbeddings(results), 0);
});

test("resolveEmbeddingStatus: 0 chunks is vacuously ready", () => {
  assert.equal(resolveEmbeddingStatus(0, 0), "ready");
});

test("resolveEmbeddingStatus: full persistence is ready", () => {
  assert.equal(resolveEmbeddingStatus(10, 10), "ready");
});

test("resolveEmbeddingStatus: partial persistence (the review's exact 10/8 scenario)", () => {
  assert.equal(resolveEmbeddingStatus(10, 8), "partial");
});

test("resolveEmbeddingStatus: zero persisted out of a non-empty set is failed", () => {
  assert.equal(resolveEmbeddingStatus(5, 0), "failed");
});

test("describeEmbeddingError: null when fully ready", () => {
  assert.equal(describeEmbeddingError(10, 10, "ready"), null);
});

test("describeEmbeddingError: names the exact failed count on a partial run", () => {
  assert.equal(describeEmbeddingError(10, 8, "partial"), "2 of 10 chunks failed to embed.");
});

test("describeEmbeddingError: names the total on a fully failed run", () => {
  assert.equal(describeEmbeddingError(5, 0, "failed"), "All 5 chunks failed to embed.");
});
