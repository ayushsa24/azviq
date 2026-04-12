/**
 * AI Types — Shared definitions for all AI providers in the Azviq system.
 */

export type AIProvider = "gemini" | "ollama" | "openai" | "anthropic";

export type AIModel =
  | "gemini-2.5-flash"   // Default — Gemini 2.5 Flash (Google)
  | "gemini-1.5-pro"     // Gemini 1.5 Pro (Google)
  | "llama3.2"           // Llama 3.2 via Ollama (Local / Free)
  | "gpt-4o"             // GPT-4o (OpenAI — Premium)
  | "gpt-4o-mini"        // GPT-4o Mini (OpenAI — Premium)
  | "claude-3-5-sonnet-20241022"; // Claude 3.5 Sonnet (Anthropic — Premium)

export type ResponseStyle = "balanced" | "creative" | "precise";

/** Maps each model ID to its provider */
export const MODEL_PROVIDER_MAP: Record<AIModel, AIProvider> = {
  "gemini-2.5-flash": "gemini",
  "gemini-1.5-pro": "gemini",
  "llama3.2": "ollama",
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  "claude-3-5-sonnet-20241022": "anthropic",
};

/** Human-readable labels for each model */
export const MODEL_LABELS: Record<AIModel, string> = {
  "gemini-2.5-flash": "Gemini 2.5 Flash ⚡ (Default)",
  "gemini-1.5-pro": "Gemini 1.5 Pro (Deep Memory)",
  "llama3.2": "Llama 3.2 · Ollama (Local, Free)",
  "gpt-4o": "GPT-4o 🔒 (Premium)",
  "gpt-4o-mini": "GPT-4o Mini 🔒 (Premium)",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet 🔒 (Premium)",
};

/** Which models require a premium subscription */
export const PREMIUM_MODELS: AIModel[] = ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"];

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
}
