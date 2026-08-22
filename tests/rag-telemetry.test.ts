import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRagTelemetry, type RagTelemetryRow } from "../lib/rag/ragTelemetry";

function row(overrides: Partial<RagTelemetryRow>): RagTelemetryRow {
  return {
    source: "text",
    status: "success",
    retrievedChunkCount: 3,
    topSimilarity: 0.8,
    latencyMs: 100,
    ...overrides,
  };
}

test("empty telemetry summarizes to all-null rates/averages, not NaN or divide-by-zero", () => {
  const summary = summarizeRagTelemetry([]);
  assert.equal(summary.totalAttempts, 0);
  assert.equal(summary.successRatePercent, null);
  assert.equal(summary.noMatchRatePercent, null);
  assert.equal(summary.retrievalErrorRatePercent, null);
  assert.equal(summary.embeddingFailureRatePercent, null);
  assert.equal(summary.avgLatencyMs, null);
  assert.equal(summary.avgChunkCountOnSuccess, null);
  assert.equal(summary.avgSimilarityOnSuccess, null);
});

test("computes rates as percentages across a mixed batch", () => {
  const rows: RagTelemetryRow[] = [
    row({ status: "success" }),
    row({ status: "success" }),
    row({ status: "no_match" }),
    row({ status: "retrieval_error" }),
    row({ status: "database_unavailable" }),
    row({ status: "embedding_unavailable" }),
    row({ status: "embedding_unavailable" }),
    row({ status: "embedding_unavailable" }),
    row({ status: "embedding_unavailable" }),
    row({ status: "embedding_unavailable" }),
  ];
  const summary = summarizeRagTelemetry(rows);
  assert.equal(summary.totalAttempts, 10);
  assert.equal(summary.successRatePercent, 20);
  assert.equal(summary.noMatchRatePercent, 10);
  // retrieval_error + database_unavailable are grouped together.
  assert.equal(summary.retrievalErrorRatePercent, 20);
  assert.equal(summary.embeddingFailureRatePercent, 50);
});

test("chunk count and similarity averages are computed only over successful attempts", () => {
  const rows: RagTelemetryRow[] = [
    row({ status: "success", retrievedChunkCount: 4, topSimilarity: 0.9 }),
    row({ status: "success", retrievedChunkCount: 2, topSimilarity: 0.7 }),
    // A no_match/failed row's 0 chunks and null similarity must not drag the average down --
    // these fields don't mean anything for a row that never actually found evidence.
    row({ status: "no_match", retrievedChunkCount: 0, topSimilarity: null }),
    row({ status: "retrieval_error", retrievedChunkCount: 0, topSimilarity: null }),
  ];
  const summary = summarizeRagTelemetry(rows);
  assert.equal(summary.avgChunkCountOnSuccess, 3); // (4 + 2) / 2, not (4+2+0+0)/4
  assert.equal(summary.avgSimilarityOnSuccess, 0.8); // (0.9 + 0.7) / 2
});

test("latency is averaged across every attempt, including failures", () => {
  const rows: RagTelemetryRow[] = [
    row({ status: "success", latencyMs: 100 }),
    row({ status: "retrieval_error", latencyMs: 300 }),
  ];
  assert.equal(summarizeRagTelemetry(rows).avgLatencyMs, 200);
});

test("splits attempt counts by source", () => {
  const rows: RagTelemetryRow[] = [
    row({ source: "text" }),
    row({ source: "text" }),
    row({ source: "live" }),
    row({ source: "unknown" }),
  ];
  assert.deepEqual(summarizeRagTelemetry(rows).attemptsBySource, { text: 2, live: 1, unknown: 1 });
});
