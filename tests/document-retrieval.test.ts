import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { dockerAvailable, startTestDb, type TestDb } from "./db/testDb";

// P1 #7 (docs/founderally-updated-todo.md): "Never allow cross-venture document leakage" is
// the one hard invariant this item calls out explicitly, so it gets a real test against the
// actual match_document_chunks() SQL function (see
// supabase/migrations/20260822100000_document_chunk_embeddings.sql), not just a read of the
// code. Embeddings here are small hand-built basis vectors (orthogonal = similarity 0,
// identical = similarity 1) rather than real Gemini calls -- this is testing the SQL
// function's filtering/ranking, not embedding quality.
//
// Skips (doesn't fail) when Docker isn't available locally.

const DIMENSIONS = 1536;

function basisVector(dimension: number): number[] {
  const vector = new Array(DIMENSIONS).fill(0);
  vector[dimension] = 1;
  return vector;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function seedDocumentAndChunk(
  pool: Pool,
  params: { userId: string; ventureId: string; title: string; section?: string | null; content: string; embedding: number[] },
): Promise<void> {
  const documentId = `doc-${randomUUID()}`;
  await pool.query(
    `insert into venture_documents (id, user_id, venture_id, title, category, content)
     values ($1, $2, $3, $4, 'PRD', $5)`,
    [documentId, params.userId, params.ventureId, params.title, params.content],
  );
  await pool.query(
    `insert into document_chunks (id, document_id, user_id, venture_id, title, section, chunk_index, content, embedding, embedding_model)
     values ($1, $2, $3, $4, $5, $6, 0, $7, $8::vector, 'test-model')`,
    [
      `chunk-${documentId}-0`,
      documentId,
      params.userId,
      params.ventureId,
      params.title,
      params.section ?? null,
      params.content,
      toVectorLiteral(params.embedding),
    ],
  );
}

async function matchChunks(
  pool: Pool,
  params: { ventureId: string; userId: string; queryEmbedding: number[]; matchCount?: number; minSimilarity?: number },
) {
  const { rows } = await pool.query(
    `select * from match_document_chunks($1, $2, $3::vector, $4, $5)`,
    [
      params.ventureId,
      params.userId,
      toVectorLiteral(params.queryEmbedding),
      params.matchCount ?? 8,
      params.minSimilarity ?? 0.5,
    ],
  );
  return rows;
}

test("document chunk retrieval invariants", { skip: dockerAvailable() ? false : "Docker is not available in this environment" }, async (t) => {
  let db: TestDb;

  t.before(async () => {
    db = await startTestDb();
  });
  t.after(async () => {
    await db.stop();
  });

  await t.test("never returns another venture's chunks, even when they'd score a perfect match", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureA = `venture_${randomUUID()}`;
    const ventureB = `venture_${randomUUID()}`;
    const query = basisVector(0);

    // ventureB's chunk is an exact match for the query (similarity 1.0); ventureA has no
    // chunks at all. If venture scoping ever leaked, querying under ventureA would surface
    // ventureB's chunk since it's the only thing that matches well.
    await seedDocumentAndChunk(db.pool, {
      userId,
      ventureId: ventureB,
      title: "Venture B's confidential roadmap",
      content: "This belongs to a different venture entirely.",
      embedding: basisVector(0),
    });

    const results = await matchChunks(db.pool, { ventureId: ventureA, userId, queryEmbedding: query, minSimilarity: 0 });
    assert.deepEqual(results, [], "querying venture A must never surface venture B's chunks");
  });

  await t.test("does not leak across ventures even for the same user with chunks in both", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureA = `venture_${randomUUID()}`;
    const ventureB = `venture_${randomUUID()}`;

    await seedDocumentAndChunk(db.pool, {
      userId, ventureId: ventureA, title: "Venture A doc", content: "Venture A content.", embedding: basisVector(0),
    });
    await seedDocumentAndChunk(db.pool, {
      userId, ventureId: ventureB, title: "Venture B doc", content: "Venture B content.", embedding: basisVector(0),
    });

    const results = await matchChunks(db.pool, { ventureId: ventureA, userId, queryEmbedding: basisVector(0), minSimilarity: 0 });
    assert.equal(results.length, 1);
    assert.equal(results[0].title, "Venture A doc");
  });

  await t.test("ranks by similarity and respects the minimum-similarity threshold", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    const query = basisVector(0);

    // Exact match (similarity 1.0).
    await seedDocumentAndChunk(db.pool, {
      userId, ventureId, title: "Exact match", content: "Directly relevant evidence.", embedding: basisVector(0),
    });
    // Orthogonal (similarity 0.0) -- must be excluded by the default 0.5 threshold.
    await seedDocumentAndChunk(db.pool, {
      userId, ventureId, title: "Unrelated", content: "Completely unrelated content.", embedding: basisVector(1),
    });
    // A partial match with cosine similarity slightly above 0.5 (two equal components vs. one).
    const partial = new Array(DIMENSIONS).fill(0);
    partial[0] = 1;
    partial[2] = 1;
    await seedDocumentAndChunk(db.pool, {
      userId, ventureId, title: "Partial match", content: "Somewhat related content.", embedding: partial,
    });

    const results = await matchChunks(db.pool, { ventureId, userId, queryEmbedding: query, minSimilarity: 0.5 });
    const titles = results.map((r) => r.title);
    assert.deepEqual(titles, ["Exact match", "Partial match"], "results must be ranked best-first and exclude anything below the threshold");
    assert.ok(Math.abs(Number(results[0].similarity) - 1) < 1e-6, "the exact match's similarity must be ~1.0");
  });

  await t.test("match_count caps the number of results returned", async () => {
    const userId = `user_${randomUUID()}`;
    const ventureId = `venture_${randomUUID()}`;
    for (let i = 0; i < 5; i++) {
      await seedDocumentAndChunk(db.pool, {
        userId, ventureId, title: `Doc ${i}`, content: `Content ${i}`, embedding: basisVector(0),
      });
    }
    const results = await matchChunks(db.pool, { ventureId, userId, queryEmbedding: basisVector(0), matchCount: 2, minSimilarity: 0 });
    assert.equal(results.length, 2);
  });
});
