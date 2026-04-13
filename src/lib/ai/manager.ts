/**
 * AI Manager — The central traffic controller for all AI calls in Azviq.
 *
 * Architecture Rules (enforced server-side, no client trust):
 *
 * 1. FREE_MODEL (gemini-2.5-flash-lite) is the universal default.
 * 2. Only AI Chat allows paid model selection — all other features force FREE_MODEL.
 * 3. If a paid provider (GPT, Claude) fails for any reason, the system silently
 *    retries once, then falls back to FREE_MODEL. The user sees a normal response.
 * 4. All requests are gated by subscription tier + daily rate limit checks.
 */

import { AIMessage, AIModel, AIRequestConfig, FREE_MODEL, MODEL_PROVIDER_MAP, ResponseStyle, LITE_MODELS, PREMIUM_MODELS } from "./types";
import { callGeminiStream, callGeminiText, callGeminiMultipart, generateGeminiTitle } from "./providers/gemini";
import { callOpenAIStream, callOpenAIText } from "./providers/openai";
import { callClaudeStream, callClaudeText } from "./providers/anthropic";
import { getSubscriptionStatus, checkModelAccess, PlanTier } from "@/lib/subscription";
import { checkRateLimit, RequestType } from "@/lib/ratelimit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The default model — used when no valid preferred model is specified */
const DEFAULT_MODEL: AIModel = FREE_MODEL;

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
 */
export async function runSubscriptionGuard(
  userEmail: string,
  model: AIModel,
  requestType: RequestType,
  userId: string
): Promise<GuardResult> {
  const { tier } = await getSubscriptionStatus(userEmail);

  const modelCheck = checkModelAccess(model, tier);
  if (!modelCheck.allowed) {
    return { allowed: false, tier, error: modelCheck.error, status: 403 };
  }

  const rateLimitCheck = await checkRateLimit(requestType, userId, tier);
  if (!rateLimitCheck.allowed) {
    return { allowed: false, tier, error: rateLimitCheck.error, status: 429 };
  }

  return { allowed: true, tier };
}

// ---------------------------------------------------------------------------
// Model Selection & Tier Resolution
// ---------------------------------------------------------------------------

/**
 * Given a user's saved model preference and their subscription tier,
 * return the correct model they are allowed to use.
 *
 * - Free users always get FREE_MODEL regardless of what they saved.
 * - Lite users can use gpt-4o-mini or FREE_MODEL.
 * - Premium users can use any model.
 *
 * This is a silent downgrade — the user sees a response, not a rejection.
 */
export function getModelForTier(userSavedModel: string | null | undefined, tier: PlanTier): AIModel {
  const model = (userSavedModel as AIModel) || FREE_MODEL;

  // Validate it's a known model
  if (!MODEL_PROVIDER_MAP[model]) {
    return FREE_MODEL;
  }

  // Premium-only models require tier >= 2
  if (PREMIUM_MODELS.includes(model) && tier < 2) {
    console.log(`[AI Manager] Downgrading ${model} to ${FREE_MODEL} — tier ${tier} insufficient.`);
    return FREE_MODEL;
  }

  // Lite models require tier >= 1
  if (LITE_MODELS.includes(model) && tier < 1) {
    console.log(`[AI Manager] Downgrading ${model} to ${FREE_MODEL} — user is on free tier.`);
    return FREE_MODEL;
  }

  return model;
}

/**
 * Get AI config from request headers.
 * Only used by routes that need header-based overrides (chat route).
 */
export function getAIConfig(req: Request, systemPrompt?: string): AIRequestConfig {
  const model = (req.headers.get("X-AI-Model") as AIModel) || DEFAULT_MODEL;
  const style = (req.headers.get("X-Response-Style") as ResponseStyle) || "balanced";

  // Validate model — silently default to FREE_MODEL if unknown
  const validModel = MODEL_PROVIDER_MAP[model] ? model : DEFAULT_MODEL;

  return { model: validModel, style, systemPrompt, stream: true };
}

// ---------------------------------------------------------------------------
// Streaming Chat Response
// ---------------------------------------------------------------------------

/**
 * Get a streaming response for the chat interface.
 * Routes based on the model/provider.
 * On failure: silently falls back to FREE_MODEL (gemini-2.5-flash-lite).
 */
export async function getStreamingChatResponse(
  messages: AIMessage[],
  config: AIRequestConfig
): Promise<ReadableStream<Uint8Array>> {
  const provider = MODEL_PROVIDER_MAP[config.model] || "gemini";

  try {
    switch (provider) {
      case "gemini":
        return await callGeminiStream(messages, config);
      case "openai":
        return await callOpenAIStream(messages, config);
      case "anthropic":
        return await callClaudeStream(messages, config);
      default:
        return await callGeminiStream(messages, { ...config, model: FREE_MODEL });
    }
  } catch (primaryError) {
    console.error(`[AI Manager] Streaming failed for provider '${provider}' / model '${config.model}':`, primaryError);

    // Silent fallback to FREE_MODEL — user doesn't know, they just get a response
    if (config.model !== FREE_MODEL) {
      console.log(`[AI Manager] Silently falling back to ${FREE_MODEL} for streaming.`);
      try {
        return await callGeminiStream(messages, { ...config, model: FREE_MODEL });
      } catch (fallbackError) {
        console.error("[AI Manager] Fallback also failed:", fallbackError);
        throw new Error("AI service is temporarily unavailable. Please try again.");
      }
    }

    throw primaryError;
  }
}

// ---------------------------------------------------------------------------
// Text (Non-Streaming) Response
// ---------------------------------------------------------------------------

/**
 * Get a non-streaming text response.
 * Used by: exercises, revision, summarize, editor (all forced to FREE_MODEL).
 * On failure: silently retries once, then falls back to FREE_MODEL.
 */
export async function getTextResponse(
  prompt: string,
  config: AIRequestConfig
): Promise<string> {
  const provider = MODEL_PROVIDER_MAP[config.model] || "gemini";

  try {
    switch (provider) {
      case "gemini":
        return await callGeminiText(prompt, config);
      case "openai":
        return await callOpenAIText(prompt, config);
      case "anthropic":
        return await callClaudeText(prompt, config);
      default:
        return await callGeminiText(prompt, { ...config, model: FREE_MODEL });
    }
  } catch (primaryError) {
    console.error(`[AI Manager] Text failed for provider '${provider}' / model '${config.model}':`, primaryError);

    // Silent fallback to FREE_MODEL
    if (config.model !== FREE_MODEL) {
      console.log(`[AI Manager] Silently falling back to ${FREE_MODEL} for text.`);
      try {
        return await callGeminiText(prompt, { ...config, model: FREE_MODEL });
      } catch {
        throw new Error("AI text generation failed. Please try again.");
      }
    }

    // If we were already on FREE_MODEL and it failed, throw clearly
    throw new Error("AI service is temporarily unavailable. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// Vision (Multimodal) Response
// ---------------------------------------------------------------------------

/**
 * Get a streaming response for vision (image) input. Only Gemini supports this.
 * Always uses FREE_MODEL — vision is a high-quota operation.
 */
export async function getVisionStreamResponse(
  parts: object[],
  config: AIRequestConfig
): Promise<AsyncIterable<{ text: () => string }>> {
  // Vision is always FREE_MODEL — it's the most reliable Gemini multimodal endpoint
  const visionConfig = { ...config, model: FREE_MODEL };

  try {
    return await callGeminiMultipart(parts, visionConfig);
  } catch (err: any) {
    console.error("[AI Manager] Vision stream error:", err);
    // Try gemini-2.5-flash as one-time vision fallback
    try {
      return await callGeminiMultipart(parts, { ...visionConfig, model: "gemini-2.5-flash" as AIModel });
    } catch {
      throw new Error("Vision processing failed. Please try again.");
    }
  }
}

// ---------------------------------------------------------------------------
// Chat Title Generation (Non-blocking, best-effort)
// ---------------------------------------------------------------------------

/**
 * Generate a short title for a new chat session using FREE_MODEL.
 * This is non-blocking — if it fails, the chat still works fine.
 */
export { generateGeminiTitle as generateChatTitle };
