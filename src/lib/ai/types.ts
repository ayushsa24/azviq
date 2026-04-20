/**
 * AI Types — Shared definitions for all AI providers in the Azviq system.
 *
 * Architecture Rule:
 *  - FREE_MODEL (gemini-2.5-flash-lite) is used for ALL features by default.
 *  - Paid subscribers can select premium models ONLY for AI Chat.
 *  - All study features (exercises, revision, summarize, editor, vision, teacher)
 *    are always served by FREE_MODEL regardless of subscription tier.
 *  - If any paid provider fails, the system silently falls back to FREE_MODEL.
 */

export type AIProvider = "gemini" | "openai" | "anthropic";

export type AIModel =
  | "gemini-3.1-flash-lite" // Gemini 3.1 Flash Lite (Stable)
  | "gemini-1.5-flash-8b"   // Gemini 1.5 Flash-8B (Ultra-Lite / High Quota)
  | "gemini-2.5-flash-lite" // Universal free engine — used EVERYWHERE by default
  | "gemini-2.5-flash"      // Gemini premium tier (future use / vision fallback)
  | "gpt-4o-mini"           // GPT-4o Mini (OpenAI — Lite Plan)
  | "gpt-4o"                // GPT-4o (OpenAI — Premium Plan)
  | "claude-3-5-sonnet-20241022"; // Claude 3.5 Sonnet (Anthropic — Premium Plan)

export type ResponseStyle = "balanced" | "creative" | "precise";

/**
 * THE single source of truth for the free / fallback AI model.
 * Used everywhere by default. When a paid provider fails, this is used silently.
 */
export const FREE_MODEL: AIModel = "gemini-2.5-flash-lite";

/** Maps each model ID to its provider */
export const MODEL_PROVIDER_MAP: Record<AIModel, AIProvider> = {
  "gemini-3.1-flash-lite": "gemini",
  "gemini-1.5-flash-8b": "gemini",
  "gemini-2.5-flash-lite": "gemini",
  "gemini-2.5-flash": "gemini",
  "gpt-4o-mini": "openai",
  "gpt-4o": "openai",
  "claude-3-5-sonnet-20241022": "anthropic",
};

/** Human-readable labels for each model */
export const MODEL_LABELS: Record<AIModel, string> = {
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash Lite ⚡ (Stable)",
  "gemini-1.5-flash-8b": "Gemini 1.5 Flash-8B ⚡ (Ultra-Lite)",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite ⚡ (Free)",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gpt-4o-mini": "GPT-4o Mini 🔒 (Lite Plan)",
  "gpt-4o": "GPT-4o 🔒 (Premium Plan)",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet 🔒 (Premium Plan)",
};

/** Models that require Lite subscription (tier >= 1) */
export const LITE_MODELS: AIModel[] = ["gpt-4o-mini"];

/** Models that require Premium subscription (tier >= 2) */
export const PREMIUM_MODELS: AIModel[] = ["gemini-2.5-flash", "gpt-4o", "claude-3-5-sonnet-20241022"];

/** Temperature settings for each response style */
export const STYLE_TEMPERATURE: Record<ResponseStyle, number> = {
  balanced: 0.7,
  creative: 1.0,
  precise: 0.2,
};

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIRequestConfig {
  model: AIModel;
  style: ResponseStyle;
  systemPrompt?: string;
  stream?: boolean;
  featureName?: string;
}
