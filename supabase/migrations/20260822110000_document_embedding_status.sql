-- Review finding on P1 #7 (docs/founderally-updated-todo.md): ingestion_status alone landed
-- on 'ready' as soon as chunks were stored, even when their embeddings failed -- so a
-- document could read "ready" while actually invisible to semantic search. Tracked as its own
-- column rather than folded into ingestion_status (avoiding a ready_text_only/ready_indexed
-- combinatorial split): ingestion_status answers "are this document's chunks up to date with
-- its content", embedding_status answers "are those chunks actually searchable" -- two
-- different questions that can genuinely disagree.
alter table public.venture_documents
  add column if not exists embedding_status text not null default 'pending'
    check (embedding_status in ('pending', 'ready', 'partial', 'failed'));

-- Reuses the same trigger that already resets ingestion_status to 'pending' on a real content
-- change (see 20260822090000_document_ingestion.sql) -- a content change means the old
-- embeddings are stale too, so embedding_status must reset alongside it.
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
    new.embedding_status := 'pending';
  end if;
  return new;
end;
$$;
