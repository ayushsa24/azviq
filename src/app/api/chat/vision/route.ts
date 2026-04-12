import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getVisionStreamResponse, runSubscriptionGuard } from "@/lib/ai/manager";
import { generateChatTitle } from "@/lib/ai/providers/ollama";

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

    // 2. Enforce AI Daily Quota & Tier Access (Tracking type: 'vision')
    const guard = await runSubscriptionGuard(session.user.email, "gemini-2.5-flash", "vision", userId);
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

    // 5. Generate with Vision-capable Gemini model (via AI Manager)
    let resultStream: AsyncIterable<{ text: () => string }>;
    try {
      resultStream = await getVisionStreamResponse(parts, {
        model: "gemini-2.5-flash",
        style: "balanced",
        stream: true,
      });
    } catch (err: any) {
      console.error("Vision generation error:", err);
      if (err.status === 429 || err.message?.includes("429")) {
        return apiError("Free Tier limit reached. Please wait and try again.", 429, "RATE_LIMIT_EXCEEDED");
      }
      return apiError("Vision model unavailable. Please try again.", 503, "MODEL_NOT_FOUND");
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

    // 7. Stream back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          for await (const chunk of resultStream) {
            const chunkText = chunk.text();
            fullContent += chunkText;
            controller.enqueue(
              encoder.encode(JSON.stringify({ message: { content: chunkText } }) + "\n")
            );
          }

          // Save AI response to DB
          if (chatId !== "temp-chat" && fullContent.trim()) {
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
        } catch (streamErr: any) {
          console.error("Vision stream error:", streamErr);
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: "Response stream interrupted." }) + "\n")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Vision API Error:", error);
    return apiError("Vision processing failed.", 500, "INTERNAL_SERVER_ERROR");
  }
}
