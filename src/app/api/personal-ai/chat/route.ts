import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { getStreamingChatResponse, getAIConfig, runSubscriptionGuard, sanitizeAIError } from "@/lib/ai/manager";
import { apiError } from "@/lib/api";
import { AIMessage, FREE_MODEL } from "@/lib/ai/types";

/**
 * Builds the strict Teacher system prompt by injecting the note's plain text.
 * This prompt is ONLY set server-side and is never exposed to the client.
 */
function buildTeacherPrompt(noteTitle: string, noteContent: string, isPdf: boolean): string {
  const sourceType = isPdf ? "PDF document" : "note";
  return `You are a dedicated AI Study Teacher named "Azviq Teach". A student has shared a ${sourceType} with you for a study session.

DOCUMENT TITLE: "${noteTitle}"

DOCUMENT CONTENT:
---
${noteContent}
---

YOUR STRICT TEACHING RULES:
1. **Stay on topic**: Only discuss content found in the document above. If asked about something unrelated, gently redirect.
2. **Use Markdown**: Use Markdown for all formatting. Bold important terms, use bullet points for lists, and **ALWAYS use a proper Markdown Table** when comparing two or more concepts or presenting structured data. 
   - CRITICAL: Every table MUST include a header row and a separator row (e.g., \`| Feature | ML | DL |\` followed by \`|---|---|---|\`). 
   - Ensure there are no double pipes \`||\` and each row is on a new line.
3. **Correct mistakes clearly**: If the student states something that contradicts the document, begin your reply with the token "[CORRECTION]" on its own line, then explain the correct information kindly but firmly.
4. **Confirm correct answers**: If the student is correct, start with "[CORRECT]" and encourage them to go deeper.
5. **Ask follow-up questions**: After every explanation, ask ONE short follow-up question to test understanding. Keep it focused.
6. **Be concise**: Maximum 3 short paragraphs per response (excluding tables). Students learn better with focused answers.
7. **Teach actively**: Don't just summarize — help the student *understand* by using analogies or examples from the document itself.
8. **First message**: If you receive "SESSION_START", greet the student warmly and briefly outline what the document covers using a clear set of bullet points, then ask what they want to learn first.

LANGUAGE RULE (CRITICAL): 
- Detect the language of each student message automatically.
- If the student writes or speaks in Hindi (Devanagari script, e.g. "पाइथन क्या है?"), respond ENTIRELY in simple, conversational Hindi.
- If the student writes or speaks in English, respond in English.
- For SESSION_START, respond in English by default unless the document language suggests otherwise.
- NEVER mix languages in a single response. Be consistent within each reply.

Remember: You are a teacher, not a search engine. Your goal is to ensure the student truly understands the material.`;
}

/**
 * POST /api/personal-ai/chat
 *
 * Accepts a conversation history + note context and streams back
 * the AI Teacher's response using the existing AI manager.
 *
 * Body: {
 *   messages: Array<{ role: 'user' | 'assistant', content: string }>,
 *   noteTitle: string,
 *   noteContent: string,
 *   isPdf: boolean,
 *   model?: string   // Optional — defaults to gemini-2.5-flash
 * }
 */
export async function POST(req: Request) {
  try {
    // --- Auth Guard ---
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const supabase = createClient(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, ""),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, "")
    );

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return apiError("User not found", 404, "USER_NOT_FOUND");
    }

    // --- Parse Request Body ---
    const body = await req.json();
    const { messages, noteTitle, noteContent, isPdf } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      noteTitle: string;
      noteContent: string;
      isPdf: boolean;
    };

    if (!noteContent || !noteTitle) {
      return apiError("Missing noteContent or noteTitle", 400, "MISSING_CONTEXT");
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return apiError("Missing or empty messages array", 400, "MISSING_MESSAGES");
    }

    // --- Build teacher system prompt ---
    const SAFE_NOTE_LIMIT = 50000;
    const safeNoteContent = noteContent.length > SAFE_NOTE_LIMIT
      ? noteContent.slice(0, SAFE_NOTE_LIMIT) + "\n...[Content truncated due to length limits]"
      : noteContent;
      
    const systemPrompt = buildTeacherPrompt(noteTitle, safeNoteContent, isPdf ?? false);

    // --- Map to AIMessage format ---
    const aiMessages: AIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // --- Rate Limit & Subscription Guard (Personal AI always uses FREE_MODEL for max quota) ---
    const guard = await runSubscriptionGuard(session.user.email, FREE_MODEL, "personal_ai", user.id);
    if (!guard.allowed) {
      return apiError(guard.error || "Subscription check failed", guard.status || 403, "SUBSCRIPTION_REQUIRED");
    }

    // --- AI config: always force FREE_MODEL for high-quota Personal AI sessions ---
    const config = getAIConfig(req, systemPrompt, "Personal AI Teacher");
    config.model = FREE_MODEL;

    // --- Stream the response ---
    const stream = await getStreamingChatResponse(aiMessages, config);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("[PersonalAI Chat] Error:", error);
    return apiError(
      sanitizeAIError(error),
      500,
      "CHAT_ERROR"
    );
  }
}
