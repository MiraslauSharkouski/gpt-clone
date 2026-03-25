import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { streamQwenResponse } from "@/lib/qwen";
import {
  generateEmbedding,
  searchRelevantChunks,
  formatContext,
} from "@/lib/rag";

/**
 * POST /api/chats/[id]/messages
 * Send a message and stream the AI response
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const { id: chatId } = await params;
    const sessionId = req.cookies.get("anonymous_session")?.value;

    const { message, useRag } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // Check anonymous session usage
    let userId: string | null = null;
    let isAnonymous = false;

    // Try to get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    } else if (sessionId) {
      // Check anonymous session
      const { data: session } = await (
        supabase.from("anonymous_sessions") as any
      )
        .select("message_count, expires_at, upgraded_to_user_id")
        .eq("session_id", sessionId)
        .single();

      const typedSession = session as {
        message_count: number;
        expires_at: string;
        upgraded_to_user_id: string;
      } | null;

      if (!typedSession || new Date(typedSession.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "upgrade_required", message: "Session expired" },
          { status: 403 },
        );
      }

      if (typedSession.upgraded_to_user_id) {
        userId = typedSession.upgraded_to_user_id;
      } else if (typedSession.message_count >= 3) {
        return NextResponse.json(
          { error: "upgrade_required", message: "Message limit reached" },
          { status: 403 },
        );
      } else {
        isAnonymous = true;
        // Increment usage
        await (supabase.from("anonymous_sessions") as any)
          .update({ message_count: typedSession.message_count + 1 })
          .eq("session_id", sessionId);
      }
    }

    if (!userId && !isAnonymous) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify chat exists and belongs to user (or create if anonymous)
    if (userId) {
      const { data: chat } = await (supabase.from("chats") as any)
        .select("id")
        .eq("id", chatId)
        .eq("user_id", userId)
        .single();

      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
    }

    // Save user message
    const { error: insertError } = await (
      supabase.from("messages") as any
    ).insert({
      chat_id: chatId,
      role: "user",
      content: message,
    });

    if (insertError) {
      console.error("Failed to save message:", insertError);
    }

    // Get conversation history
    const { data: messages } = await (supabase.from("messages") as any)
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(20);

    // RAG: Search for relevant context if enabled
    let context: string | undefined;
    if (useRag) {
      try {
        const queryEmbedding = await generateEmbedding(message);
        const chunks = await searchRelevantChunks({
          queryEmbedding,
          chatId,
          topK: 4,
        });
        context = formatContext(chunks);
      } catch (e) {
        console.error("RAG search failed:", e);
      }
    }

    // Format messages for Qwen
    const qwenMessages = (messages || []).map(
      (m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }),
    );

    // Stream response from Qwen
    const stream = await streamQwenResponse({
      messages: qwenMessages,
      context,
    });

    // Create response with streaming
    const encoder = new TextEncoder();
    let fullResponse = "";

    const reader = stream.getReader();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const lines = text.split("\n").filter((l) => l.trim());

            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  const data = JSON.parse(line.replace("data:", "").trim());
                  if (data.content) {
                    fullResponse += data.content;
                    controller.enqueue(encoder.encode(line + "\n\n"));
                  } else if (data.done) {
                    controller.enqueue(
                      encoder.encode('data: {"done": true}\n\n'),
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Save assistant response to database (fire and forget)
          if (fullResponse) {
            await (supabase.from("messages") as any).insert({
              chat_id: chatId,
              role: "assistant",
              content: fullResponse,
              metadata: { context_used: !!context },
            });
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Messages error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
