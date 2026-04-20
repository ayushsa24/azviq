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
): Promise<ReadableStream<Uint8Array>> {
  const genAI = getGenAI();
  const temperature = STYLE_TEMPERATURE[config.style];

  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: { temperature, maxOutputTokens: 8192 },
  });

  const result = await model.generateContentStream(parts as any);
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          try {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ message: { content: text } }) + "\n")
              );
            }
          } catch (chunkErr: any) {
            console.warn("[Gemini Vision] Skipped a malformed vision chunk:", chunkErr.message);
          }
        }
      } catch (streamErr: any) {
        console.error("[Gemini Vision] Stream error:", streamErr.message);
        
        // Return a JSON error message instead of crashing
        controller.enqueue(
          encoder.encode(JSON.stringify({ 
            message: { content: "\n\n*[Vision processing interrupted: Failed to parse image stream. Please try again with a clearer image or different model.]*" } 
          }) + "\n")
        );
      } finally {
        controller.close();
      }
    },
  });
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

    const systemMessage = messages.find((m) => m.role === "system");

    // Filter and merge same-role consecutive messages (REQUIRED for Google SDK stability)
    const processedMessages: AIMessage[] = [];
    for (const m of messages) {
      if (m.role === "system" || m.content.trim() === "") continue;
      
      const last = processedMessages[processedMessages.length - 1];
      if (last && last.role === m.role) {
        last.content += "\n\n" + m.content;
      } else {
        processedMessages.push({ role: m.role, content: m.content });
      }
    }

    if (processedMessages.length === 0) {
      throw new Error("No valid messages found to send to Gemini.");
    }

    const geminiMessages = processedMessages.map((m) => ({
      role: (m.role === "assistant") ? "model" as const : "user" as const,
      parts: [{ text: m.content }],
    }));

    // Gemini history MUST start with a 'user' message. 
    // If the first message is 'model', we skip it.
    let firstUserIndex = geminiMessages.findIndex((m) => m.role === "user");
    if (firstUserIndex === -1) {
      throw new Error("Gemini requires at least one user message to start a chat.");
    }

    const validMessages = geminiMessages.slice(firstUserIndex);
    const history = validMessages.slice(0, -1);
    const lastMessage = validMessages[validMessages.length - 1];

    const model = genAI.getGenerativeModel({
      model: config.model,
      systemInstruction: systemMessage?.content || config.systemPrompt,
      generationConfig: { 
        temperature, 
        maxOutputTokens: 8192,
        // Adding low-level safety settings to prevent stream blocks
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.parts[0].text);

    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          // Iterate through the stream with heavy error guarding
          for await (const chunk of result.stream) {
            try {
              // chunk.text() can throw if the chunk is an error or blocked by safety
              const text = chunk.text();
              if (text) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ message: { content: text } }) + "\n")
                );
              }
            } catch (chunkErr: any) {
              const errMsg = chunkErr?.message || "";
              console.warn("[Gemini] Skipped chunk or safety block encountered:", errMsg);
              
              // If it's a safety block, notify user subtly
              if (errMsg.includes("blocked") || errMsg.includes("safety")) {
                controller.enqueue(
                  encoder.encode(JSON.stringify({ 
                    message: { content: "\n\n*[Response partially filtered by safety settings]*" } 
                  }) + "\n")
                );
              }
            }
          }
        } catch (streamErr: any) {
          console.error("[Gemini SDK] Fatal stream processing error. Details:", {
            message: streamErr.message,
            stack: streamErr.stack,
            model: config.model
          });
          
          let userFriendlyMsg = "\n\n*[Connection interrupted: The AI service failed to parse the stream. Please try again or switch to a different model.]*";
          
          if (streamErr.message?.includes("Failed to parse stream")) {
            userFriendlyMsg = `\n\n*[Gemini Error: Stream parsing failed on '${config.model}'. This usually happens with experimental models or connection instability. Retrying with a different model might help.]*`;
          }

          controller.enqueue(
            encoder.encode(JSON.stringify({ 
              message: { content: userFriendlyMsg } 
            }) + "\n")
          );
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
 * Optimized: Uses only the first 15 words of the input and includes a fallback model strategy
 * to prevent 429 quota blockages from the primary Lite model.
 */
export async function generateGeminiTitle(firstMessage: string): Promise<string | null> {
  const sliceText = (msg: string) => msg.split(/\s+/).slice(0, 15).join(" ");
  const shortInput = sliceText(firstMessage);
  
  const generate = async (modelId: string) => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: modelId,
      generationConfig: { temperature: 0.5, maxOutputTokens: 20 }
    });

    const prompt = `Based on this chat snippet, generate a 2-4 word descriptive title. No quotes, no punctuation, no "Title:":\n\n"${shortInput}"`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/["'.]/g, "");
  };

  try {
    // Try primary FREE_MODEL first (gemini-2.5-flash-lite)
    const title = await generate(FREE_MODEL);
    console.log(`[Gemini Title] Generated successfully with ${FREE_MODEL}: "${title}"`);
    return title;
  } catch (err: any) {
    const isQuotaError = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("quota");
    
    // Fallback to gemini-2.5-flash if Lite hits quota
    if (isQuotaError && FREE_MODEL !== "gemini-2.5-flash") {
      console.warn(`[Gemini Title] Primary model '${FREE_MODEL}' hit quota, falling back to 2.5-flash...`);
      try {
        const fallbackTitle = await generate("gemini-2.5-flash");
        console.log(`[Gemini Title] Generated successfully with fallback (2.5-flash): "${fallbackTitle}"`);
        return fallbackTitle;
      } catch (fallbackErr: any) {
        console.error("[Gemini Title] Fallback model also failed:", fallbackErr.message);
      }
    } else {
      console.error("[Gemini Title] Failed to generate title:", err.message);
    }
    
    return null;
  }
}
