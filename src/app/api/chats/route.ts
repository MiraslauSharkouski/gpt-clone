import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getOrCreateUserId } from './utils';

/**
 * GET /api/chats
 * List all chats for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const userId = await getOrCreateUserId(req, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch chats:', error);
      return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Chats list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/chats
 * Create a new chat
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const userId = await getOrCreateUserId(req, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, messages } = await req.json();

    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        title: title || 'New Chat',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create chat:', error);
      return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
    }

    // Insert initial messages if provided
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const { error: messagesError } = await supabase
        .from('messages')
        .insert(
          messages.map((msg: { role: string; content: string }) => ({
            chat_id: chat.id,
            role: msg.role,
            content: msg.content,
          }))
        );

      if (messagesError) {
        console.error('Failed to insert initial messages:', messagesError);
      }
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Create chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
