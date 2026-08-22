import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { embedQueryText } from "@/lib/rag/embeddings";
import { DEFAULT_MATCH_COUNT, DEFAULT_MIN_SIMILARITY } from "@/lib/config/ragConfig";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  title: string;
  section: string | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

// Review follow-up (docs/founderally-rag-requested-changes.md, P0 #3 "Make Retrieval Failures
// Observable"): this used to collapse every one of these into a bare []. Sarah still degrades
// gracefully either way (callers never need a separate error branch to keep working), but
// "nothing relevant exists" and "retrieval infrastructure is broken" are different facts the
// system needs to be able to tell apart -- for admin/telemetry visibility, and so a caller can
// choose different framing (e.g. never claim "no company evidence exists" when the truth is
// "evidence may exist but retrieval failed").
export type RetrievalStatus =
  | "success"
  | "no_match"
  | "embedding_unavailable"
  | "database_unavailable"
  | "retrieval_error";

export interface RetrievalResult {
  status: RetrievalStatus;
  chunks: RetrievedChunk[];
  /** Present on embedding_unavailable/database_unavailable/retrieval_error. Diagnostic only --
   * callers must never surface this string directly to a founder (see companyKnowledgeContext.ts). */
  error?: string;
  /** P1 #4 telemetry: how long embedding the query itself took, separate from the DB search. */
  embeddingLatencyMs: number;
  /** P1 #4 telemetry: how long the match_document_chunks RPC call took. */
  dbLatencyMs: number;
}

/**
 * Venture-scoped semantic search over document_chunks (P1 #7). Never allows cross-venture
 * leakage: both ventureId and userId are passed straight through to match_document_chunks,
 * which filters on both server-side -- see that function's own comment for why both, not just
 * ventureId, are required, rather than trusting every call site to remember the filter.
 *
 * Never throws -- every failure mode (not configured, no Gemini key, embedding failure, a
 * query error) resolves to a RetrievalResult with an appropriate status and chunks: [], not an
 * exception. Callers that only care about "did I get anything back" can still just check
 * result.chunks; callers that care about *why* (telemetry, admin visibility, honest framing to
 * the founder) have result.status to distinguish "genuinely nothing relevant" from
 * "infrastructure failed and we don't actually know."
 */
export async function searchDocumentChunks(params: {
  userId: string;
  ventureId: string;
  query: string;
  matchCount?: number;
  minSimilarity?: number;
}): Promise<RetrievalResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { status: "database_unavailable", chunks: [], error: "Supabase is not configured.", embeddingLatencyMs: 0, dbLatencyMs: 0 };

  const embeddingStartedAt = Date.now();
  const queryEmbedding = await embedQueryText(params.query);
  const embeddingLatencyMs = Date.now() - embeddingStartedAt;
  if (!queryEmbedding) {
    return {
      status: "embedding_unavailable",
      chunks: [],
      error: "Query embedding failed or GEMINI_API_KEY is not configured.",
      embeddingLatencyMs,
      dbLatencyMs: 0,
    };
  }

  const dbStartedAt = Date.now();
  const { data, error } = await admin.rpc("match_document_chunks", {
    p_venture_id: params.ventureId,
    p_user_id: params.userId,
    p_query_embedding: queryEmbedding,
    p_match_count: params.matchCount ?? DEFAULT_MATCH_COUNT,
    p_min_similarity: params.minSimilarity ?? DEFAULT_MIN_SIMILARITY,
  });
  const dbLatencyMs = Date.now() - dbStartedAt;

  if (error) {
    console.error("Document chunk retrieval failed:", error);
    return { status: "retrieval_error", chunks: [], error: error.message, embeddingLatencyMs, dbLatencyMs };
  }

  const chunks: RetrievedChunk[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    title: String(row.title),
    section: row.section ? String(row.section) : null,
    chunkIndex: Number(row.chunk_index),
    content: String(row.content),
    similarity: Number(row.similarity),
  }));

  return { status: chunks.length > 0 ? "success" : "no_match", chunks, embeddingLatencyMs, dbLatencyMs };
}
