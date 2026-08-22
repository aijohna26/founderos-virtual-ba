import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { chunkDocumentContent } from "@/lib/rag/documentChunker";
import { embedChunksForIndexing } from "@/lib/rag/embeddings";
import { GEMINI_CONFIG } from "@/lib/config/geminiConfig";

export interface IngestibleDocument {
  id: string;
  userId: string;
  ventureId: string;
  title: string;
  content: string;
}

export type IngestionResult =
  | { ok: true; chunkCount: number; embeddedCount: number }
  | { ok: false; error: string };

// Derived from (document_id, chunk_index) -- stable across re-ingests only as long as a
// paragraph's *position* doesn't shift, which full-replacement re-chunking doesn't guarantee
// (inserting a paragraph near the top reflows every later chunk's index). That's fine today
// since nothing references a chunk id across ingests. If citation persistence or historical
// references to specific chunks are added later (linking a past answer back to "exactly this
// evidence"), revisit this for content-hash- or section+ordinal-based stable identity instead
// -- reviewed and deliberately deferred rather than overbuilt now.
function chunkId(documentId: string, index: number): string {
  return `chunk-${documentId}-${index}`;
}

// Pure logic pulled out of ingestDocument below so the review finding it fixes (a DB write
// failure being silently miscounted as a success) has a real regression test
// (tests/document-embedding-status.test.ts) that doesn't need to mock Supabase-JS -- this repo
// has no mocking setup for that, unlike the raw-Postgres integration tests elsewhere, so a
// pure function taking already-resolved {error} shapes is the only piece of this that's
// actually testable in isolation.

/** How many of a batch of Postgres update results actually succeeded (no error). */
export function countPersistedEmbeddings(results: Array<{ error: { message?: string } | null }>): number {
  return results.filter((result) => !result.error).length;
}

export type EmbeddingIndexOutcome = "ready" | "partial" | "failed";

/** 0 chunks is vacuously "ready" (nothing to index); otherwise ready/partial/failed by count. */
export function resolveEmbeddingStatus(totalChunks: number, persistedCount: number): EmbeddingIndexOutcome {
  if (totalChunks === 0 || persistedCount === totalChunks) return "ready";
  if (persistedCount === 0) return "failed";
  return "partial";
}

/** Short, admin-safe diagnostic for a partial/failed embedding run; null when nothing to report. */
export function describeEmbeddingError(totalChunks: number, persistedCount: number, status: EmbeddingIndexOutcome): string | null {
  if (status === "ready") return null;
  if (status === "partial") return `${totalChunks - persistedCount} of ${totalChunks} chunks failed to embed.`;
  return `All ${totalChunks} chunks failed to embed.`;
}

/**
 * (Re-)chunks one document, replaces its stored chunks, and embeds them (P1 #7). Called from
 * app/api/persistence/route.ts via Next's after() -- scheduled to run once the document-save
 * response has already gone out, not awaited inline, so embedding latency never delays the
 * save itself (see that route's comment for why). Safe to call repeatedly for the same
 * document: it always fully replaces that document's chunk set, keyed by (document_id,
 * user_id), so a retry or a duplicate call is a harmless no-op past the first successful run
 * with the same content.
 *
 * Never throws -- ingestion running after the response has already been sent means there's no
 * request left to fail anyway; errors are caught, logged, and recorded in ingestion_status for
 * admin visibility instead.
 *
 * ingestion_status and embedding_status are tracked separately on purpose: ingestion_status
 * answers "are this document's stored chunks current with its content", embedding_status
 * answers "are those chunks actually searchable." They can legitimately disagree -- chunking
 * is local and (short of a bug) can't fail, but embedding is a Gemini API call and can
 * legitimately fail or partially succeed without that meaning re-chunking itself failed. A
 * chunk with no embedding is still stored and still shown as document content; it's just
 * invisible to vector retrieval until a later save re-embeds it.
 */
export async function ingestDocument(doc: IngestibleDocument): Promise<IngestionResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "supabase_not_configured" };

  try {
    await admin
      .from("venture_documents")
      .update({ ingestion_status: "processing" })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);

    const chunks = chunkDocumentContent(doc.content);

    // Replace-in-full rather than diff: chunk count/boundaries can shift on any content edit
    // (a paragraph inserted near the top reflows every chunk after it), so there's no stable
    // per-chunk identity to diff against -- delete-then-insert is simpler and correct.
    const { error: deleteError } = await admin
      .from("document_chunks")
      .delete()
      .eq("document_id", doc.id)
      .eq("user_id", doc.userId);
    if (deleteError) throw new Error(`failed to clear previous chunks: ${deleteError.message}`);

    // embeddedCount tracks chunks actually *persisted* with an embedding, not just how many
    // Gemini returned a vector for -- review finding: the previous version counted
    // embedChunksForIndexing's result length and never inspected each subsequent Postgres
    // UPDATE's own { error }, so a DB write failure after a successful Gemini call was
    // invisible: embeddedCount (and therefore embedding_status) reported success for chunks
    // that were never actually made searchable.
    let embeddedCount = 0;
    if (chunks.length > 0) {
      const { error: insertError } = await admin.from("document_chunks").insert(
        chunks.map((chunk) => ({
          id: chunkId(doc.id, chunk.index),
          document_id: doc.id,
          user_id: doc.userId,
          venture_id: doc.ventureId,
          title: doc.title,
          section: chunk.section,
          chunk_index: chunk.index,
          content: chunk.content,
        })),
      );
      if (insertError) throw new Error(`failed to insert chunks: ${insertError.message}`);

      const embedded = await embedChunksForIndexing({
        userId: doc.userId,
        ventureId: doc.ventureId,
        title: doc.title,
        chunks: chunks.map((chunk) => ({ id: chunkId(doc.id, chunk.index), content: chunk.content })),
      });
      const persistResults = await Promise.all(
        embedded.map(({ id, embedding }) =>
          admin
            .from("document_chunks")
            .update({ embedding, embedding_model: GEMINI_CONFIG.EMBEDDING_MODEL })
            .eq("id", id)
            .eq("user_id", doc.userId),
        ),
      );
      const persistedCount = countPersistedEmbeddings(persistResults);
      if (persistedCount < embedded.length) {
        const firstFailure = persistResults.find((result) => result.error);
        console.error("Failed to persist some chunk embeddings:", {
          documentId: doc.id,
          failedCount: embedded.length - persistedCount,
          firstError: firstFailure?.error?.message,
        });
      }
      embeddedCount = persistedCount;
    }

    // Review finding: this used to land on 'ready' the moment chunks were stored, even when
    // every embedding call failed -- a document could read "ready" while actually invisible
    // to semantic search. embedding_status is the honest signal for that specific question;
    // ingestion_status only ever answers "are the stored chunks current."
    const embeddingStatus = resolveEmbeddingStatus(chunks.length, embeddedCount);
    // embedding_indexed_at is deliberately *not* set to null on a partial/failed run -- a
    // prior real success shouldn't be erased just because the most recent attempt fell short.
    // embedding_error is a short diagnostic, not a raw stack trace, so it's safe to surface in
    // admin/AI Ops directly. Neither field is touched at all for an empty document (chunks
    // .length === 0): there was nothing to embed, so "ready" is vacuously true, but stamping
    // embedding_indexed_at would misrepresent it as a real indexing run that just happened.
    const embeddingUpdate: Record<string, unknown> = {
      ingestion_status: "ready",
      ingested_at: new Date().toISOString(),
      embedding_status: embeddingStatus,
    };
    if (chunks.length > 0) {
      embeddingUpdate.embedding_error = describeEmbeddingError(chunks.length, embeddedCount, embeddingStatus);
      if (embeddingStatus !== "failed") {
        embeddingUpdate.embedding_indexed_at = new Date().toISOString();
      }
    }

    const { error: readyError } = await admin
      .from("venture_documents")
      .update(embeddingUpdate)
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    if (readyError) throw new Error(`failed to mark ingestion ready: ${readyError.message}`);

    return { ok: true, chunkCount: chunks.length, embeddedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Document ingestion failed:", { documentId: doc.id, userId: doc.userId, error: message });
    await admin
      .from("venture_documents")
      .update({
        ingestion_status: "failed",
        embedding_status: "failed",
        embedding_error: `Ingestion failed before embedding could run: ${message}`,
      })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    return { ok: false, error: message };
  }
}
