-- Migration 004: Fix user_id type for anonymous support
-- Run this in Supabase SQL Editor

-- Drop existing tables (they will be recreated)
drop table if exists messages cascade;
drop table if exists documents cascade;
drop table if exists document_chunks cascade;
drop table if exists chats cascade;

-- Recreate chats with text user_id (supports both uuid and session_id)
create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text default 'New Chat',
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chats_user_updated on chats(user_id, updated_at desc) where not is_deleted;
create index idx_chats_user_id on chats(user_id);

-- Recreate messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_messages_chat_created on messages(chat_id, created_at);
create index idx_messages_chat_id on messages(chat_id);

-- Recreate documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references chats(id) on delete cascade not null,
  filename text not null,
  file_path text not null,
  file_type text check (file_type in ('pdf','docx','txt')) not null,
  file_size int,
  word_count int,
  processed boolean default false,
  created_at timestamptz default now()
);

create index idx_documents_chat_id on documents(chat_id);

-- Recreate document_chunks
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  chunk_text text not null,
  embedding vector(1536),
  chunk_index int not null,
  metadata jsonb default '{}'
);

create index idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_document_chunks_doc on document_chunks(document_id);

-- Disable RLS for development
alter table chats disable row level security;
alter table messages disable row level security;
alter table documents disable row level security;
alter table document_chunks disable row level security;
alter table profiles disable row level security;
alter table anonymous_sessions disable row level security;
