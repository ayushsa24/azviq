import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";
import { checkAiDailyQuota } from "@/lib/ai-tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    const quota = await checkAiDailyQuota(user.id);
    if (!quota.success) {
        return apiError("Daily AI Usage Cap Reached (200/day). Please try again tomorrow.", 429, "QUOTA_EXCEEDED");
    }

    // 3. Call Gemini with explicit error handling
    if (!process.env.GEMINI_API_KEY) {
      return apiError("AI service is not configured.", 503, "AI_NOT_CONFIGURED");
    }

    let summary: string;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // Changed model as per instruction
        systemInstruction: "Summarize study notes into clear bullet points.",
      });
      const response = await model.generateContent(text);
      summary = response.response.text();
    } catch (err: unknown) {
      console.error("Gemini API Error:", err);
      return apiError("AI summarization service failed. Please try again later.", 502, "AI_SERVICE_ERROR");
    }

    return apiSuccess({ summary });
  } catch (error: unknown) {
    console.error("Summarize API Error:", error);
    return apiError("Something went wrong. Please try again later.", 500, "INTERNAL_SERVER_ERROR");
  }
}
