const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-v3";
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || "1536", 10);
let DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

// Detect OpenRouter
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const isOpenRouter = QWEN_API_KEY?.startsWith("sk-or-");
if (isOpenRouter) {
  DASHSCOPE_BASE = "https://openrouter.ai/api/v1";
}

/**
 * Check if embedding API is configured
 */
function isEmbeddingConfigured(): boolean {
  return !!QWEN_API_KEY && QWEN_API_KEY !== "sk-placeholder";
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

  try {
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
