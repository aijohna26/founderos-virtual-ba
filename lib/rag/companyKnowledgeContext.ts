import "server-only";

import { searchDocumentChunks, type RetrievalStatus } from "@/lib/rag/retrieval";
import { classifyContextNeeds } from "@/lib/agent/contextClassifier";
import { logAIOperationServer } from "@/lib/agent/aiOperationsLogServer";

export interface CompanyKnowledgeSource {
  documentId: string;
  title: string;
  section: string | null;
  similarity: number;
}

// Review follow-up (docs/founderally-rag-requested-changes.md, P0 #3): the caller-facing
// summary of "what actually happened with company evidence this turn" -- distinct from
// RetrievalStatus (retrieval.ts's finer-grained internal reason) because a caller composing a
// reply only ever needs to make one of these three framing decisions, not distinguish *why*
// retrieval was unavailable.
export type EvidenceStatus = "with_evidence" | "no_match" | "retrieval_unavailable";

export interface CompanyKnowledgeContext {
  /** Whether retrieval was actually attempted (false when the classifier gated it out). */
  attempted: boolean;
  evidenceStatus: EvidenceStatus;
  /** Ready to drop straight into a system prompt in place of the old wholesale document dump. */
  promptText: string;
  /** Structured provenance (P1 #9) for the client to display and for the caller to return alongside the reply. */
  sources: CompanyKnowledgeSource[];
}

const NOT_ATTEMPTED_TEXT = "Company document search was not attempted for this message (it didn't need it).";
const NO_MATCH_TEXT = "No company documents were retrieved as relevant to this specific question.";
// Deliberately generic -- never includes the underlying RetrievalResult.error string. That
// diagnostic goes to logAIOperationServer below for admin/telemetry visibility only; a
// founder (or the model relaying this text to one) never sees low-level infrastructure detail.
const UNAVAILABLE_TEXT =
  "Company document search is temporarily unavailable for this message. Evidence may exist but could not be checked -- do not say no relevant company documents exist; say search wasn't available right now.";

function toEvidenceStatus(status: RetrievalStatus): EvidenceStatus {
  if (status === "success") return "with_evidence";
  if (status === "no_match") return "no_match";
  return "retrieval_unavailable"; // embedding_unavailable | database_unavailable | retrieval_error
}

/**
 * Replaces the old "inject every saved document into every prompt" pattern: gates on
 * classifyContextNeeds (P1 #11's context classifier/router), then retrieves only the chunks
 * that actually match this specific question (via match_document_chunks' venture-scoped
 * similarity search), instead of every document up to some fixed count/length. Used by the
 * text chat path directly; the Live path uses the same underlying searchDocumentChunks through
 * the search_company_knowledge tool instead (see app/api/rag/search/route.ts), since Live's
 * per-turn tool-calling model fits that surface better than a single pre-built context.
 */
export async function retrieveCompanyKnowledgeContext(params: {
  userId: string;
  ventureId: string;
  query: string;
}): Promise<CompanyKnowledgeContext> {
  if (!classifyContextNeeds(params.query).needsDocumentRetrieval) {
    return { attempted: false, evidenceStatus: "no_match", promptText: NOT_ATTEMPTED_TEXT, sources: [] };
  }

  const startedAt = Date.now();
  const result = await searchDocumentChunks({ userId: params.userId, ventureId: params.ventureId, query: params.query });
  const latencyMs = Date.now() - startedAt;

  // P0 #3: send retrieval health to AI Ops regardless of outcome -- success and no_match are
  // both "the system worked," just with a different result, and are worth the same visibility
  // as an actual failure for future rate calculations (P1 #4's telemetry work builds on this).
  void logAIOperationServer({
    userId: params.userId,
    ventureId: params.ventureId,
    ceremony: "ad_hoc_decision",
    geminiModel: "gemini-embedding-2",
    toolRequested: "rag_retrieval",
    toolArguments: { queryLength: params.query.length },
    toolResult: { status: result.status, chunkCount: result.chunks.length, error: result.error },
    reasoningCategory: "de_risking",
    latencyMs,
    success: result.status === "success" || result.status === "no_match",
  });

  const evidenceStatus = toEvidenceStatus(result.status);

  if (evidenceStatus === "retrieval_unavailable") {
    return { attempted: true, evidenceStatus, promptText: UNAVAILABLE_TEXT, sources: [] };
  }
  if (evidenceStatus === "no_match") {
    return { attempted: true, evidenceStatus, promptText: NO_MATCH_TEXT, sources: [] };
  }

  const promptText = result.chunks
    .map((chunk) => `[${chunk.title}${chunk.section ? ` — ${chunk.section}` : ""}]\n${chunk.content}`)
    .join("\n\n");

  return {
    attempted: true,
    evidenceStatus,
    promptText,
    sources: result.chunks.map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.title,
      section: chunk.section,
      similarity: chunk.similarity,
    })),
  };
}
