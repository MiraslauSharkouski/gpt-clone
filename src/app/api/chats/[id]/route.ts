import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/chats/[id]
 * Get a specific chat with its messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Fetch chat
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .eq("user_id", sessionId)
      .eq("is_deleted", false)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to fetch messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ chat: { ...(chat as any), messages } });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/chats/[id]
 * Update chat metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const { title } = await req.json();

    const { error } = await supabase
      .from("chats")
      .update({ title })
      .eq("id", chatId)
      .eq("user_id", sessionId);

    if (error) {
      console.error("Failed to update chat:", error);
      return NextResponse.json(
        { error: "Failed to update chat" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chats/[id]
 * Soft-delete a chat
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const sessionId = req.cookies.get("anonymous_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const { id: chatId } = await params;

    const { error } = await supabase
      .from("chats")
      .update({ is_deleted: true })
      .eq("id", chatId)
      .eq("user_id", sessionId);

    if (error) {
      console.error("Failed to delete chat:", error);
      return NextResponse.json(
        { error: "Failed to delete chat" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
