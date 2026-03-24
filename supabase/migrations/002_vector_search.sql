-- Migration 002: Add vector search function
-- Run with: npx supabase db push

-- Function to search document chunks by similarity
create or replace function search_document_chunks(
  query_embedding vector(1536),
  match_chat_id uuid,
  match_count int default 4
)
returns table (
  text text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.chunk_text as text,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.chat_id = match_chat_id
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
