/**
 * OpenAI Provider — Ready for Premium plan users.
 * Requires OPENAI_API_KEY in .env.local
 */

import { AIMessage, AIRequestConfig, STYLE_TEMPERATURE } from "../types";

/**
 * Call OpenAI for a streaming chat response.
 * Returns a ReadableStream of NDJSON chunks.
 */
export async function callOpenAIStream(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const openAIMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (config.systemPrompt && !openAIMessages.find((m) => m.role === "system")) {
    openAIMessages.unshift({ role: "system", content: config.systemPrompt });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: openAIMessages,
      stream: true,
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI error: ${errorText}`);
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
                choices: { delta: { content?: string } }[];
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({ message: { content } }) + "\n"
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
 * Call OpenAI for a non-streaming text response.
 */
export async function callOpenAIText(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: "system", content: config.systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      temperature: STYLE_TEMPERATURE[config.style],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.statusText}`);
  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}
