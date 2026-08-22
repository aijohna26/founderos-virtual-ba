-- P1 #6 (docs/founderally-updated-todo.md): proper document ingestion. Chunks are generated
-- in application code (lib/rag/documentIngestion.ts calls lib/rag/documentChunker.ts) rather
-- than in SQL -- text chunking logic is much easier to test and maintain in TypeScript than
-- plpgsql -- so this migration only adds the storage and the "does this need re-chunking"
-- signal, not the chunking itself.

alter table public.venture_documents
  add column if not exists content_hash text,
  add column if not exists ingestion_status text not null default 'pending'
    check (ingestion_status in ('pending', 'processing', 'ready', 'failed')),
  add column if not exists ingested_at timestamptz;

-- Chunks belong to one document (composite FK against venture_documents' own composite PK,
-- since it has no single-column id). ON DELETE CASCADE means deleting a document via
-- DELETE /api/persistence (documents) automatically removes its chunks -- no separate cleanup
-- code needed in that route.
create table if not exists public.document_chunks (
  id text primary key,
  document_id text not null,
  user_id text not null,
  venture_id text not null,
  -- Denormalized from venture_documents so retrieval (item #8) and provenance display
  -- (item #9) never need a join just to show "which document is this evidence from."
  title text not null,
  section text,
  chunk_index integer not null,
  content text not null,
  created_at timestamptz not null default now(),
  foreign key (document_id, user_id) references public.venture_documents (id, user_id) on delete cascade
);

create index if not exists document_chunks_document_idx
  on public.document_chunks (document_id, user_id, chunk_index);
create index if not exists document_chunks_venture_idx
  on public.document_chunks (venture_id);

alter table public.document_chunks enable row level security;

drop policy if exists "owner can select" on public.document_chunks;
create policy "owner can select" on public.document_chunks
  for select using ((auth.jwt() ->> 'sub') = user_id);

-- No insert/update/delete policy: only the service-role key (getSupabaseAdmin(), used by
-- lib/rag/documentIngestion.ts via app/api/persistence) may write to this table.

-- Defense in depth, independent of the application remembering to call ingestDocument():
-- flags a document as needing re-ingestion whenever its content actually changes (not on
-- every unrelated update, e.g. a future title/category-only edit), and always on first
-- insert. The actual re-chunking still happens in application code -- this only makes the
-- need for it visible in ingestion_status even if some future write path skips the app-level
-- call.
create or replace function public.mark_document_ingestion_pending()
returns trigger
language plpgsql
as $$
declare
  v_new_hash text := md5(new.content);
begin
  if tg_op = 'INSERT' or v_new_hash is distinct from old.content_hash then
    new.content_hash := v_new_hash;
    new.ingestion_status := 'pending';
    new.ingested_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists document_ingestion_pending on public.venture_documents;
create trigger document_ingestion_pending
  before insert or update on public.venture_documents
  for each row execute function public.mark_document_ingestion_pending();
