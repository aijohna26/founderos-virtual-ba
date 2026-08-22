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

/**
 * Venture-scoped semantic search over document_chunks (P1 #7). Never allows cross-venture
 * leakage: both ventureId and userId are passed straight through to match_document_chunks,
 * which filters on both server-side -- see that function's own comment for why both, not just
 * ventureId, are required, rather than trusting every call site to remember the filter.
 *
 * Returns [] (never null, never throws) on any failure -- not configured, no Gemini key,
 * embedding failure, or a query error -- so callers can treat "no results" uniformly without
 * a separate error branch. Retrieval coming up empty must never break the caller's flow; it
 * just means nothing gets cited as evidence for this turn.
 */
export async function searchDocumentChunks(params: {
  userId: string;
  ventureId: string;
  query: string;
  matchCount?: number;
  minSimilarity?: number;
}): Promise<RetrievedChunk[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const queryEmbedding = await embedQueryText(params.query);
  if (!queryEmbedding) return [];

  const { data, error } = await admin.rpc("match_document_chunks", {
    p_venture_id: params.ventureId,
    p_user_id: params.userId,
    p_query_embedding: queryEmbedding,
    p_match_count: params.matchCount ?? DEFAULT_MATCH_COUNT,
    p_min_similarity: params.minSimilarity ?? DEFAULT_MIN_SIMILARITY,
  });

  if (error) {
    console.error("Document chunk retrieval failed:", error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    documentId: String(row.document_id),
    title: String(row.title),
    section: row.section ? String(row.section) : null,
    chunkIndex: Number(row.chunk_index),
    content: String(row.content),
    similarity: Number(row.similarity),
  }));
}
