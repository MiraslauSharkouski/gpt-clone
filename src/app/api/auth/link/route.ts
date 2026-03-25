import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * POST /api/auth/link
 * Link anonymous session to authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { session_id, user_id } = await req.json();

    if (!session_id || !user_id) {
      return NextResponse.json(
        { error: "session_id and user_id are required" },
        { status: 400 },
      );
    }

    // Update anonymous session to mark as upgraded
    const { error } = await (supabase.from("anonymous_sessions") as any)
      .update({
        upgraded_to_user_id: user_id,
        expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .eq("session_id", session_id);

    if (error) {
      console.error("Failed to link session:", error);
    }

    // Transfer anonymous chats to authenticated user
    const { error: chatsError } = await (supabase.from("chats") as any)
      .update({ user_id: user_id })
      .eq("user_id", session_id);

    if (chatsError) {
      console.error("Failed to transfer chats:", chatsError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link auth error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
