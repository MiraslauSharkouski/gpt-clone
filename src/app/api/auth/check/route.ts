import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateSessionId, hashIpAddress } from "@/lib/utils/helpers";

/**
 * GET /api/auth/check
 * Check if the current session is valid and get usage info
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    let sessionId = req.cookies.get("anonymous_session")?.value;

    // If no session exists, create one
    if (!sessionId) {
      sessionId = generateSessionId();
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      const ipHash = hashIpAddress(ip);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      try {
        await supabase.from("anonymous_sessions").insert({
          session_id: sessionId,
          ip_hash: ipHash,
          message_count: 0,
          expires_at: expiresAt.toISOString(),
        } as any);
      } catch (e) {
        console.log("Could not create session in database (dev mode)");
      }
    }

    // Try to get session info
    let session: {
      message_count: number;
      expires_at: string;
      upgraded_to_user_id?: string;
    } | null = null;
    try {
      const { data, error } = (await supabase
        .from("anonymous_sessions")
        .select("message_count, expires_at, upgraded_to_user_id")
        .eq("session_id", sessionId)
        .single()) as {
        data: {
          message_count: number;
          expires_at: string;
          upgraded_to_user_id?: string;
        } | null;
        error?: any;
      };

      if (!error) {
        session = data;
      }
    } catch (e) {
      // Table might not exist
    }

    // If session found in database
    if (session) {
      // Check if session expired
      if (new Date(session.expires_at) < new Date()) {
        return NextResponse.json({
          session_id: sessionId,
          is_authenticated: false,
          upgrade_required: true,
          expired: true,
        });
      }

      // Check if upgraded to authenticated user
      if (session.upgraded_to_user_id) {
        return NextResponse.json({
          session_id: sessionId,
          is_authenticated: true,
          upgrade_required: false,
          usage_count: session.message_count,
        });
      }

      // Check usage limit
      const upgradeRequired = session.message_count >= 3;

      return NextResponse.json({
        session_id: sessionId,
        is_authenticated: false,
        upgrade_required: upgradeRequired,
        usage_count: session.message_count,
        remaining: Math.max(0, 3 - session.message_count),
      });
    }

    // No session in database - return dev mode response
    // Check if we have an email stored in session
    const response: any = {
      session_id: sessionId,
      is_authenticated: false,
      upgrade_required: false,
      remaining: 999,
      dev_mode: true,
    };

    // Try to get email from upgraded session
    try {
      const { data } = (await supabase
        .from("anonymous_sessions")
        .select("upgraded_to_user_id")
        .eq("session_id", sessionId)
        .single()) as any;

      if (data?.upgraded_to_user_id) {
        // Get user email
        const { data: userData } = (await supabase
          .from("profiles")
          .select("email")
          .eq("id", data.upgraded_to_user_id)
          .single()) as any;

        if (userData?.email) {
          response.email = userData.email;
          response.is_authenticated = true;
        }
      }
    } catch (e) {
      // Ignore errors
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Auth check error:", error);
    const sessionId =
      req.cookies.get("anonymous_session")?.value || "dev-session";
    return NextResponse.json({
      session_id: sessionId,
      is_authenticated: false,
      upgrade_required: false,
      remaining: 3,
      dev_mode: true,
    });
  }
}
