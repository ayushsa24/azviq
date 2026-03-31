import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { checkAiDailyQuota } from "@/lib/ai-tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";

// --- Zod Schema: Strict validation of editor AI input ---
const EditorRequestSchema = z.object({
    prompt: z.string().max(5000, "Prompt is too long").optional(),
    selectedText: z.string().max(10000, "Selected text is too long").optional(),
    contextText: z.string().max(10000, "Context text is too long").optional(),
}).refine((data) => data.prompt || data.selectedText, {
    message: "At least one of 'prompt' or 'selectedText' must be provided",
});

export async function POST(req: Request) {
    try {
        // 1. Parallel Authenticate and Quota Fetch
        const sessionPromise = getServerSession(authOptions);
        
        // Wait for session first since we need the email for the user ID fetch
        const session = await sessionPromise;
        if (!session?.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        // 2. Fetch user and concurrent quota check
        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return apiError("User not found", 404, "USER_NOT_FOUND");
        }

        const quota = await checkAiDailyQuota(user.id);
        if (!quota.success) {
            return apiError("Daily AI Usage Cap Reached (200/day). Please try again tomorrow.", 429, "QUOTA_EXCEEDED");
        }

        // 3. Parse and validate request body
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return apiError("Invalid JSON body", 400, "INVALID_JSON");
        }

        const validation = EditorRequestSchema.safeParse(body);
        if (!validation.success) {
            return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
        }

        const { prompt, selectedText, contextText } = validation.data;

        // 3. Select system instruction based on prompt type
        let systemInstruction = "You are an AI assistant integrated directly into a Notion-style text editor. Your job is to help the user write, brainstorm, edit, or explain text. Use standard Markdown formatting (like headers, bolding, bullet points, and tables) where appropriate to make your response clear and professional. Return ONLY the requested text, without conversational filler like 'Here is the response'.";

        const lowerPrompt = prompt?.toLowerCase() || "";
        if (lowerPrompt.startsWith("explain")) {
            systemInstruction = "You are an AI assistant. Explain the following text clearly and concisely.";
        } else if (lowerPrompt.startsWith("summarize")) {
            systemInstruction = "You are an AI assistant. Summarize the following text into a few sharp bullet points.";
        }

        // 4. Build the full prompt from structured input
        let fullPrompt = "";
        if (prompt && !lowerPrompt.startsWith("explain") && !lowerPrompt.startsWith("summarize")) {
            fullPrompt = `User Prompt: ${prompt}\n\n`;
        }
        if (selectedText) {
            fullPrompt += `Selected Text to modify/reference: "${selectedText}"\n\n`;
        }
        if (contextText) {
            fullPrompt += `Surrounding Document Context: "${contextText.substring(0, 500)}..."`;
        }

        // 5. Call Ollama with streaming — with explicit error handling for service failure
        let response: Response;
        try {
            response = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    messages: [
                        { role: "system", content: systemInstruction },
                        { role: "user", content: fullPrompt },
                    ],
                    stream: true,
                    // Optimization: Tweak Ollama sampling for faster first-token (sometimes)
                    options: {
                        temperature: 0.7,
                        num_predict: 1000,
                    }
                }),
            });
        } catch {
            return apiError("AI service is unavailable. Please try again later.", 503, "AI_SERVICE_UNAVAILABLE");
        }

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            console.error("Ollama API error:", errorText);
            return apiError("AI service returned an error. Is Ollama running?", 502, "AI_SERVICE_ERROR");
        }

        // 6. Stream the response back to the client as SSE
        const encoder = new TextEncoder();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async pull(controller) {
                const { done, value } = await reader.read();
                if (done) {
                    controller.close();
                    return;
                }

                const text = decoder.decode(value, { stream: true });
                const lines = text.split("\n").filter(Boolean);
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                        const content = json.message?.content || "";
                        if (content) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                        if (json.done) {
                            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                        }
                    } catch {
                        // Skip malformed JSON lines in the ndjson stream
                    }
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: unknown) {
        console.error("AI Editor error:", error);
        const message = (error instanceof Error) ? (error instanceof Error ? error.message : String(error)) : "Failed to process AI request";
        return apiError(message, 500, "INTERNAL_SERVER_ERROR");
    }
}
