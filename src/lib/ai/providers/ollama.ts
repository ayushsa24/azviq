/**
 * Ollama Provider — Wrapper around local Ollama HTTP API.
 * Acts as the FREE fallback when cloud AI is unavailable.
 * NOTE: llama3.2 can be slow on CPU — expect 10-60s response times.
 */

import { AIMessage, AIRequestConfig, STYLE_TEMPERATURE } from "../types";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_TIMEOUT_MS = 90000; // 90 second timeout

/**
 * Call Ollama for a non-streaming text response.
 */
export async function callOllamaText(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        options: { temperature: STYLE_TEMPERATURE[config.style] },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    return data.response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call Ollama for a streaming chat response.
 * Returns a ReadableStream<Uint8Array> in our NDJSON format { message: { content } }.
 * 
 * IMPORTANT: We read Ollama's stream line-by-line and re-emit in our standard format
 * so it's directly compatible with the frontend's parser.
 */
export async function callOllamaStream(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  const ollamaMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : m.role,
    content: m.content,
  }));

  if (config.systemPrompt && !ollamaMessages.find((m) => m.role === "system")) {
    ollamaMessages.unshift({ role: "system", content: config.systemPrompt });
  }

  let response: Response;
  try {
    response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: ollamaMessages,
        stream: true,
        options: { temperature: STYLE_TEMPERATURE[config.style] },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }

  if (!response.ok) {
    clearTimeout(timeout);
    throw new Error(`Ollama unavailable: ${response.statusText}`);
  }

  const encoder = new TextEncoder();
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  // Convert Ollama's NDJSON stream → our standard { message: { content } } NDJSON format
  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed) as {
                message?: { content?: string };
                done?: boolean;
              };
              const content = parsed.message?.content;
              if (content) {
                streamController.enqueue(
                  encoder.encode(
                    JSON.stringify({ message: { content } }) + "\n"
                  )
                );
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Flush remaining buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim()) as {
              message?: { content?: string };
            };
            const content = parsed.message?.content;
            if (content) {
              streamController.enqueue(
                encoder.encode(JSON.stringify({ message: { content } }) + "\n")
              );
            }
          } catch { /* ignore */ }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.warn("[Ollama] Stream timed out after", OLLAMA_TIMEOUT_MS / 1000, "seconds");
        } else {
          console.error("[Ollama] Stream error:", err.message);
        }
      } finally {
        clearTimeout(timeout);
        streamController.close();
      }
    },
    cancel() {
      clearTimeout(timeout);
      reader.cancel().catch(() => {});
    },
  });
}

/**
 * Generate a short title for a chat using Ollama (lightweight task).
 */
export async function generateChatTitle(userMessage: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for title

    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        prompt: `Generate a very short, concise 2 to 4 word title for a chat based on this message. Return ONLY the title, no quotes or punctuation.\n\nMessage: "${userMessage.substring(0, 200)}"`,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json() as { response: string };
    return data.response.trim().replace(/['"]/g, "").substring(0, 60) || null;
  } catch {
    return null;
  }
}
