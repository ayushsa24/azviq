import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { supabase } from "@/lib/db";
import { getStreamingChatResponse, runSubscriptionGuard } from "@/lib/ai/manager";
import type { AIMessage, AIModel, ResponseStyle } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EditorRequestSchema = z.object({
  prompt: z.string().max(5000, "Prompt is too long").optional(),
  selectedText: z.string().max(10000, "Selected text is too long").optional(),
  contextText: z.string().max(10000, "Context text is too long").optional(),
}).refine((data) => data.prompt || data.selectedText, {
  message: "At least one of 'prompt' or 'selectedText' must be provided",
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, ai_model, response_style")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return apiError("User not found", 404, "USER_NOT_FOUND");
    }

    // 2. Enforce AI Daily Quota & Tier Access (Tracking type: 'note_ai')
    const guard = await runSubscriptionGuard(session.user.email, (user.ai_model as any) || "gemini-2.5-flash", "note_ai", user.id);
    if (!guard.allowed) {
      return apiError(guard.error || "Subscription limit reached", guard.status || 429, "QUOTA_EXCEEDED");
    }

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

    // Build system instruction based on prompt type
    let systemInstruction = "You are an AI writing assistant inside a Notion-style editor for students. Help the user write, brainstorm, edit, or explain content using clear Markdown formatting. Return ONLY the requested content without conversational filler.";
    const lowerPrompt = prompt?.toLowerCase() || "";
    if (lowerPrompt.startsWith("explain")) {
      systemInstruction = "You are an AI assistant. Explain the following text clearly and concisely using clean Markdown formatting.";
    } else if (lowerPrompt.startsWith("summarize")) {
      systemInstruction = "You are an AI assistant. Summarize the following text into sharp, scannable bullet points.";
    }

    // Build full prompt
    let fullPrompt = "";
    if (prompt && !lowerPrompt.startsWith("explain") && !lowerPrompt.startsWith("summarize")) {
      fullPrompt = `User Prompt: ${prompt}\n\n`;
    }
    if (selectedText) fullPrompt += `Selected Text: "${selectedText}"\n\n`;
    if (contextText) fullPrompt += `Document Context: "${contextText.substring(0, 500)}..."`;

    const aiMessages: AIMessage[] = [{ role: "user", content: fullPrompt }];
    
    const aiConfig = {
      // Use user's saved model preference; default to Gemini 2.5 Flash
      model: ((user.ai_model as AIModel) || "gemini-2.5-flash"),
      style: ((user.response_style as ResponseStyle) || "balanced"),
      systemPrompt: systemInstruction,
      stream: true,
    };

    // Get streaming response from AI Manager (Gemini primary, Ollama fallback)
    let aiStream: ReadableStream<Uint8Array>;
    try {
      aiStream = await getStreamingChatResponse(aiMessages, aiConfig);
    } catch {
      return apiError("AI service is unavailable. Please try again later.", 503, "AI_SERVICE_UNAVAILABLE");
    }

    // Convert our NDJSON stream format to SSE format for the editor
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              break;
            }
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split("\n").filter(Boolean)) {
              try {
                const parsed = JSON.parse(line) as { message?: { content?: string } };
                const content = parsed.message?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip malformed lines
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("AI Editor error:", error);
    return apiError("Failed to process AI request", 500, "INTERNAL_SERVER_ERROR");
  }
}
