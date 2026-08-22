import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logAIOperationServer } from "@/lib/agent/aiOperationsLogServer";
import type { RetrievalResult, RetrievalStatus } from "@/lib/rag/retrieval";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

export interface LogRagRetrievalParams {
  userId: string;
  ventureId: string;
  query: string;
  /** Which surface attempted retrieval -- text calls this in-process; Live calls it from
   * app/api/rag/search/route.ts via the search_company_knowledge tool. */
  source: "text" | "live";
  result: RetrievalResult;
  /** Wall-clock time for the whole retrieval attempt (embedding + DB), for the existing
   * latency_ms column; embeddingLatencyMs/dbLatencyMs (in tool_result) break it down further. */
  totalLatencyMs: number;
}

/**
 * P1 #4 (docs/founderally-rag-requested-changes.md "Add RAG telemetry to AI Ops"): records one
 * retrieval attempt with the full field set that doc asks for, in one consistent shape shared
 * by the text and Live paths, so getRagTelemetrySummary (below) never has to reconcile two
 * different log shapes. Reuses the existing ai_operation_logs table/columns (tool_arguments/
 * tool_result JSONB) rather than a new dedicated table -- this is "add telemetry to AI Ops,"
 * not "build a second telemetry system."
 *
 * "Do not store unnecessary sensitive document content in telemetry" (the doc's own words):
 * the query text is logged (truncated) since it's the founder's own message, not document
 * content, and telemetry without it is much harder to debug -- but retrieved chunk *content*
 * is never logged, only ids/counts/similarity scores.
 */
export async function logRagRetrieval(params: LogRagRetrievalParams): Promise<void> {
  const { result } = params;
  const topSimilarity = result.chunks.length > 0 ? Math.max(...result.chunks.map((chunk) => chunk.similarity)) : null;
  const documentIdsReturned = [...new Set(result.chunks.map((chunk) => chunk.documentId))];

  await logAIOperationServer({
    userId: params.userId,
    ventureId: params.ventureId,
    ceremony: params.source === "live" ? "daily_standup" : "ad_hoc_decision",
    geminiModel: GEMINI_CONFIG.EMBEDDING_MODEL,
    toolRequested: "rag_retrieval",
    toolArguments: {
      query: params.query.slice(0, 500),
      source: params.source,
      retrievalAttempted: true,
    },
    toolResult: {
      status: result.status,
      retrievedChunkCount: result.chunks.length,
      topSimilarity,
      documentIdsReturned,
      embeddingLatencyMs: result.embeddingLatencyMs,
      dbLatencyMs: result.dbLatencyMs,
      error: result.error ?? null,
    },
    reasoningCategory: "de_risking",
    latencyMs: params.totalLatencyMs,
    success: result.status === "success" || result.status === "no_match",
  });
}

export interface RagTelemetryRow {
  source: "text" | "live" | "unknown";
  status: RetrievalStatus | "unknown";
  retrievedChunkCount: number;
  topSimilarity: number | null;
  latencyMs: number;
}

export interface RagTelemetrySummary {
  totalAttempts: number;
  attemptsBySource: { text: number; live: number; unknown: number };
  /** Percentages (0-100), null when totalAttempts is 0 -- there's nothing to divide by. */
  successRatePercent: number | null;
  noMatchRatePercent: number | null;
  /** retrieval_error + database_unavailable: infra/query-level failures, distinct from an
   * embedding-specific failure (see embeddingFailureRatePercent). */
  retrievalErrorRatePercent: number | null;
  embeddingFailureRatePercent: number | null;
  avgLatencyMs: number | null;
  /** Both averaged over *successful* attempts only (status === "success") -- a no-match or
   * failed attempt has 0 chunks/no similarity by definition, and would just dilute what these
   * numbers are actually meant to answer: "when retrieval works, how good does it look."
   */
  avgChunkCountOnSuccess: number | null;
  avgSimilarityOnSuccess: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratePercent(count: number, total: number): number | null {
  if (total === 0) return null;
  return (count / total) * 100;
}

/**
 * Pure aggregation, kept separate from getRagTelemetrySummary's DB fetch below so the actual
 * math is unit-testable without mocking Supabase -- same reasoning as
 * lib/rag/documentIngestion.ts's extracted pure functions.
 */
export function summarizeRagTelemetry(rows: RagTelemetryRow[]): RagTelemetrySummary {
  const totalAttempts = rows.length;
  const successRows = rows.filter((row) => row.status === "success");

  return {
    totalAttempts,
    attemptsBySource: {
      text: rows.filter((row) => row.source === "text").length,
      live: rows.filter((row) => row.source === "live").length,
      unknown: rows.filter((row) => row.source === "unknown").length,
    },
    successRatePercent: ratePercent(successRows.length, totalAttempts),
    noMatchRatePercent: ratePercent(rows.filter((row) => row.status === "no_match").length, totalAttempts),
    retrievalErrorRatePercent: ratePercent(
      rows.filter((row) => row.status === "retrieval_error" || row.status === "database_unavailable").length,
      totalAttempts,
    ),
    embeddingFailureRatePercent: ratePercent(rows.filter((row) => row.status === "embedding_unavailable").length, totalAttempts),
    avgLatencyMs: average(rows.map((row) => row.latencyMs)),
    avgChunkCountOnSuccess: average(successRows.map((row) => row.retrievedChunkCount)),
    avgSimilarityOnSuccess: average(successRows.map((row) => row.topSimilarity).filter((value): value is number => value !== null)),
  };
}

const RETRIEVAL_STATUSES = new Set<string>(["success", "no_match", "embedding_unavailable", "database_unavailable", "retrieval_error"]);

/**
 * Fetches recent rag_retrieval entries from ai_operation_logs and summarizes them (P1 #4).
 * Bounded to the last 2000 matching rows -- a simple recency cap appropriate at this app's
 * current (pre-launch) data scale, same reasoning as lib/billing/costOps.ts's bounded reads;
 * revisit with real date-range filtering/pagination if that ever stops being enough.
 */
export async function getRagTelemetrySummary(filters: { ventureId?: string } = {}): Promise<RagTelemetrySummary | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  let query = admin
    .from("ai_operation_logs")
    .select("venture_id, tool_arguments, tool_result, latency_ms")
    .eq("tool_requested", "rag_retrieval")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (filters.ventureId) query = query.eq("venture_id", filters.ventureId);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to read RAG telemetry:", error);
    return null;
  }

  const rows: RagTelemetryRow[] = (data ?? []).map((row) => {
    const args = (row.tool_arguments ?? {}) as { source?: unknown };
    const result = (row.tool_result ?? {}) as { status?: unknown; retrievedChunkCount?: unknown; topSimilarity?: unknown };
    const source = args.source === "text" || args.source === "live" ? args.source : "unknown";
    const status = typeof result.status === "string" && RETRIEVAL_STATUSES.has(result.status)
      ? (result.status as RetrievalStatus)
      : "unknown";
    return {
      source,
      status,
      retrievedChunkCount: typeof result.retrievedChunkCount === "number" ? result.retrievedChunkCount : 0,
      topSimilarity: typeof result.topSimilarity === "number" ? result.topSimilarity : null,
      latencyMs: Number(row.latency_ms) || 0,
    };
  });

  return summarizeRagTelemetry(rows);
}
