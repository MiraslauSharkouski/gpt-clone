import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  generateEmbedding,
  searchRelevantChunks,
  formatContext,
} from "@/lib/rag";

/**
 * POST /api/chats/[id]/context
 * Trigger RAG: search embeddings and return context
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const { id: chatId } = await params;
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify chat exists and belongs to user
    const { data: chat } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .single();

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);

    // Search for relevant chunks
    const chunks = await searchRelevantChunks({
      queryEmbedding,
      chatId,
      topK: 4,
    });

    // Format context
    const context = formatContext(chunks);

    return NextResponse.json({
      context,
      chunks: chunks.map((c) => ({
        text: c.text,
        similarity: Math.round(c.similarity * 1000) / 1000,
      })),
    });
  } catch (error) {
    console.error("Context search error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
