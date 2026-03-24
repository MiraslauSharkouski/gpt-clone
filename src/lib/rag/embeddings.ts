const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-v3";
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || "1536", 10);
const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

/**
 * Check if embedding API is configured
 */
function isEmbeddingConfigured(): boolean {
  const apiKey = process.env.QWEN_API_KEY;
  return !!apiKey && apiKey !== "sk-placeholder";
}

/**
 * Generate mock embedding for development/testing
 */
function createMockEmbedding(length: number): number[] {
  return Array.from({ length }, () => Math.random() * 2 - 1);
}

/**
 * Generate embeddings for text using DashScope embedding API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Return mock embedding if not configured
  if (!isEmbeddingConfigured()) {
    return createMockEmbedding(EMBEDDING_DIM);
  }

  const apiKey = process.env.QWEN_API_KEY;

  const response = await fetch(`${DASHSCOPE_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: {
        texts: [text],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const embedding = data.output?.embeddings?.[0]?.embedding;

  if (!embedding || embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `Invalid embedding response: expected ${EMBEDDING_DIM} dimensions`,
    );
  }

  return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Return mock embeddings if not configured
  if (!isEmbeddingConfigured()) {
    return texts.map(() => createMockEmbedding(EMBEDDING_DIM));
  }

  const apiKey = process.env.QWEN_API_KEY;

  // Process in batches of 25 to avoid API limits
  const batchSize = 25;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch(`${DASHSCOPE_BASE}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: {
          texts: batch,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const embeddings = data.output?.embeddings?.map(
      (e: { embedding: number[] }) => e.embedding,
    );

    if (!embeddings) {
      throw new Error("Invalid embedding response");
    }

    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}
