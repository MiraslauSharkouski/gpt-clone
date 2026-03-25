import type { QwenMessage, QwenRequest, QwenStreamResponse } from "@/types";

const QWEN_API_KEY = process.env.QWEN_API_KEY;
let QWEN_API_BASE =
  process.env.QWEN_API_BASE || "https://dashscope.aliyuncs.com/api/v1";
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen-plus";

// Detect OpenRouter and adjust endpoint
const isOpenRouter = QWEN_API_KEY?.startsWith("sk-or-");
if (isOpenRouter) {
  QWEN_API_BASE = "https://openrouter.ai/api/v1";
} else if (QWEN_API_BASE.includes("/compatible-mode")) {
  QWEN_API_BASE = QWEN_API_BASE.replace("/compatible-mode/v1", "").replace(
    "/compatible-mode",
    "",
  );
}

/**
 * System prompt for the AI assistant
 */
export const SYSTEM_PROMPT = `You are a helpful, harmless, and honest AI assistant. You provide accurate, thoughtful responses while being concise and clear. If you don't know something, say so. If the user provides context or documents, use them to inform your response but acknowledge when the context doesn't contain the answer.`;

/**
 * Check if Qwen API is configured
 */
export function isQwenConfigured(): boolean {
  return !!QWEN_API_KEY && QWEN_API_KEY !== "sk-placeholder";
}

/**
 * Create a mock stream for development/testing
 */
function createMockStream(): ReadableStream {
  const encoder = new TextEncoder();
  const mockResponse =
    "Hello! I'm Qwen AI. To enable real responses, please configure your QWEN_API_KEY in the .env.local file. I'm ready to help you with your questions!";

  return new ReadableStream({
    async start(controller) {
      const words = mockResponse.split(" ");
      for (const word of words) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: word + " " })}\n\n`,
          ),
        );
      }
      controller.enqueue(encoder.encode('data: {"done": true}\n\n'));
      controller.close();
    },
  });
}

/**
 * Call Qwen API with streaming support
 * Returns a ReadableStream for SSE responses
 */
export async function streamQwenResponse({
  messages,
  context,
  temperature = 0.7,
  maxTokens = 2048,
}: {
  messages: QwenMessage[];
  context?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ReadableStream> {
  // Return mock response if not configured
  if (!isQwenConfigured()) {
    return createMockStream();
  }

  const systemMessages: QwenMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (context) {
    systemMessages.push({
      role: "system",
      content: `Context from documents:\n${context}`,
    });
  }

  const requestBody: QwenRequest = {
    model: QWEN_MODEL,
    messages: [...systemMessages, ...messages],
    stream: true,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(`${QWEN_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QWEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${error}`);
  }

  // Create a TransformStream to process the SSE data
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Process the stream
  (async () => {
    try {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((line) => line.trim().startsWith("data:"));

        for (const line of lines) {
          const data = line.replace("data:", "").trim();
          if (data === "[DONE]") continue;

          try {
            const parsed: QwenStreamResponse = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ content })}\n\n`),
              );
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      await writer.write(encoder.encode('data: {"done": true}\n\n'));
      await writer.close();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`),
      );
      await writer.close();
    }
  })();

  return readable;
}

/**
 * Non-streaming Qwen API call for single responses
 */
export async function chatQwen({
  messages,
  context,
  temperature = 0.7,
  maxTokens = 2048,
}: {
  messages: QwenMessage[];
  context?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  // Return mock response if not configured
  if (!isQwenConfigured()) {
    return "Hello! I'm Qwen AI. To enable real responses, please configure your QWEN_API_KEY in the .env.local file.";
  }

  const systemMessages: QwenMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (context) {
    systemMessages.push({
      role: "system",
      content: `Context from documents:\n${context}`,
    });
  }

  const requestBody: QwenRequest = {
    model: QWEN_MODEL,
    messages: [...systemMessages, ...messages],
    stream: false,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(`${QWEN_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QWEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Qwen API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
