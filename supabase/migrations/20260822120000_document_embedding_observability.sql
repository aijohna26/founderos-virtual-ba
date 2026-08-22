-- Review follow-up (docs/founderally-rag-requested-changes.md, P0 #2 "Separate Document and
-- Embedding Status"): embedding_status alone (pending/ready/partial/failed, added in
-- 20260822110000_document_embedding_status.sql) says *what* the current state is but not
-- *when* it last actually succeeded or *why* it failed -- both needed to make an embedding
-- failure something an admin can see and act on, not just a status word that quietly sits
-- there. lib/rag/documentIngestion.ts (application code, separate change) is what actually
-- populates these.
alter table public.venture_documents
  -- Distinct from ingested_at (which marks chunking completion regardless of embedding
  -- outcome): this is specifically "the last time embedding actually produced at least one
  -- indexed chunk." Not cleared by a later failed attempt -- a prior real success shouldn't
  -- be erased just because the most recent re-embed attempt failed.
  add column if not exists embedding_indexed_at timestamptz,
  -- Cleared on a fully successful embed; holds a short diagnostic (not the raw stack trace)
  -- on 'partial' (e.g. "3 of 10 chunks failed to embed") or 'failed'.
  add column if not exists embedding_error text;
