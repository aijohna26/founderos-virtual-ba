import "server-only";

import { searchDocumentChunks } from "@/lib/rag/retrieval";
import { shouldAttemptCompanyKnowledgeRetrieval } from "@/lib/rag/retrievalGate";

export interface CompanyKnowledgeSource {
  documentId: string;
  title: string;
  section: string | null;
  similarity: number;
}

export interface CompanyKnowledgeContext {
  /** Whether retrieval was actually attempted (false when the gate skipped it entirely). */
  attempted: boolean;
  /** Ready to drop straight into a system prompt in place of the old wholesale document dump. */
  promptText: string;
  /** Structured provenance (P1 #9) for the client to display and for the caller to return alongside the reply. */
  sources: CompanyKnowledgeSource[];
}

const NO_EVIDENCE_TEXT = "No company documents were retrieved as relevant to this specific question.";

/**
 * Replaces the old "inject every saved document into every prompt" pattern: gates on
 * shouldAttemptCompanyKnowledgeRetrieval, then retrieves only the chunks that actually match
 * this specific question (via match_document_chunks' venture-scoped similarity search),
 * instead of every document up to some fixed count/length. Used by the text chat path
 * directly; the Live path uses the same underlying searchDocumentChunks through the
 * search_company_knowledge tool instead (see app/api/rag/search/route.ts), since Live's
 * per-turn tool-calling model fits that surface better than a single pre-built context.
 */
export async function retrieveCompanyKnowledgeContext(params: {
  userId: string;
  ventureId: string;
  query: string;
}): Promise<CompanyKnowledgeContext> {
  if (!shouldAttemptCompanyKnowledgeRetrieval(params.query)) {
    return { attempted: false, promptText: NO_EVIDENCE_TEXT, sources: [] };
  }

  const chunks = await searchDocumentChunks({ userId: params.userId, ventureId: params.ventureId, query: params.query });
  if (chunks.length === 0) {
    return { attempted: true, promptText: NO_EVIDENCE_TEXT, sources: [] };
  }

  const promptText = chunks
    .map((chunk) => `[${chunk.title}${chunk.section ? ` — ${chunk.section}` : ""}]\n${chunk.content}`)
    .join("\n\n");

  return {
    attempted: true,
    promptText,
    sources: chunks.map((chunk) => ({
      documentId: chunk.documentId,
      title: chunk.title,
      section: chunk.section,
      similarity: chunk.similarity,
    })),
  };
}
