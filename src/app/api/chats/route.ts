import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { generateSessionId, hashIpAddress } from "@/lib/utils/helpers";

/**
 * GET /api/chats
 * List all chats for the current user (or anonymous session)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Get session info - handle case where table might not exist
    let userId = sessionId;
    try {
      const { data: session, error: sessionError } = await supabase
        .from("anonymous_sessions")
        .select("upgraded_to_user_id")
        .eq("session_id", sessionId)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!sessionError && session?.upgraded_to_user_id) {
        userId = session.upgraded_to_user_id;
      }
    } catch (e) {
      // Table might not exist, just use sessionId as userId
      console.log("Anonymous sessions table not available, using sessionId");
    }

    const { data: chats, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch chats:", error);
      return NextResponse.json(
        { error: "Failed to fetch chats" },
        { status: 500 },
      );
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Chats list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/chats
 * Create a new chat (supports anonymous users)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    let userId: string;
    let isNewSession = false;

    if (!sessionId) {
      // Create new anonymous session
      const newSessionId = generateSessionId();
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
      const ipHash = hashIpAddress(ip);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Try to create session record, but don't fail if table doesn't exist
      try {
        await supabase.from("anonymous_sessions").insert({
          session_id: newSessionId,
          ip_hash: ipHash,
          message_count: 0,
          expires_at: expiresAt.toISOString(),
        } as any);
      } catch (e) {
        console.log("Could not create session record, continuing anyway");
      }

      userId = newSessionId;
      isNewSession = true;
    } else {
      // Use existing session
      userId = sessionId;

      // Try to verify session exists
      try {
        const { data: session } = (await supabase
          .from("anonymous_sessions")
          .select("upgraded_to_user_id, expires_at")
          .eq("session_id", sessionId)
          .single()) as {
          data: { upgraded_to_user_id?: string; expires_at: string } | null;
          error?: any;
        };

        if (session?.upgraded_to_user_id) {
          userId = session.upgraded_to_user_id;
        } else if (session && new Date(session.expires_at) < new Date()) {
          // Session expired, create new one
          const newSessionId = generateSessionId();
          const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
          const ipHash = hashIpAddress(ip);
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          try {
            await supabase.from("anonymous_sessions").insert({
              session_id: newSessionId,
              ip_hash: ipHash,
              message_count: 0,
              expires_at: expiresAt.toISOString(),
            } as any);
          } catch (e) {}

          userId = newSessionId;
          isNewSession = true;
        }
      } catch (e) {
        // Table might not exist, just use existing sessionId
      }
    }

    const { title } = await req.json().catch(() => ({}));

    const { data: chat, error } = (await supabase
      .from("chats")
      .insert({
        user_id: userId,
        title: title || "New Chat",
      } as any)
      .select()
      .single()) as { data: any; error?: any };

    if (error) {
      console.error("Failed to create chat:", error);
      return NextResponse.json(
        { error: "Failed to create chat: " + error.message },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ chat });

    // Set cookie if new session
    if (isNewSession) {
      response.cookies.set("anonymous_session", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Create chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
