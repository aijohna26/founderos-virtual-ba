import "server-only";

import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";
import { EMBEDDING_DIMENSIONS } from "@/lib/config/ragConfig";
import { recordDocumentProcessingCost } from "@/lib/billing/aiCostLedger";

// ~4 chars/token is a standard rough estimate for English text. embedContent's response
// carries no usable token count for the plain Gemini Developer API this app uses --
// EmbedContentMetadata.billableCharacterCount is Enterprise/Vertex-only -- so this is an
// estimate, same spirit as the rest of lib/config/aiPricingConfig.ts.
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// gemini-embedding-2 has no separate taskType parameter (unlike the older gemini-embedding-001)
// -- Google's current guidance is to fold the asymmetric-retrieval task directly into the
// input text instead, formatted differently for documents vs. queries.
function formatForEmbedding(text: string, mode: "document" | "query", title?: string): string {
  return mode === "query" ? `task: search result | query: ${text}` : `title: ${title ?? "Untitled"} | text: ${text}`;
}

export interface EmbeddableChunk {
  id: string;
  content: string;
}

export interface EmbeddedChunk {
  id: string;
  embedding: number[];
}

/**
 * Embeds a document's chunks in a single batched request (far cheaper than one call per
 * chunk) and records the cost against `document_processing` (P0 #5/#6's cost ledger).
 *
 * Never throws: returns whichever chunks the API actually returned embeddings for. Missing
 * entries mean "not embedded this time, still worth retrying on the next ingest" -- not a
 * hard failure of the document, since a chunk with no embedding is still stored and still
 * available, just invisible to vector retrieval until it succeeds.
 */
export async function embedChunksForIndexing(params: {
  userId: string | null;
  ventureId: string;
  title: string;
  chunks: EmbeddableChunk[];
}): Promise<EmbeddedChunk[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || params.chunks.length === 0) return [];

  const formatted = params.chunks.map((chunk) => formatForEmbedding(chunk.content, "document", params.title));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: GEMINI_CONFIG.EMBEDDING_MODEL,
      contents: formatted,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const embeddings = response.embeddings ?? [];
    const results: EmbeddedChunk[] = [];
    for (let i = 0; i < params.chunks.length; i++) {
      const values = embeddings[i]?.values;
      if (values && values.length > 0) results.push({ id: params.chunks[i].id, embedding: values });
    }

    const totalInputTokens = formatted.reduce((sum, text) => sum + estimateTokens(text), 0);
    await recordDocumentProcessingCost({
      userId: params.userId,
      ventureId: params.ventureId,
      model: GEMINI_CONFIG.EMBEDDING_MODEL,
      units: params.chunks.length,
      inputTokens: totalInputTokens,
    });

    return results;
  } catch (err) {
    console.error("Chunk embedding failed:", { ventureId: params.ventureId, title: params.title, err });
    return [];
  }
}

/** Embeds a founder's question for similarity search against match_document_chunks. */
export async function embedQueryText(query: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || query.trim().length === 0) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.embedContent({
      model: GEMINI_CONFIG.EMBEDDING_MODEL,
      contents: [formatForEmbedding(query, "query")],
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
    return response.embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.error("Query embedding failed:", err);
    return null;
  }
}
