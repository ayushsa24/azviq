/**
 * Gemini Provider — Wrapper around @google/generative-ai
 *
 * Handles streaming, non-streaming, multipart (vision), and title generation.
 * Includes retry logic: on transient 503/overloaded errors, waits 1s and retries once.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIMessage, AIRequestConfig, FREE_MODEL, STYLE_TEMPERATURE } from "../types";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
};

/** Sleep helper for retry logic */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Check if an error is a transient server error worth retrying */
function isTransientError(err: any): boolean {
  const msg = err?.message?.toLowerCase() || "";
  return (
    err?.status === 503 ||
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("resource exhausted") ||
    msg.includes("service unavailable")
  );
}

/**
 * Call Gemini for a non-streaming response.
 * Used by: exercises, revision, summarize, editor
 * Includes 1 retry on transient errors.
 */
export async function callGeminiText(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const attempt = async () => {
    const genAI = getGenAI();
    const temperature = STYLE_TEMPERATURE[config.style];

    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: config.systemPrompt,
      generationConfig: {
        temperature,
        maxOutputTokens: 8192,
      },
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  };

  try {
    return await attempt();
  } catch (err: any) {
    if (isTransientError(err)) {
      console.warn(`[Gemini] Transient error on '${config.model}', retrying in 1s...`, err.message);
      await sleep(1000);
      return await attempt(); // One retry
    }
    throw err;
  }
}

/**
 * Call Gemini with a multipart prompt (vision with images).
 * Used by: vision chat
 */
export async function callGeminiMultipart(
  parts: object[],
  config: AIRequestConfig
): Promise<AsyncIterable<{ text: () => string }>> {
  const genAI = getGenAI();
  const temperature = STYLE_TEMPERATURE[config.style];

  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: { temperature, maxOutputTokens: 8192 },
  });

  const result = await model.generateContentStream(parts as any);
  return result.stream;
}

/**
 * Call Gemini for a streaming chat response.
 * Used by: main chat, personal AI teacher, editor
 * Includes 1 retry on transient errors.
 */
export async function callGeminiStream(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const attempt = async () => {
    const genAI = getGenAI();
    const temperature = STYLE_TEMPERATURE[config.style];

    const geminiMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemMessage = messages.find((m) => m.role === "system");

    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemMessage?.content || config.systemPrompt,
      generationConfig: { temperature, maxOutputTokens: 8192 },
    });

    const chat = model.startChat({ history: geminiMessages.slice(0, -1) });
    const lastMessage = geminiMessages[geminiMessages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.parts[0].text);

    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ message: { content: text } }) + "\n")
              );
            }
          }
        } finally {
          controller.close();
        }
      },
    });
  };

  try {
    return await attempt();
  } catch (err: any) {
    if (isTransientError(err)) {
      console.warn(`[Gemini] Transient error on streaming '${config.model}', retrying in 1s...`, err.message);
      await sleep(1000);
      return await attempt();
    }
    throw err;
  }
}

/**
 * Generate a short, descriptive 2-4 word title for a new chat session.
 * Uses FREE_MODEL for cost efficiency. Non-blocking — returns null on failure.
 */
export async function generateGeminiTitle(firstMessage: string): Promise<string | null> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: FREE_MODEL });

    const prompt = `Generate a 2-4 word title for a study chat based on this first message. Do NOT use quotes or punctuation: "${firstMessage.substring(0, 300)}"`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim().replace(/["'.]/g, "");

    return title.length > 60 ? title.substring(0, 57) + "..." : title || null;
  } catch (err) {
    console.error("[Gemini] Failed to generate title:", err);
    return null;
  }
}
