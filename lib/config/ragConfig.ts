// P1 #7-8 (docs/founderally-updated-todo.md): document-chunk embedding/retrieval tuning.
// Centralized so nothing hardcodes these at the call site.

// gemini-embedding-2 supports 128-3072 dimensions, recommending 768/1536/3072 as the
// supported truncation points (it's a Matryoshka-style embedding, so truncating to one of
// these isn't a quality hack). Chosen at 1536, not the 3072 default: pgvector's ANN index
// types (ivfflat/hnsw) cap out at 2000 dimensions, so 3072 would be stuck doing exact scans
// forever; 1536 keeps that option open once document_chunks grows enough to need it, at
// roughly half the storage/compute cost of 3072 for (per Google's own guidance) no real
// quality cliff.
export const EMBEDDING_DIMENSIONS = 1536;

// How many chunks match_document_chunks returns by default, and the minimum cosine
// similarity (0-1) a chunk must clear to be considered relevant at all -- keeps a
// completely unrelated question from dragging in irrelevant "closest available" chunks just
// because *something* is always closest.
export const DEFAULT_MATCH_COUNT = 8;
export const DEFAULT_MIN_SIMILARITY = 0.5;

// P1 #5 (docs/founderally-rag-requested-changes.md "Improve Retrieval Gating"): the higher bar
// applied when lib/agent/contextClassifier.ts's documentRetrieval tier is "optional" rather
// than "required" -- the question doesn't clearly signal it needs company evidence, so
// retrieval still runs (cheap), but only a strong match is worth injecting into the prompt;
// a marginal one is noise for a question that's really about board/sprint state instead.
export const OPTIONAL_TIER_MIN_SIMILARITY = 0.65;
