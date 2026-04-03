import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { checkAiDailyQuota } from "@/lib/ai-tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// --- Zod Schema: Validate the exact shape of incoming requests ---
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

    const { chatId, messages, image } = validation.data;

    // 2. Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    // 3. Verify userId belongs to authenticated user
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (dbError || !dbUser) {
      return apiError("Forbidden: You do not have permission to perform this action.", 403, "FORBIDDEN");
    }
    const userId = dbUser.id;

    const latestUserMessage = messages[messages.length - 1];

    // 4. Save user message to Supabase (Skip if temporary)
    if (chatId !== "temp-chat") {
      const contentToSave = image 
        ? JSON.stringify({ text: latestUserMessage.content, image: image })
        : latestUserMessage.content;

      const { error: insertUserError } = await supabase
        .from("messages")
        .upsert({
          id: latestUserMessage.id, // If provided, update this message
          chat_id: chatId,
          user_id: userId,
          role: "user",
          content: contentToSave,
          email: session.user.email,
        });
      if (insertUserError) throw insertUserError;
    }

    // --- AI Daily Quota Check ---
    const quota = await checkAiDailyQuota(userId);
    if (!quota.success) {
      return apiError("Daily AI Usage Cap Reached (200/day). Please try again tomorrow.", 429, "QUOTA_EXCEEDED");
    }

    // 5. Format messages for Ollama with robust cleaning
    const cleanMessages = messages.filter((m) => 
      !m.content.includes("[ERROR]:") && 
      !m.content.includes("Oops! Something went wrong")
    );

    const formattedMessages: { role: string; content: string }[] = [];
    let lastRole: string | null = null;

    for (const msg of cleanMessages) {
      let content = msg.content;
      
      // If message is JSON-encoded (likely from a vision prompt), extract the text part
      if (msg.role === "user" && content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          content = parsed.text || parsed.content || content;
        } catch (e) {
          // Fallback to original content if not valid JSON
        }
      }

      if (msg.role === lastRole) {
        // Merge consecutive messages of the same role (avoids Ollama/Llama validation errors)
        if (formattedMessages.length > 0) {
          formattedMessages[formattedMessages.length - 1].content += "\n\n" + content;
        }
      } else {
        formattedMessages.push({ role: msg.role, content });
        lastRole = msg.role;
      }
    }

    formattedMessages.unshift({
      role: "system",
      content:
        "You are Avyx AI, a highly intelligent and helpful AI study companion. Keep answers clear, beautifully formatted, and educational.",
    });

    // 6. Call the local Ollama API with streaming
    let response: Response;
    try {
      response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          messages: formattedMessages,
          stream: true,
        }),
      });
    } catch {
      return apiError("AI service is unavailable. Please try again later.", 503, "AI_SERVICE_UNAVAILABLE");
    }

    if (!response.ok) {
      console.error("Ollama error:", await response.text());
      return apiError("AI service returned an error. Is Ollama running?", 502, "AI_SERVICE_ERROR");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");
    let fullContent = "";
    let titlePromise: Promise<string | null> | null = null;

    // 7. Generate a title on the first message (non-blocking)
    if (messages.length === 1 && chatId !== "temp-chat") {
      titlePromise = fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2",
          prompt: `Based on the following first message of a chat, generate a very short, concise 2 to 4 word summary title for the chat. Do not use quotes or punctuation.\n\nMessage: "${latestUserMessage.content}"`,
          stream: false,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const titleData = await res.json() as { response: string };
            const newTitle = titleData.response.trim().replace(/['"]/g, "");
            await supabase
              .from("chats")
              .update({ title: newTitle })
              .eq("id", chatId);
            return newTitle;
          }
          return null;
        })
        .catch((e) => {
          console.error("Could not generate title with Ollama", e);
          return null;
        });
    }

    // 8. Return Streaming Response
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
            // Ignore non-JSON lines in the stream
          }
        }
        controller.enqueue(chunk);
      },
      async flush(controller) {
        // Save the complete AI response after stream ends
        if (chatId !== "temp-chat" && fullContent.trim().length > 0) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            user_id: userId,
            role: "model",
            content: fullContent,
            email: session.user!.email,
          });
        }

        // Alert client to the updated title
        if (titlePromise) {
          const resolvedTitle = await titlePromise;
          if (resolvedTitle) {
            controller.enqueue(
              encoder.encode(
                "\n" +
                  JSON.stringify({ __generatedTitle: resolvedTitle }) +
                  "\n",
              ),
            );
          }
        }
      },
    });

    return new Response(response.body!.pipeThrough(transformStream), {
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
