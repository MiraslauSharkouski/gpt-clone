import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * GET /api/auth/check
 * Check if the current session is valid and get usage info
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get('anonymous_session')?.value;

    if (!sessionId) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: true,
      });
    }

    // Check anonymous session
    const { data: session } = await supabase
      .from('anonymous_sessions')
      .select('message_count, expires_at, upgraded_to_user_id')
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: true,
      });
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: true,
      });
    }

    // Check if upgraded to authenticated user
    if (session.upgraded_to_user_id) {
      return NextResponse.json({
        is_authenticated: true,
        upgrade_required: false,
        usage_count: session.message_count,
      });
    }

    // Check usage limit
    const upgradeRequired = session.message_count >= 3;

    return NextResponse.json({
      is_authenticated: false,
      upgrade_required: upgradeRequired,
      usage_count: session.message_count,
      remaining: Math.max(0, 3 - session.message_count),
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
