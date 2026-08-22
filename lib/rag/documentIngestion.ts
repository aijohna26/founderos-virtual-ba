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
  | { ok: true; chunkCount: number }
  | { ok: false; error: string };

/**
 * (Re-)chunks one document and replaces its stored chunks. Called synchronously right after
 * every document upsert in app/api/persistence/route.ts -- there's no queue/cron here, since
 * chunking is cheap, deterministic, and local (no network call, unlike item #7's embeddings
 * step, which is why that one *will* need to tolerate being slower/flakier). Safe to call
 * repeatedly for the same document: it always fully replaces that document's chunk set,
 * keyed by (document_id, user_id), so a retry or a duplicate call is a harmless no-op past
 * the first successful run with the same content.
 *
 * Never throws -- a failed ingestion must not take down the document save it's attached to;
 * the document keeps whatever content the user saved either way. Failure just means the
 * document is left/marked 'failed' in ingestion_status for admin visibility, with no chunks
 * (or its previous chunks) available to retrieval until a later save succeeds.
 *
 * Also embeds the new chunks (P1 #7) so they're immediately searchable. Unlike chunking
 * itself, embedding is a network call to Gemini and can legitimately fail/degrade without
 * that meaning ingestion as a whole failed -- a chunk that didn't get an embedding this time
 * is still stored and still displayed as document content, just invisible to vector
 * retrieval until a later save re-embeds it (embedChunksForIndexing never throws, so a
 * partial or total embedding failure here still lets ingestion_status land on 'ready').
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

    if (chunks.length > 0) {
      const { error: insertError } = await admin.from("document_chunks").insert(
        chunks.map((chunk) => ({
          id: `chunk-${doc.id}-${chunk.index}`,
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
        chunks: chunks.map((chunk) => ({ id: `chunk-${doc.id}-${chunk.index}`, content: chunk.content })),
      });
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

    const { error: readyError } = await admin
      .from("venture_documents")
      .update({ ingestion_status: "ready", ingested_at: new Date().toISOString() })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    if (readyError) throw new Error(`failed to mark ingestion ready: ${readyError.message}`);

    return { ok: true, chunkCount: chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Document ingestion failed:", { documentId: doc.id, userId: doc.userId, error: message });
    await admin
      .from("venture_documents")
      .update({ ingestion_status: "failed" })
      .eq("id", doc.id)
      .eq("user_id", doc.userId);
    return { ok: false, error: message };
  }
}
