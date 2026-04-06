/**
 * Gemini Provider — Wrapper around @google/generative-ai
 * Handles both streaming and non-streaming calls.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIMessage, AIRequestConfig, STYLE_TEMPERATURE } from "../types";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Call Gemini for a non-streaming response.
 * Used by: exercises, revision, summarize
 */
export async function callGeminiText(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const genAI = getGenAI();
  const temperature = STYLE_TEMPERATURE[config.style];

  const model = genAI.getGenerativeModel({
    model: config.model,
    systemInstruction: config.systemPrompt,
    generationConfig: { temperature },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Call Gemini with a multipart prompt (e.g., vision with image).
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
    generationConfig: { temperature },
  });

  const result = await model.generateContentStream(parts as any);
  return result.stream;
}

/**
 * Call Gemini for a streaming chat response.
 * Used by: main chat, editor
 */
export async function callGeminiStream(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
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
    generationConfig: { temperature },
  });

  const chat = model.startChat({ history: geminiMessages.slice(0, -1) });
  const lastMessage = geminiMessages[geminiMessages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.parts[0].text);

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ message: { content: text } }) + "\n")
          );
        }
      }
      controller.close();
    },
  });
}
