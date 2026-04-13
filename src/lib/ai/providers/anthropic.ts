/**
 * Anthropic (Claude) Provider — Claude 3.5 Sonnet for Premium subscribers.
 * Requires ANTHROPIC_API_KEY in .env.local
 *
 * If this provider fails, the AI Manager silently falls back to FREE_MODEL.
 */

import { AIMessage, AIRequestConfig, STYLE_TEMPERATURE } from "../types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 4096;

/**
 * Call Claude for a streaming chat response.
 * Returns a ReadableStream of NDJSON chunks compatible with the AI Manager format.
 */
export async function callClaudeStream(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const claudeMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  const systemPrompt =
    messages.find((m) => m.role === "system")?.content ||
    config.systemPrompt ||
    "You are Azviq AI, a helpful study assistant.";

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: claudeMessages,
      stream: true,
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) {
    let errorMsg = `Anthropic error ${response.status}`;
    try {
      const data = await response.json() as { error?: { message?: string } };
      errorMsg = data.error?.message || errorMsg;
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg);
  }

  const encoder = new TextEncoder();
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            // Lines start with "data: " in SSE format
            const trimmed = line.replace(/^data: /, "").trim();
            if (!trimmed || trimmed === "[DONE]") continue;

            try {
              const parsed = JSON.parse(trimmed) as {
                type: string;
                delta?: { type: string; text?: string };
              };

              // Only emit text content delta events
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.type === "text_delta" &&
                parsed.delta.text
              ) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ message: { content: parsed.delta.text } }) + "\n"
                  )
                );
              }

              // Stop on message_stop
              if (parsed.type === "message_stop") {
                break;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Call Claude for a non-streaming text response.
 */
export async function callClaudeText(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: MAX_TOKENS,
      system: config.systemPrompt || "You are a helpful AI assistant.",
      messages: [{ role: "user", content: prompt }],
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) {
    let errorMsg = `Anthropic error ${response.status}`;
    try {
      const data = await response.json() as { error?: { message?: string } };
      errorMsg = data.error?.message || errorMsg;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
  };
  return data.content.find((c) => c.type === "text")?.text || "";
}
