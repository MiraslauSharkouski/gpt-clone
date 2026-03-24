/**
 * Chunk text into smaller pieces for embedding
 * Uses a simple token-based approach with overlap
 */
export interface ChunkOptions {
  chunkSize?: number; // characters per chunk
  overlap?: number;   // overlap between chunks
}

const DEFAULT_CHUNK_SIZE = 2000; // ~500 tokens
const DEFAULT_OVERLAP = 200;

/**
 * Split text into chunks with overlap
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_OVERLAP,
  } = options;

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // If we're at the end, just take the rest
    if (end >= text.length) {
      const chunk = text.slice(start).trim();
      if (chunk) chunks.push(chunk);
      break;
    }

    // Try to break at a sentence boundary
    let breakPoint = text.lastIndexOf('.', end);
    if (breakPoint <= start) {
      // Fall back to paragraph boundary
      breakPoint = text.lastIndexOf('\n\n', end);
    }
    if (breakPoint <= start) {
      // Fall back to word boundary
      breakPoint = text.lastIndexOf(' ', end);
    }
    if (breakPoint <= start) {
      // Just cut at chunkSize
      breakPoint = end;
    }

    const chunk = text.slice(start, breakPoint).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    // Move start with overlap
    start = breakPoint + 1;
    if (chunks.length > 1 && start > overlap) {
      start = Math.max(start - overlap, 0);
      // Re-adjust to find a good break point for overlap
      const overlapText = text.slice(start, start + overlap);
      const sentenceEnd = overlapText.lastIndexOf('.');
      if (sentenceEnd > 0) {
        start += sentenceEnd + 1;
      }
    }

    // Prevent infinite loop
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Estimate number of tokens in text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
