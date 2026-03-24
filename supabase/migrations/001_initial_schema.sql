-- ChatGPT Clone - Initial Database Schema
-- Run with: npx supabase db push

-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- ============================================
-- PROFILES TABLE (extends Supabase Auth)
-- ============================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  is_anonymous boolean default false,
  anonymous_session_id text unique,
  usage_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_anonymous_session on profiles(anonymous_session_id) where anonymous_session_id is not null;

-- ============================================
-- CHATS TABLE
-- ============================================
create table chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text default 'New Chat',
  is_deleted boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chats_user_updated on chats(user_id, updated_at desc) where not is_deleted;
create index idx_chats_user_id on chats(user_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
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

-- ============================================
-- DOCUMENTS TABLE (for RAG)
-- ============================================
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
create index idx_documents_processed on documents(processed) where not processed;

-- ============================================
-- DOCUMENT CHUNKS TABLE (with pgvector)
-- ============================================
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  chunk_text text not null,
  embedding vector(1536),
  chunk_index int not null,
  metadata jsonb default '{}'
);

-- IVFFlat index for efficient cosine similarity search
create index idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_document_chunks_doc on document_chunks(document_id);

-- ============================================
-- ANONYMOUS SESSIONS TABLE
-- ============================================
create table anonymous_sessions (
  session_id text primary key,
  ip_hash text not null,
  message_count int default 0,
  upgraded_to_user_id uuid references profiles(id),
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

create index idx_anonymous_sessions_expires on anonymous_sessions(expires_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table chats enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table document_chunks enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Service role can insert profiles"
  on profiles for insert with check (true);

-- Chats policies
create policy "Users can view their own chats"
  on chats for select using (auth.uid() = user_id);

create policy "Users can create chats"
  on chats for insert with check (auth.uid() = user_id);

create policy "Users can update their own chats"
  on chats for update using (auth.uid() = user_id);

create policy "Users can delete their own chats"
  on chats for delete using (auth.uid() = user_id);

-- Messages policies
create policy "Users can view messages in their chats"
  on messages for select using (
    exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

create policy "Users can insert messages in their chats"
  on messages for insert with check (
    exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

create policy "Users can delete messages in their chats"
  on messages for delete using (
    exists (select 1 from chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
  );

-- Documents policies
create policy "Users can view documents in their chats"
  on documents for select using (
    exists (select 1 from chats where chats.id = documents.chat_id and chats.user_id = auth.uid())
  );

create policy "Users can insert documents in their chats"
  on documents for insert with check (
    exists (select 1 from chats where chats.id = documents.chat_id and chats.user_id = auth.uid())
  );

create policy "Users can delete documents in their chats"
  on documents for delete using (
    exists (select 1 from chats where chats.id = documents.chat_id and chats.user_id = auth.uid())
  );

-- Document chunks policies
create policy "Users can view chunks from their documents"
  on document_chunks for select using (
    exists (
      select 1 from documents join chats on chats.id = documents.chat_id
      where documents.id = document_chunks.document_id and chats.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_chats_updated_at before update on chats
  for each row execute function update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, is_anonymous, created_at, updated_at)
  values (new.id, new.email, false, now(), now());
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function check_usage_limit(p_session_id text)
returns table (allowed boolean, message_count int, upgrade_required boolean) as $$
declare
  v_message_count int;
begin
  select message_count into v_message_count
  from anonymous_sessions where session_id = p_session_id and expires_at > now();

  if v_message_count is null then
    return query select false, 0, true;
  elsif v_message_count >= 3 then
    return query select false, v_message_count, true;
  else
    return query select true, v_message_count, false;
  end if;
end;
$$ language plpgsql security definer;

create or replace function increment_anonymous_usage(p_session_id text)
returns table (success boolean, new_count int, upgrade_required boolean) as $$
declare
  v_new_count int;
begin
  update anonymous_sessions
  set message_count = message_count + 1
  where session_id = p_session_id and expires_at > now() and message_count < 3
  returning message_count into v_new_count;

  if v_new_count is null then
    select message_count into v_new_count
    from anonymous_sessions where session_id = p_session_id and expires_at > now();
    if v_new_count is not null and v_new_count >= 3 then
      return query select false, v_new_count, true;
    end if;
    return query select false, 0, true;
  end if;

  return query select true, v_new_count, false;
end;
$$ language plpgsql security definer;
