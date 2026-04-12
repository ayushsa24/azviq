import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getAIConfig, getStreamingChatResponse, runSubscriptionGuard } from "@/lib/ai/manager";
import { generateChatTitle } from "@/lib/ai/providers/ollama";
import type { AIMessage } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Extended for Ollama local model responses


const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "model", "system", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty").max(20000, "Message too long"),
});

const ChatRequestSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  messages: z.array(MessageSchema).min(1, "At least one message is required").max(200, "Too many messages in history"),
  image: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_JSON");
    }

    const validation = ChatRequestSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
    }

    const { chatId, messages } = validation.data;

    // 2. Authenticate
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // 3. Verify user — only select 'id' to avoid errors if ai_model column doesn't exist yet
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (dbError || !dbUser) {
      return apiError("Forbidden", 403, "FORBIDDEN");
    }

    // 3b. Try to fetch AI preferences — gracefully defaults if columns don't exist yet
    let userAiModel = "gemini-2.5-flash";
    let userResponseStyle = "balanced";
    try {
      const { data: prefs } = await supabase
        .from("users")
        .select("ai_model, response_style")
        .eq("id", dbUser.id)
        .single();
      if (prefs?.ai_model) userAiModel = prefs.ai_model;
      if (prefs?.response_style) userResponseStyle = prefs.response_style;
    } catch {
      // Columns don't exist yet — use defaults
    }

    const userId = dbUser.id;
    const latestUserMessage = messages[messages.length - 1];

    // 4. Save user message to Supabase
    if (chatId !== "temp-chat") {
      const { error: insertUserError } = await supabase
        .from("messages")
        .upsert({
          id: latestUserMessage.id,
          chat_id: chatId,
          user_id: userId,
          role: "user",
          content: latestUserMessage.content,
          email: session.user.email,
        });
      if (insertUserError) throw insertUserError;
    }

    // 5. Get AI config from request headers (or fall back to user's saved preferences)
    const headerModel = req.headers.get("X-AI-Model");
    const headerStyle = req.headers.get("X-Response-Style");
    
    const aiConfig = getAIConfig(req, 
      "You are Azviq AI, a highly intelligent and helpful AI study companion. Keep answers clear, beautifully formatted using markdown, and educational."
    );

    // If no header, use the user's saved preference
    if (!headerModel) aiConfig.model = (userAiModel as any);
    if (!headerStyle) aiConfig.style = (userResponseStyle as any);

    // 6. Enforce AI Daily Quota & Tier Access (Replaces old 'checkAiDailyQuota')
    const guard = await runSubscriptionGuard(session.user.email, aiConfig.model, "chat", userId);
    if (!guard.allowed) {
      return apiError(guard.error || "Subscription limit reached", guard.status || 403, "QUOTA_EXCEEDED");
    }

    // 7. Format messages for the AI manager — merge consecutive same-role messages
    // This is REQUIRED for Ollama which errors if two user/assistant messages appear consecutively
    const cleanMessages = messages.filter(
      (m) => !m.content.includes("[ERROR]:") && !m.content.includes("Oops! Something went wrong")
    );

    const mergedMessages: AIMessage[] = [];
    let lastRole: string | null = null;
    for (const msg of cleanMessages) {
      let content = msg.content;
      // If JSON-encoded (vision prompt), extract text part
      if (msg.role === "user" && content.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(content) as { text?: string; content?: string };
          content = parsed.text || parsed.content || content;
        } catch { /* fallback to original */ }
      }

      const normalizedRole = msg.role === "model" ? "assistant" : msg.role as "user" | "assistant" | "system";
      if (normalizedRole === lastRole && mergedMessages.length > 0) {
        // Merge into previous message instead of adding duplicate role
        mergedMessages[mergedMessages.length - 1].content += "\n\n" + content;
      } else {
        mergedMessages.push({ role: normalizedRole, content });
        lastRole = normalizedRole;
      }
    }

    const aiMessages = mergedMessages;

    // 8. Generate chat title (non-blocking, using Ollama for cheapness)
    let titlePromise: Promise<string | null> | null = null;
    if (messages.length === 1 && chatId !== "temp-chat") {
      titlePromise = generateChatTitle(latestUserMessage.content).then(async (title) => {
        if (title) {
          await supabase.from("chats").update({ title }).eq("id", chatId);
        }
        return title;
      }).catch(() => null);
    }

    // 9. Get streaming response from AI Manager
    let aiStream: ReadableStream<Uint8Array>;
    try {
      aiStream = await getStreamingChatResponse(aiMessages, aiConfig);
    } catch {
      return apiError("AI service is unavailable. Please try again later.", 503, "AI_SERVICE_UNAVAILABLE");
    }

    // 10. Pass through stream, accumulate full content, then save to DB
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = "";

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as { message?: { content?: string } };
            if (parsed.message?.content) {
              fullContent += parsed.message.content;
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
        controller.enqueue(chunk);
      },
      async flush(controller) {
        if (chatId !== "temp-chat" && fullContent.trim().length > 0) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            user_id: userId,
            role: "model",
            content: fullContent,
            email: session.user!.email,
          });
        }

        if (titlePromise) {
          const resolvedTitle = await titlePromise;
          if (resolvedTitle) {
            controller.enqueue(
              encoder.encode("\n" + JSON.stringify({ __generatedTitle: resolvedTitle }) + "\n")
            );
          }
        }
      },
    });

    return new Response(aiStream.pipeThrough(transformStream), {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return apiError("Something went wrong. Please try again later.", 500, "INTERNAL_SERVER_ERROR");
  }
}
