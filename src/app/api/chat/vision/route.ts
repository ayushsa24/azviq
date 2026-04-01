import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkAiDailyQuota } from "@/lib/ai-tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

    // 2. Quota Check
    const quota = await checkAiDailyQuota(userId);
    if (!quota.success) {
      return apiError("Daily AI Usage Cap Reached.", 429, "QUOTA_EXCEEDED");
    }

    if (!genAI) return apiError("Gemini API not configured.", 503, "AI_NOT_CONFIGURED");

    // 3. Save User Message to DB (Now with image persistence)
    const lastUserMsg = messages[messages.length - 1];
    if (chatId !== "temp-chat") {
      const contentToSave = image 
        ? JSON.stringify({ text: lastUserMsg.content, image: image })
        : lastUserMsg.content;

      await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: userId,
        role: "user",
        content: contentToSave,
        email: session.user.email,
      });
    }

    // 4. Prepare Gemini Vision Input
    // Using the exact version IDs available in your project dashboard
    const primaryModelId = "gemini-2.5-flash";
    const fallbackModelId = "gemini-2.0-flash";
    
    let model = genAI.getGenerativeModel({ model: primaryModelId });

    // Handle Image: Remove data URL prefix if present
    const base64Data = image.split(",")[1] || image;
    
    // Create the content parts
    const parts = [
      { text: `System Instruction: You are Avyx AI, a premium study assistant. You have been provided an image of some study material. Help the user understand it perfectly. Always format your output beautifully with markdown.\n\nUser Question: ${lastUserMsg.content || "Analyze this study material and explain it simply."}` },
      {
        inlineData: {
          mimeType: "image/jpeg", 
          data: base64Data,
        }
      }
    ];

    // 5. Generate Content with robust error handling and auto-fallback
    let result;
    try {
      result = await model.generateContentStream(parts);
    } catch (err: any) {
      console.error("Gemini Vision Generation FULL ERROR:", JSON.stringify(err, null, 2));
      
      // AUTO-FALLBACK: If the 2.5 model isn't ready, try 2.0
      if (err.status === 404 || err.message?.includes("404")) {
        try {
          console.log("Retrying with fallback model-2.0...");
          model = genAI.getGenerativeModel({ model: fallbackModelId });
          result = await model.generateContentStream(parts);
        } catch (fallbackErr: any) {
           console.error("Fallback Vision also failed:", fallbackErr);
           return apiError("Vision model not available. Please check your Gemini AI Studio settings.", 503, "MODEL_NOT_FOUND");
        }
      } else if (err.message?.includes("429") || err.status === 429) {
        return apiError("Free Tier limit reached. Please wait a minute and try again.", 429, "RATE_LIMIT_EXCEEDED");
      } else {
        throw err;
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullContent += chunkText;
            controller.enqueue(encoder.encode(JSON.stringify({ message: { content: chunkText } }) + "\n"));
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
        } catch (streamErr: any) {
          console.error("Stream processing error:", streamErr);
          controller.enqueue(encoder.encode(JSON.stringify({ error: "Response stream interrupted." }) + "\n"));
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
