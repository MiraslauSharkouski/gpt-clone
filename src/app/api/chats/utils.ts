import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get or create user ID from session
 * Returns user ID for authenticated users or anonymous session tracking
 */
export async function getOrCreateUserId(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<string | null> {
  const sessionId = req.cookies.get('anonymous_session')?.value;

  // First, try to get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return user.id;
  }

  // Fall back to anonymous session
  if (sessionId) {
    const { data: session } = await supabase
      .from('anonymous_sessions')
      .select('upgraded_to_user_id')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (session?.upgraded_to_user_id) {
      return session.upgraded_to_user_id;
    }

    // For anonymous users without upgrade, we need to handle differently
    // Return null and let the caller handle anonymous logic
    return null;
  }

  return null;
}

/**
 * Get user ID or throw if not authenticated
 */
export async function requireUserId(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<string> {
  const userId = await getOrCreateUserId(req, supabase);
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}
