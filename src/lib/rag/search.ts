import { createServerClient } from '@/lib/supabase/client';

/**
 * Search for relevant document chunks using vector similarity
 */
export async function searchRelevantChunks({
  queryEmbedding,
  chatId,
  topK = 4,
}: {
  queryEmbedding: number[];
  chatId: string;
  topK?: number;
}): Promise<{ text: string; similarity: number }[]> {
  const supabase = createServerClient();

  // Use pgvector cosine similarity search
  const { data, error } = await supabase.rpc('search_document_chunks', {
    query_embedding: queryEmbedding,
    match_chat_id: chatId,
    match_count: topK,
  });

  if (error) {
    // Fallback: manual query if RPC doesn't exist
    const fallbackResult = await supabase
      .from('document_chunks')
      .select('chunk_text, embedding, documents!inner(chat_id)')
      .eq('documents.chat_id', chatId)
      .limit(topK * 3); // Get more and sort manually

    if (fallbackResult.error) {
      console.error('Search error:', fallbackResult.error);
      return [];
    }

    // Calculate similarity manually
    const results = fallbackResult.data
      .map((item: { chunk_text: string; embedding: number[] | null }) => {
        if (!item.embedding) return null;
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);
        return { text: item.chunk_text, similarity };
      })
      .filter(Boolean)
      .sort((a, b) => b!.similarity - a!.similarity)
      .slice(0, topK);

    return results;
  }

  return data || [];
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Format retrieved chunks as context for the LLM
 */
export function formatContext(chunks: { text: string; similarity: number }[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .map((chunk, index) => `[Context ${index + 1}]: ${chunk.text}`)
    .join('\n\n');
}
