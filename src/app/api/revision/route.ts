import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { runSubscriptionGuard, getTextResponse } from "@/lib/ai/manager";
import { FREE_MODEL } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PDF path still uses SDK directly (binary multipart can't go through text manager)
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// --- Zod Schema for POST ---
const RevisionSchema = z.object({
    noteId: z.string().uuid("noteId must be a valid UUID"),
});

// GET: Fetch all revisions for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return apiError("Unauthorized", 401, "UNAUTHORIZED");

        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return apiError("User not found", 404, "USER_NOT_FOUND");

        const { data: revisions, error } = await supabase
            .from("revisions")
            .select("id, title, created_at, note_id, notes(title)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ revisions });
    } catch (error: unknown) {
        console.error("GET revisions error:", error);
        return apiError("Failed to fetch revisions", 500, "INTERNAL_SERVER_ERROR");
    }
}

// POST: Generate + save a new revision using Gemini
export async function POST(req: Request) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return apiError("Unauthorized", 401, "UNAUTHORIZED");

        // 2. Parse and validate input
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return apiError("Invalid JSON body", 400, "INVALID_JSON");
        }

        const validation = RevisionSchema.safeParse(body);
        if (!validation.success) {
            return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
        }

        const { noteId } = validation.data;

        // 3. Get authenticated user
        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return apiError("User not found", 404, "USER_NOT_FOUND");

        // 4. Fetch the note (ownership-verified)
        const { data: note, error: noteError } = await supabase
            .from("notes")
            .select("id, title, content, file_url, original_note_id, original_note:original_note_id (share_mode)")
            .eq("id", noteId)
            .eq("user_id", user.id)
            .single();

        if (noteError || !note)
            return apiError("Note not found", 404, "NOTE_NOT_FOUND");

        // Security check for revoked imports
        if (note.original_note_id && note.original_note && (note.original_note as any).share_mode === 'private') {
            return apiError("Access to this shared material has been revoked by the owner.", 403, "MATERIAL_REVOKED");
        }

        const isPdf = !!(note.file_url && (!note.content || (note.content as string).trim() === ""));

        if (!isPdf && !note.content)
            return apiError("Note has no content to generate a revision from.", 400, "EMPTY_NOTE");

        // 5. Quota check (always uses FREE_MODEL for revision)
        const guard = await runSubscriptionGuard(session.user.email, FREE_MODEL, "note_ai", user.id);
        if (!guard.allowed) {
            return apiError(guard.error || "Subscription limit reached", guard.status || 429, "QUOTA_EXCEEDED");
        }

        const systemInstruction = `You are an expert revision tutor. Based on the provided note, produce a structured JSON object with exactly these three fields:
{
  "summary": "...",
  "keywords": [{ "term": "Keyword", "definition": "Short definition." }],
  "qa_pairs": [{ "question": "A review question?", "answer": "The answer." }]
}

IMPORTANT — For the "summary" field, generate a COMPACT, SCANNABLE revision sheet covering every major heading:
- Use ## for each major heading/topic from the note.
- Under each heading, use bullet points, definitions, or markdown tables.
- Bold the most important terms. Keep sections short and focused.
- Cover ALL topics. Return ONLY the raw JSON — no markdown code fences.`;

        // 6. Generate content
        let revisionText: string;
        try {
            if (isPdf) {
                // PDF path: must use SDK directly (binary multipart inline data)
                if (!genAI) return apiError("AI service is not configured.", 503, "AI_NOT_CONFIGURED");
                const model = genAI.getGenerativeModel({ model: FREE_MODEL, systemInstruction });

                const pdfRes = await fetch(note.file_url as string);
                if (!pdfRes.ok)
                    return apiError("Failed to fetch PDF file for processing.", 502, "PDF_FETCH_ERROR");

                const pdfBuffer = await pdfRes.arrayBuffer();
                const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

                const response = await model.generateContent([
                    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
                    `Note Title: ${note.title as string}\n\nThis is a PDF document. Generate the revision object covering all topics in the PDF.`,
                ]);
                revisionText = response.response.text();
            } else {
                // Text path: route through AI Manager (has retry + fallback logic)
                const prompt = `Note Title: ${note.title as string}\n\nContent:\n${note.content as string}\n\nGenerate the revision object.`;
                revisionText = await getTextResponse(prompt, {
                    model: FREE_MODEL,
                    style: "precise",
                    systemPrompt: systemInstruction,
                    stream: false,
                });
            }
            revisionText = revisionText.trim()
                .replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
        } catch {
            return apiError("AI revision generation failed. Please try again.", 502, "AI_SERVICE_ERROR");
        }

        // 7. Safely parse AI response
        let parsed: { summary?: string; keywords?: unknown[]; qa_pairs?: unknown[] };
        try {
            parsed = JSON.parse(revisionText) as typeof parsed;
        } catch {
            console.error("Revision: AI returned invalid JSON:", revisionText);
            return apiError("AI returned an unexpected response. Please try again.", 502, "AI_PARSE_ERROR");
        }

        // 8. Save to database
        const { data: revision, error: insertError } = await supabase
            .from("revisions")
            .insert({
                user_id: user.id,
                note_id: note.id,
                title: note.title as string,
                summary: parsed.summary || "",
                keywords: parsed.keywords || [],
                qa_pairs: parsed.qa_pairs || [],
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ revision });
    } catch (error: unknown) {
        console.error("POST revision error:", error);
        return apiError("Failed to generate revision. Please try again.", 500, "INTERNAL_SERVER_ERROR");
    }
}
