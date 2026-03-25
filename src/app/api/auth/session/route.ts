import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/auth/session
 * Get current session and user info
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    // Get authenticated user from auth cookies
    const authCookie = req.cookies.get(
      "sb-" +
        process.env.NEXT_PUBLIC_SUPABASE_URL?.split("/")[2]?.split(".")[0] +
        "-auth-token",
    )?.value;

    let user = null;
    if (authCookie) {
      try {
        const authData = JSON.parse(decodeURIComponent(authCookie));
        if (authData?.user) {
          user = authData.user;
        }
      } catch (e) {
        // Cookie parsing failed
      }
    }

    // Fallback: try to get user from Supabase
    if (!user) {
      try {
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();
        user = supabaseUser;
      } catch (e) {
        // Not authenticated
      }
    }

    if (user) {
      // User is authenticated
      return NextResponse.json({
        is_authenticated: true,
        email: user.email,
        user_id: user.id,
        session_id: sessionId,
      });
    }

    // Check anonymous session
    if (!sessionId) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: false,
      });
    }

    // Get anonymous session info
    const { data: session, error: sessionError } = (await supabase
      .from("anonymous_sessions")
      .select("message_count, expires_at, upgraded_to_user_id, pending_email")
      .eq("session_id", sessionId)
      .single()) as {
      data: {
        message_count: number;
        expires_at: string;
        upgraded_to_user_id?: string;
        pending_email?: string;
      } | null;
      error?: any;
    };

    if (sessionError || !session) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: false,
        session_id: sessionId,
      });
    }

    // Check if session expired
    if (new Date((session as any).expires_at) < new Date()) {
      return NextResponse.json({
        is_authenticated: false,
        upgrade_required: true,
        expired: true,
      });
    }

    // Check if upgraded
    if ((session as any).upgraded_to_user_id) {
      return NextResponse.json({
        is_authenticated: true,
        upgrade_required: false,
        usage_count: (session as any).message_count,
      });
    }

    // Check usage limit
    const upgradeRequired = (session as any).message_count >= 3;

    return NextResponse.json({
      session_id: sessionId,
      is_authenticated: false,
      upgrade_required: upgradeRequired,
      usage_count: session.message_count,
      remaining: Math.max(0, 3 - session.message_count),
      pending_email: session.pending_email,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({
      is_authenticated: false,
      upgrade_required: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
