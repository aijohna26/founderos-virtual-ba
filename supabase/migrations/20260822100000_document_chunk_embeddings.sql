-- P1 #7 (docs/founderally-updated-todo.md): embeddings/vector retrieval for document_chunks
-- (created in 20260822090000_document_ingestion.sql). Requires the pgvector extension --
-- enabled by default on Supabase projects, but if this fails on yours, enable it first via
-- Database -> Extensions -> vector in the Supabase dashboard.
create extension if not exists vector;

-- 1536 dims, not gemini-embedding-2's 3072 default: pgvector's ANN index types (ivfflat/hnsw)
-- cap out at 2000 dimensions, and 1536 is one of the model's own supported truncation points
-- (not an arbitrary cut) -- see lib/config/ragConfig.ts for the full reasoning.
alter table public.document_chunks
  add column if not exists embedding vector(1536),
  add column if not exists embedding_model text;

create index if not exists document_chunks_embedding_pending_idx
  on public.document_chunks (document_id, user_id)
  where embedding is null;

-- No ANN index (ivfflat/hnsw) yet -- at this app's current (pre-launch) data scale, an exact
-- cosine-distance scan over document_chunks is fast and always exactly accurate, and every
-- pgvector ANN index type needs enough rows to tune sensibly (an ivfflat index built on a
-- near-empty table gives *worse* recall than no index at all). Add one
-- (`create index ... using hnsw (embedding vector_cosine_ops)`) once document_chunks actually
-- grows large enough (tens of thousands of rows) for a sequential scan to matter.

-- Venture-scoped similarity search: deliberately a SQL function (not left to every call site
-- to remember a .eq('venture_id', ...) filter) so cross-venture document leakage -- explicitly
-- called out as a must-never in the task doc -- is enforced at the one place this data is ever
-- read from, not just by convention in application code. p_user_id is required alongside
-- p_venture_id (not venture_id alone) because RLS on this table (see the previous migration)
-- already scopes all reads to (auth.jwt() ->> 'sub') = user_id; requiring both here keeps this
-- function's own contract just as narrow as the table's RLS policy, for defense in depth.
create or replace function public.match_document_chunks(
  p_venture_id text,
  p_user_id text,
  p_query_embedding vector(1536),
  p_match_count integer default 8,
  p_min_similarity float default 0.5
) returns table (
  id text,
  document_id text,
  title text,
  section text,
  chunk_index integer,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.title,
    dc.section,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> p_query_embedding) as similarity
  from public.document_chunks dc
  where dc.venture_id = p_venture_id
    and dc.user_id = p_user_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> p_query_embedding) >= p_min_similarity
  order by dc.embedding <=> p_query_embedding asc
  limit greatest(p_match_count, 0);
$$;
