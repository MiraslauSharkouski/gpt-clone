import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

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
        { error: "session_id and email are required" },
        { status: 400 },
      );
    }

    // Validate email format
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    // Validate session_id format
    if (!session_id.startsWith("sess_")) {
      return NextResponse.json(
        { error: "Invalid session format" },
        { status: 400 },
      );
    }

    // Check if Supabase is properly configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) {
      // Development mode - simulate success and upgrade
      console.log("Development mode: Simulating upgrade for", email);

      // In dev mode, immediately mark as upgraded
      return NextResponse.json({
        message: "Development mode - email verified",
        email,
        dev_mode: true,
        upgraded: true,
      });
    }

    // Send magic link via Supabase Auth
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
    });

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        {
          error: "Failed to send verification email",
          details: authError.message,
        },
        { status: 500 },
      );
    }

    // Store session info for upgrade completion after email verification
    try {
      await supabase.from("anonymous_sessions").upsert(
        {
          session_id,
          ip_hash: "pending",
          message_count: 0,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as any,
        {
          onConflict: "session_id",
        },
      );
    } catch (e) {
      console.log("Could not store session for upgrade");
    }

    return NextResponse.json({
      message: "Verification email sent. Click the link to complete upgrade.",
      email,
      pending_verification: true,
    });
  } catch (error) {
    console.error("Upgrade auth error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
