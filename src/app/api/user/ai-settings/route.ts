/**
 * /api/user/ai-settings
 * GET: Fetch the current user's AI model and response style from Supabase
 * PATCH: Save the user's AI model and response style to Supabase
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { AIModel, MODEL_PROVIDER_MAP, ResponseStyle, FREE_MODEL } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

// Derive valid models from MODEL_PROVIDER_MAP — single source of truth.
// If a model is added/removed from types.ts, this automatically updates.
const VALID_MODELS = Object.keys(MODEL_PROVIDER_MAP) as AIModel[];

const VALID_STYLES: ResponseStyle[] = ["balanced", "creative", "precise"];

const AISettingsSchema = z.object({
  ai_model: z.enum(VALID_MODELS as [AIModel, ...AIModel[]]).optional(),
  response_style: z.enum(VALID_STYLES as [ResponseStyle, ...ResponseStyle[]]).optional(),
});

// GET — Fetch current AI settings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  const { data: user, error } = await supabase
    .from("users")
    .select("ai_model, response_style")
    .eq("email", session.user.email)
    .single();

  if (error || !user) return apiError("User not found", 404, "USER_NOT_FOUND");

  return NextResponse.json({
    ai_model: user.ai_model || FREE_MODEL,
    response_style: user.response_style || "balanced",
  });
}

// PATCH — Update AI settings
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return apiError("Unauthorized", 401, "UNAUTHORIZED");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400, "INVALID_JSON");
  }

  const validation = AISettingsSchema.safeParse(body);
  if (!validation.success) {
    return apiError("Invalid settings data", 400, "VALIDATION_ERROR", validation.error.flatten());
  }

  const { ai_model, response_style } = validation.data;
  const updates: Record<string, string> = {};
  if (ai_model) updates.ai_model = ai_model;
  if (response_style) updates.response_style = response_style;

  if (Object.keys(updates).length === 0) {
    return apiError("No settings to update", 400, "EMPTY_UPDATE");
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("email", session.user.email);

  if (error) {
    console.error("Failed to update AI settings:", error);
    return apiError("Failed to save settings", 500, "INTERNAL_SERVER_ERROR");
  }

  return NextResponse.json({ success: true, updated: updates });
}
