import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getAIConfig, getStreamingChatResponse, runSubscriptionGuard, getModelForTier, generateChatTitle, sanitizeAIError } from "@/lib/ai/manager";
import { FREE_MODEL } from "@/lib/ai/types";
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

    // 3b. Fetch AI preferences and chat info
    let userAiModel: string = FREE_MODEL;
    let userResponseStyle = "balanced";
    let currentChatTitle = "";
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("ai_model, response_style")
        .eq("id", dbUser.id)
        .single();
      if (userData?.ai_model) userAiModel = userData.ai_model;
      if (userData?.response_style) userResponseStyle = userData.response_style;

      if (chatId !== "temp-chat") {
        const { data: chatData } = await supabase
          .from("chats")
          .select("title")
          .eq("id", chatId)
          .single();
        currentChatTitle = chatData?.title || "";
      }
    } catch {
      // Gracefully defaults if columns/chat don't exist yet
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

    // 5. Resolve model based on subscription tier (tier-safe, silent downgrade)
    const aiConfig = getAIConfig(req,
      "You are Azviq AI, an intelligent and helpful study companion. Keep answers clear, beautifully formatted, and concise. CRITICAL RULE: DO NOT output massive amounts of code or excessive code blocks. Keep code examples brief and relevant. Limit yourself to at most 1-2 small code blocks unless the user explicitly asks for extensive code.",
      "AI Chats"
    );

    // Determine subscription tier first for model resolution
    const { getSubscriptionStatus } = await import("@/lib/subscription");
    const { tier } = await getSubscriptionStatus(session.user.email);

    // Resolve the correct model for this user's tier — free users always get FREE_MODEL
    const resolvedModel = getModelForTier(userAiModel, tier);
    aiConfig.model = resolvedModel;
    if (!req.headers.get("X-Response-Style")) aiConfig.style = (userResponseStyle as any);

    // 6. Enforce AI Daily Quota & Tier Access
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

    // 8. Generate chat title (non-blocking, best-effort)
    let titlePromise: Promise<string | null> | null = null;

    // Check if we should (re)generate a title:
    // - It's the first message OR
    // - The current title is a generic placeholder like "New Chat" or "Study Support"
    const isPlaceholderTitle = !currentChatTitle || 
                               currentChatTitle.toLowerCase() === "new chat" || 
                               currentChatTitle.toLowerCase() === "study support";
                               
    if (chatId !== "temp-chat" && (messages.length === 1 || (messages.length <= 3 && isPlaceholderTitle))) {
      // Clean the input text for the title generator (remove JSON if any)
      let cleanInput = latestUserMessage.content;
      if (cleanInput.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanInput);
          cleanInput = parsed.text || parsed.content || cleanInput;
        } catch { /* use original */ }
      }

      // Delay by 1s so title generation doesn't exhaust the same quota bucket as the stream
      titlePromise = new Promise(resolve => setTimeout(resolve, 1000))
        .then(() => generateChatTitle(cleanInput))
        .then(async (title) => {
          if (title && title.toLowerCase() !== "new chat") {
            console.log(`[Chat API] Saving generated title: "${title}" for chat ${chatId}`);
            await supabase.from("chats").update({ title }).eq("id", chatId);
            return title;
          }
          return null;
        }).catch((err) => {
          console.error("[Chat API] Title generation background task failed:", err.message);
          return null;
        });
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
    return apiError(sanitizeAIError(error), 500, "INTERNAL_SERVER_ERROR");
  }
}
