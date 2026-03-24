-- Migration 003: Simplified RLS for anonymous users
-- Run this in Supabase SQL Editor

-- For development, we'll use a simpler approach:
-- Anonymous sessions are stored with session_id as user_id
-- We check if the session exists and is valid

-- Drop existing policies  
drop policy if exists "Users can view their own chats" on chats;
drop policy if exists "Users can create chats" on chats;
drop policy if exists "Users can update their own chats" on chats;
drop policy if exists "Users can delete their own chats" on chats;

drop policy if exists "Users can view own chats" on chats;
drop policy if exists "Users can create chats" on chats;
drop policy if exists "Users can update own chats" on chats;
drop policy if exists "Users can delete own chats" on chats;

drop policy if exists "Users can view messages in their chats" on messages;
drop policy if exists "Users can insert messages in their chats" on messages;
drop policy if exists "Users can delete messages in their chats" on messages;

drop policy if exists "Users can view own messages" on messages;
drop policy if exists "Users can insert own messages" on messages;
drop policy if exists "Users can delete own messages" on messages;

drop policy if exists "Users can view documents in their chats" on documents;
drop policy if exists "Users can insert documents in their chats" on documents;
drop policy if exists "Users can delete documents in their chats" on documents;

drop policy if exists "Users can view own documents" on documents;
drop policy if exists "Users can insert own documents" on documents;
drop policy if exists "Users can delete own documents" on documents;

drop policy if exists "Users can view own chunks" on document_chunks;

-- Create helper function to check if user_id is valid (either auth user or valid anonymous session)
create or replace function is_valid_user(check_user_id uuid)
returns boolean
language security definer
as $$
declare
  session_count int;
begin
  -- Check if it's an authenticated user
  if check_user_id = auth.uid() then
    return true;
  end if;
  
  -- Check if it's a valid anonymous session (session_id stored as uuid text)
  select count(*) into session_count
  from anonymous_sessions
  where session_id = check_user_id::text
  and expires_at > now();
  
  return session_count > 0;
end;
$$;

-- Chats policies
create policy "Enable all for valid users" on chats for all
  using (is_valid_user(user_id::uuid))
  with check (is_valid_user(user_id::uuid));

-- Messages policies
create policy "Enable all for valid users" on messages for all
  using (
    exists (
      select 1 from chats 
      where chats.id = messages.chat_id 
      and is_valid_user(chats.user_id::uuid)
    )
  );

-- Documents policies  
create policy "Enable all for valid users" on documents for all
  using (
    exists (
      select 1 from chats 
      where chats.id = documents.chat_id 
      and is_valid_user(chats.user_id::uuid)
    )
  );

-- Document chunks policy
create policy "Users can view own chunks" on document_chunks for select
  using (
    exists (
      select 1 from documents 
      join chats on chats.id = documents.chat_id
      where documents.id = document_chunks.document_id 
      and is_valid_user(chats.user_id::uuid)
    )
  );
