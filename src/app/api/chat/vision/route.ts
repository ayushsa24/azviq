import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getVisionStreamResponse, runSubscriptionGuard, generateChatTitle, sanitizeAIError } from "@/lib/ai/manager";
import { FREE_MODEL } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, messages, image } = body;

    // 1. Auth & Session Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (dbError || !dbUser) return apiError("User not found", 404, "USER_NOT_FOUND");
    const userId = dbUser.id;

    // 2. Enforce AI Daily Quota & Tier Access (vision always uses FREE_MODEL)
    const guard = await runSubscriptionGuard(session.user.email, FREE_MODEL, "vision", userId);
    if (!guard.allowed) {
      return apiError(guard.error || "Subscription limit reached", guard.status || 403, "QUOTA_EXCEEDED");
    }

    if (!process.env.GEMINI_API_KEY) {
      return apiError("Gemini API not configured.", 503, "AI_NOT_CONFIGURED");
    }

    // 3. Save User Message to DB
    const lastUserMsg = messages[messages.length - 1];
    if (chatId !== "temp-chat") {
      const contentToSave = image
        ? JSON.stringify({ text: lastUserMsg.content, image })
        : lastUserMsg.content;

      await supabase.from("messages").upsert({
        id: lastUserMsg.id,
        chat_id: chatId,
        user_id: userId,
        role: "user",
        content: contentToSave,
        email: session.user.email,
      });
    }

    // 4. Prepare vision parts for Gemini
    const base64Data = image.split(",")[1] || image;
    const parts = [
      {
        text: `System Instruction: You are Azviq AI, a premium study assistant. You have been provided an image of some study material. Help the user understand it perfectly. Always format your output beautifully with markdown.\n\nUser Question: ${lastUserMsg.content || "Analyze this study material and explain it simply."}`,
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ];

    // 5. Generate with Vision-capable model via AI Manager (always FREE_MODEL)
    let aiStream: ReadableStream<Uint8Array>;
    try {
      aiStream = await getVisionStreamResponse(parts, {
        model: FREE_MODEL,
        style: "balanced",
        stream: true,
        featureName: "Vision & Images"
      });
    } catch (err: any) {
      console.error("Vision generation error:", err);
      if (err.status === 429 || err.message?.includes("429")) {
        return apiError("An AI technical problem occurred. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
      }
      return apiError(sanitizeAIError(err), 503, "MODEL_NOT_FOUND");
    }

    // 6. Generate title (non-blocking)
    let titlePromise: Promise<string | null> | null = null;
    if (messages.length === 1 && chatId !== "temp-chat") {
      titlePromise = generateChatTitle(lastUserMsg.content || "Analyze this image").then(
        async (title) => {
          if (title) {
            await supabase.from("chats").update({ title }).eq("id", chatId);
          }
          return title;
        }
      ).catch(() => null);
    }

    // 7. Pass through stream, accumulate full content, then save to DB
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
          } catch { /* ignore non-json */ }
        }
        controller.enqueue(chunk);
      },
      async flush(controller) {
        // Save AI response to DB
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
  } catch (error: any) {
    console.error("Vision API Error:", error);
    return apiError(sanitizeAIError(error), 500, "INTERNAL_SERVER_ERROR");
  }
}
