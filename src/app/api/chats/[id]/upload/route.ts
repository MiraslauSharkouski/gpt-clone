import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  extractText,
  countWords,
  chunkText,
  generateEmbeddings,
} from "@/lib/rag";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_TYPES = ["pdf", "docx", "txt"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/chats/[id]/upload
 * Upload a document and process it for RAG
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient();
    const { id: chatId } = await params;

    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify chat exists and belongs to user
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !ALLOWED_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { error: `File type must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${userId}/${chatId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    // Extract text from file
    const text = await extractText(
      buffer,
      fileExtension as "pdf" | "docx" | "txt",
    );
    const wordCount = countWords(text);

    // Create document record
    const { data: document, error: docError } = await (
      supabase.from("documents") as any
    )
      .insert({
        chat_id: chatId,
        filename: file.name,
        file_path: filePath,
        file_type: fileExtension as "pdf" | "docx" | "txt",
        file_size: file.size,
        word_count: wordCount,
        processed: false,
      })
      .select()
      .single();

    if (docError) {
      console.error("Document insert error:", docError);
      // Clean up uploaded file
      await supabase.storage.from("documents").remove([filePath]);
      return NextResponse.json(
        { error: "Failed to save document record" },
        { status: 500 },
      );
    }

    // Process document: chunk and embed
    try {
      const chunks = chunkText(text, { chunkSize: 2000, overlap: 200 });

      if (chunks.length > 0) {
        // Generate embeddings in batches
        const embeddings = await generateEmbeddings(chunks);

        // Insert chunks with embeddings
        const chunkRecords = chunks.map((chunkText, index) => ({
          document_id: document.id,
          chunk_text: chunkText,
          embedding: embeddings[index],
          chunk_index: index,
        }));

        const { error: chunksError } = await (
          supabase.from("document_chunks") as any
        ).insert(chunkRecords);

        if (chunksError) {
          console.error("Chunks insert error:", chunksError);
        }
      }

      // Mark document as processed
      await (supabase.from("documents") as any)
        .update({ processed: true })
        .eq("id", document.id);
    } catch (e) {
      console.error("Document processing error:", e);
      // Don't fail the request, just mark as not processed
    }

    return NextResponse.json({
      document_id: document.id,
      filename: file.name,
      processed: true,
      word_count: wordCount,
      chunks_count: chunkText(text).length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
