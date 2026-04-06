/**
 * AI Manager — The central traffic controller for all AI calls.
 * Reads the user's selected model and routes to the correct provider.
 * Falls back to Gemini 2.5 Flash or Ollama if the primary provider fails.
 *
 * Security: Every request is gated by subscription tier + rate limit checks
 * before any AI provider is called. No client-side trust.
 */

import { AIMessage, AIModel, AIRequestConfig, MODEL_PROVIDER_MAP, ResponseStyle } from "./types";
import { callGeminiStream, callGeminiText, callGeminiMultipart } from "./providers/gemini";
import { callOllamaStream, callOllamaText } from "./providers/ollama";
import { callOpenAIStream, callOpenAIText } from "./providers/openai";
import { callClaudeStream, callClaudeText } from "./providers/anthropic";
import { getSubscriptionStatus, checkModelAccess, PlanTier } from "@/lib/subscription";
import { checkRateLimit, RequestType } from "@/lib/ratelimit";

const DEFAULT_MODEL: AIModel = "gemini-2.5-flash";
const FALLBACK_MODEL: AIModel = "llama3.2";

// ---------------------------------------------------------------------------
// Subscription + Rate-Limit Guard
// ---------------------------------------------------------------------------

export interface GuardResult {
  allowed: boolean;
  tier: PlanTier;
  error?: string;
  status?: number;
}

/**
 * Run the full server-side security check before any AI call.
 * Verifies: (1) subscription tier allows the model, (2) daily limit not exceeded.
 *
 * @param userEmail - Authenticated user email from NextAuth session
 * @param model - The AI model requested
 * @param requestType - "chat" | "vision" | "exercise"
 * @param userId - Supabase user ID for rate limit key
 */
export async function runSubscriptionGuard(
  userEmail: string,
  model: AIModel,
  requestType: RequestType,
  userId: string
): Promise<GuardResult> {
  // 1. Get subscription status from Supabase (auto-downgrades expired plans)
  const { tier } = await getSubscriptionStatus(userEmail);

  // 2. Check if this model is allowed for the user's tier
  const modelCheck = checkModelAccess(model, tier);
  if (!modelCheck.allowed) {
    return { allowed: false, tier, error: modelCheck.error, status: 403 };
  }

  // 3. Check daily rate limit for this request type
  const rateLimitCheck = await checkRateLimit(requestType, userId, tier);
  if (!rateLimitCheck.allowed) {
    return { allowed: false, tier, error: rateLimitCheck.error, status: 429 };
  }

  return { allowed: true, tier };
}

/**
 * Get AI config from request headers.
 * The frontend sends X-AI-Model and X-Response-Style headers.
 */
export function getAIConfig(req: Request, systemPrompt?: string): AIRequestConfig {
  const model = (req.headers.get("X-AI-Model") as AIModel) || DEFAULT_MODEL;
  const style = (req.headers.get("X-Response-Style") as ResponseStyle) || "balanced";
  
  // Validate model — default to gemini-2.5-flash if invalid
  const validModel = MODEL_PROVIDER_MAP[model] ? model : DEFAULT_MODEL;

  return { model: validModel, style, systemPrompt, stream: true };
}

/**
 * Get a streaming response for the chat interface.
 * Routes based on the selected AI model/provider with Ollama fallback.
 */
export async function getStreamingChatResponse(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const provider = MODEL_PROVIDER_MAP[config.model];

  try {
    switch (provider) {
      case "gemini":
        return await callGeminiStream(messages, config);

      case "openai":
        return await callOpenAIStream(messages, config);

      case "anthropic":
        return await callClaudeStream(messages, config);

      case "ollama":
        // callOllamaStream now returns ReadableStream<Uint8Array> directly in our standard format
        return await callOllamaStream(messages, config);

      default:
        // Unknown provider — use Gemini as safe default
        return await callGeminiStream(messages, { ...config, model: DEFAULT_MODEL });
    }
  } catch (primaryError) {
    console.error(`[AI Manager] Primary provider (${provider}) failed:`, primaryError);

    // Determine best fallback: if Ollama failed → try Gemini, if Gemini/others failed → try Ollama
    try {
      if (provider === "ollama") {
        // Ollama is down — fall back to Gemini 2.5 Flash
        console.log("[AI Manager] Ollama failed, falling back to Gemini 2.5 Flash...");
        return await callGeminiStream(messages, { ...config, model: DEFAULT_MODEL });
      } else {
        // Cloud AI failed — fall back to Ollama (free local)
        console.log("[AI Manager] Cloud AI failed, falling back to Ollama llama3.2...");
        return await callOllamaStream(messages, { ...config, model: FALLBACK_MODEL });
      }
    } catch (fallbackError) {
      console.error("[AI Manager] Fallback provider also failed:", fallbackError);
      throw new Error("All AI providers are currently unavailable. Please try again later.");
    }
  }
}

/**
 * Get a non-streaming text response (used by exercises, revision, summarize).
 */
export async function getTextResponse(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const provider = MODEL_PROVIDER_MAP[config.model];

  try {
    switch (provider) {
      case "gemini":
        return await callGeminiText(prompt, config);

      case "openai":
        return await callOpenAIText(prompt, config);

      case "anthropic":
        return await callClaudeText(prompt, config);

      case "ollama":
        return await callOllamaText(prompt, config);

      default:
        return await callGeminiText(prompt, { ...config, model: DEFAULT_MODEL });
    }
  } catch (primaryError) {
    console.error(`[AI Manager] Text call failed for provider (${provider}):`, primaryError);

    // Fallback to Gemini
    try {
      return await callGeminiText(prompt, { ...config, model: DEFAULT_MODEL });
    } catch {
      throw new Error("AI text generation failed. Please try again.");
    }
  }
}

/**
 * Get a streaming response for vision (image) input. Only Gemini supports this.
 */
export async function getVisionStreamResponse(
  parts: object[],
  config: AIRequestConfig
): Promise<AsyncIterable<{ text: () => string }>> {
  // Vision is always Gemini — it's the only provider we use for multimodal
  const geminiConfig = { ...config, model: "gemini-2.5-flash" as AIModel };
  
  try {
    return await callGeminiMultipart(parts, geminiConfig);
  } catch (err: any) {
    // Try fallback Gemini model
    if (err.status === 404) {
      return await callGeminiMultipart(parts, { ...geminiConfig, model: "gemini-2.0-flash" as AIModel });
    }
    throw err;
  }
}


