import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";
import { getTextResponse, runSubscriptionGuard } from "@/lib/ai/manager";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// --- Zod Schema ---
const SummarizeSchema = z.object({
  text: z.string()
    .min(10, "Text is too short to summarize")
    .max(50000, "Text is too long to summarize"),
});

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return apiError("User not found", 404, "USER_NOT_FOUND");
    }

    // 2. Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_JSON");
    }

    const validation = SummarizeSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
    }

    const { text } = validation.data;

    // --- AI Daily Quota Check ---
    const guard = await runSubscriptionGuard(session.user.email, "gemini-2.5-flash", "chat", user.id);
    if (!guard.allowed) {
      return apiError(guard.error || "Subscription limit reached", guard.status || 429, "QUOTA_EXCEEDED");
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiError("AI service is not configured.", 503, "AI_NOT_CONFIGURED");
    }

    // 3. Summarize using AI Manager (Gemini 2.5 Flash)
    let summary: string;
    try {
      summary = await getTextResponse(text, {
        model: "gemini-2.5-flash",
        style: "balanced",
        systemPrompt: "Summarize the following study notes into clear, concise bullet points. Use Markdown formatting.",
        stream: false,
      });
    } catch (err: unknown) {
      console.error("Summarize AI Error:", err);
      return apiError("AI summarization service failed. Please try again later.", 502, "AI_SERVICE_ERROR");
    }

    return apiSuccess({ summary });
  } catch (error: unknown) {
    console.error("Summarize API Error:", error);
    return apiError("Something went wrong. Please try again later.", 500, "INTERNAL_SERVER_ERROR");
  }
}
