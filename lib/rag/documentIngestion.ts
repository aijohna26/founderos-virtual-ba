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
      embeddedCount = embedded.length;
      await Promise.all(
        embedded.map(({ id, embedding }) =>
          admin
            .from("document_chunks")
            .update({ embedding, embedding_model: GEMINI_CONFIG.EMBEDDING_MODEL })
            .eq("id", id)
            .eq("user_id", doc.userId),
        ),
      );
    }

    // Review finding: this used to land on 'ready' the moment chunks were stored, even when
    // every embedding call failed -- a document could read "ready" while actually invisible
    // to semantic search. embedding_status is the honest signal for that specific question;
    // ingestion_status only ever answers "are the stored chunks current."
    const embeddingStatus: "ready" | "partial" | "failed" =
      chunks.length === 0 || embeddedCount === chunks.length ? "ready" : embeddedCount === 0 ? "failed" : "partial";

    const { error: readyError } = await admin
      .from("venture_documents")
      .update({ ingestion_status: "ready", ingested_at: new Date().toISOString(), embedding_status: embeddingStatus })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    if (readyError) throw new Error(`failed to mark ingestion ready: ${readyError.message}`);

    return { ok: true, chunkCount: chunks.length, embeddedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Document ingestion failed:", { documentId: doc.id, userId: doc.userId, error: message });
    await admin
      .from("venture_documents")
      .update({ ingestion_status: "failed", embedding_status: "failed" })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    return { ok: false, error: message };
  }
}
