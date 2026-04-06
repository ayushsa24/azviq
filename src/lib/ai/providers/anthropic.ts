/**
 * Anthropic (Claude) Provider — Ready for Premium plan users.
 * Requires ANTHROPIC_API_KEY in .env.local
 */

import { AIMessage, AIRequestConfig, STYLE_TEMPERATURE } from "../types";

/**
 * Call Claude for a streaming chat response.
 * Returns a ReadableStream of NDJSON chunks.
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
    "You are Avyx AI, a helpful study assistant.";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "messages-2023-12-15",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages,
      stream: true,
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error: ${errorText}`);
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
            const trimmed = line.replace(/^data: /, "").trim();
            if (!trimmed || trimmed === "[DONE]") continue;
            try {
              const parsed = JSON.parse(trimmed) as {
                type: string;
                delta?: { type: string; text?: string };
              };
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: config.systemPrompt || "You are a helpful AI assistant.",
      messages: [{ role: "user", content: prompt }],
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic error: ${response.statusText}`);
  const data = await response.json() as {
    content: { type: string; text: string }[];
  };
  return data.content.find((c) => c.type === "text")?.text || "";
}
