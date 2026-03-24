import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateSessionId, hashIpAddress } from "@/lib/utils/helpers";

/**
 * POST /api/auth/anonymous
 * Create an anonymous session for unauthenticated users
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get client IP for tracking (hashed for privacy)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const ipHash = hashIpAddress(ip);

    // Create session ID
    const sessionId = generateSessionId();

    // Session expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Insert anonymous session tracking
    const { error: sessionError } = await supabase
      .from("anonymous_sessions")
      .insert({
        session_id: sessionId,
        ip_hash: ipHash,
        message_count: 0,
        expires_at: expiresAt.toISOString(),
      } as any);

    if (sessionError) {
      console.error("Failed to create session record:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    // Create response with httpOnly cookie
    const response = NextResponse.json({
      session_id: sessionId,
      usage_count: 0,
      upgrade_required: false,
    });

    response.cookies.set("anonymous_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Anonymous auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
