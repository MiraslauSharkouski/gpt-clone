const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-v3";
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || "1536", 10);

// Check if using OpenRouter (doesn't support embeddings)
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const isOpenRouter = QWEN_API_KEY?.startsWith("sk-or-");

/**
 * Check if embedding API is configured
 */
function isEmbeddingConfigured(): boolean {
  return !!QWEN_API_KEY && QWEN_API_KEY !== "sk-placeholder" && !isOpenRouter;
}

/**
 * Generate mock embedding for development/testing
 * OpenRouter doesn't support embeddings, so we use mock embeddings
 */
function createMockEmbedding(length: number): number[] {
  // Use seeded random for consistency
  const seed = 42;
  const embeddings: number[] = [];
  for (let i = 0; i < length; i++) {
    const x = Math.sin(seed + i) * 10000;
    embeddings.push(x - Math.floor(x));
  }
  // Normalize the vector
  const norm = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
  return embeddings.map((v) => v / norm);
}

/**
 * Generate embeddings for text
 * Uses mock embeddings for OpenRouter (which doesn't support embeddings)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Return mock embedding for OpenRouter or unconfigured
  if (!isEmbeddingConfigured()) {
    return createMockEmbedding(EMBEDDING_DIM);
  }

  try {
    const response = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${QWEN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: {
            texts: [text],
          },
        }),
      },
    );

    if (!response.ok) {
      console.log("Embedding API failed, using mock embedding");
      return createMockEmbedding(EMBEDDING_DIM);
    }

    const data = await response.json();
    const embedding =
      data.output?.embeddings?.[0]?.embedding || data.data?.[0]?.embedding;

    if (!embedding || embedding.length !== EMBEDDING_DIM) {
      return createMockEmbedding(EMBEDDING_DIM);
    }

    return embedding;
  } catch (e) {
    console.log("Embedding generation failed, using mock embedding");
    return createMockEmbedding(EMBEDDING_DIM);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Return mock embeddings for OpenRouter or unconfigured
  if (!isEmbeddingConfigured()) {
    return texts.map(() => createMockEmbedding(EMBEDDING_DIM));
  }

  try {
    // Process in batches of 25 to avoid API limits
    const batchSize = 25;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch(
        "https://dashscope.aliyuncs.com/api/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${QWEN_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: {
              texts: batch,
            },
          }),
        },
      );

      if (!response.ok) {
        console.log("Embedding API failed, using mock embeddings");
        return texts.map(() => createMockEmbedding(EMBEDDING_DIM));
      }

      const data = await response.json();
      const embeddings =
        data.output?.embeddings?.map(
          (e: { embedding: number[] }) => e.embedding,
        ) || data.data?.map((e: { embedding: number[] }) => e.embedding);

      if (!embeddings) {
        return texts.map(() => createMockEmbedding(EMBEDDING_DIM));
      }

      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  } catch (e) {
    console.log("Embedding generation failed, using mock embeddings");
    return texts.map(() => createMockEmbedding(EMBEDDING_DIM));
  }
}
