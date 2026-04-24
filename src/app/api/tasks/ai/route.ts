import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { runSubscriptionGuard } from "@/lib/ai/manager";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// --- Zod Schema ---
const TasksAISchema = z.object({
    prompt: z.string()
        .min(3, "Prompt is too short")
        .max(2000, "Prompt is too long"),
});

interface GeneratedTask {
    title: string;
    status: string;
}

export async function POST(req: Request) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const userId = (session.user as { id: string }).id;

        // --- AI Daily Quota Check ---
        const guard = await runSubscriptionGuard(session.user.email, "gemini-2.5-flash", "chat", userId);
        if (!guard.allowed) {
            return apiError(guard.error || "Subscription limit reached", guard.status || 429, "QUOTA_EXCEEDED");
        }

        // 2. Parse and validate input
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return apiError("Invalid JSON body", 400, "INVALID_JSON");
        }

        const validation = TasksAISchema.safeParse(body);
        if (!validation.success) {
            return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
        }

        const { prompt } = validation.data;

        // 3. Validate API key
        if (!apiKey) {
            return apiError("AI service is not configured.", 503, "AI_NOT_CONFIGURED");
        }

        // 4. Call Gemini
        let text: string;
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: `You are a productivity assistant for a student. The user will give you a high-level task or project.
Your job is to break it down into a list of actionable, bite-sized tasks.
Return ONLY a raw JSON array of objects. Do not wrap it in markdown codeblocks like \`\`\`json\`\`\`.
Each object MUST have the following structure:
{
  "title": "Task name",
  "status": "not_started"
}
Limit to maximum 10 tasks. Be concise and realistic for a student.`,
            });

            const response = await model.generateContent(prompt);
            text = response.response.text().trim();
        } catch {
            return apiError("AI service failed. Please try again later.", 502, "AI_SERVICE_ERROR");
        }

        // 5. Strip markdown code blocks if AI disobeyed
        text = text.replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();

        // 6. Parse JSON safely
        let tasks: GeneratedTask[];
        try {
            tasks = JSON.parse(text) as GeneratedTask[];
        } catch {
            console.error("AI returned invalid JSON:", text);
            return apiError("AI returned an unexpected response format. Please try again.", 502, "AI_PARSE_ERROR");
        }

        if (!Array.isArray(tasks)) {
            return apiError("AI returned an unexpected response format. Please try again.", 502, "AI_PARSE_ERROR");
        }

        return NextResponse.json({ tasks });
    } catch (error: unknown) {
        console.error("AI Task Generation Error:", error);
        return apiError("Failed to generate tasks. Please try again.", 500, "INTERNAL_SERVER_ERROR");
    }
}
