import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * POST /api/auth/upgrade
 * Upgrade anonymous session to authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { session_id, email } = await req.json();

    if (!session_id || !email) {
      return NextResponse.json(
        { error: 'session_id and email are required' },
        { status: 400 }
      );
    }

    // Verify the anonymous session exists and hasn't expired
    const { data: session } = await supabase
      .from('anonymous_sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('upgraded_to_user_id', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 400 }
      );
    }

    // Send magic link via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    // Note: The actual profile upgrade happens in a webhook or after email verification
    // For now, we just send the magic link and return success
    return NextResponse.json({
      message: 'Verification email sent',
      email,
    });
  } catch (error) {
    console.error('Upgrade auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
