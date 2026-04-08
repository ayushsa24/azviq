import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { runSubscriptionGuard } from "@/lib/ai/manager";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// --- Zod Schema ---
const ExercisePostSchema = z.object({
    noteId: z.string().uuid("noteId must be a valid UUID"),
    count: z.number().int().min(2).max(20).optional().default(5),
});

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

// GET: Fetch all exercises for current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return apiError("User not found", 404, "USER_NOT_FOUND");
        }

        const { data: exercises, error: exercisesError } = await supabase
            .from("exercises")
            .select(`id, title, difficulty, status, score, time_taken, created_at, note_id, notes ( title, file_url )`)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (exercisesError) throw exercisesError;

        return NextResponse.json({ exercises });
    } catch (error: unknown) {
        console.error("GET exercises error:", error);
        return apiError("Failed to fetch exercises", 500, "INTERNAL_SERVER_ERROR");
    }
}

// POST: Generate a new exercise with Gemini
export async function POST(req: Request) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        // 2. Parse and validate input
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return apiError("Invalid JSON body", 400, "INVALID_JSON");
        }

        const validation = ExercisePostSchema.safeParse(body);
        if (!validation.success) {
            return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
        }

        const { noteId, count } = validation.data;
        const questionCount = count;

        // 3. Get authenticated user
        const { data: user, error: userError } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();

        if (userError || !user) {
            return apiError("User not found", 404, "USER_NOT_FOUND");
        }

        // 4. Fetch note (ownership-verified)
        const { data: note, error: noteError } = await supabase
            .from("notes")
            .select("id, title, content, file_url")
            .eq("id", noteId)
            .eq("user_id", user.id)
            .single();

        if (noteError || !note) {
            return apiError("Note not found or unauthorized", 404, "NOTE_NOT_FOUND");
        }

        // 5. AI service check & Quota check
        if (!genAI) {
            return apiError("AI service is not configured.", 503, "AI_NOT_CONFIGURED");
        }

        const guard = await runSubscriptionGuard(session.user.email, "gemini-2.5-flash", "exercise", user.id);
        if (!guard.allowed) {
            return apiError(guard.error || "Subscription limit reached", guard.status || 403, "QUOTA_EXCEEDED");
        }

        const noteContext = (note.content as string | null) || "Use general knowledge about this topic.";

        // 6. Generate questions with Gemini
        let questionsText: string;
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: `You are an expert tutor. Create a ${questionCount}-question multiple-choice quiz based on the user's provided text.
Return ONLY a raw JSON array of objects. Do not wrap it in markdown codeblocks like \`\`\`json\`\`\`.
Each object MUST have the following structure:
{
  "question": "The question text?",
  "options": ["A", "B", "C", "D"],
  "correctAnswerIndex": 0,
  "explanation": "Why this is correct."
}`,
            });

            const prompt = `Topic/Title: ${note.title as string}\n\nContent:\n${noteContext}\n\nGenerate the quiz.`;
            const response = await model.generateContent(prompt);
            questionsText = response.response.text().trim()
                .replace(/^```json\s*/m, "").replace(/^```\s*/m, "").replace(/```\s*$/m, "").trim();
        } catch {
            return apiError("AI exercise generation failed. Please try again.", 502, "AI_SERVICE_ERROR");
        }

        // 7. Safely parse AI JSON response
        let questions: QuizQuestion[];
        try {
            questions = JSON.parse(questionsText) as QuizQuestion[];
        } catch {
            console.error("Exercise: AI returned invalid JSON:", questionsText);
            return apiError("AI returned an unexpected response format. Please try again.", 502, "AI_PARSE_ERROR");
        }

        if (!Array.isArray(questions)) {
            return apiError("AI returned an unexpected response format. Please try again.", 502, "AI_PARSE_ERROR");
        }

        // 8. Insert into database
        const { data: exercise, error: insertError } = await supabase
            .from("exercises")
            .insert({
                user_id: user.id,
                note_id: note.id,
                title: `Exercise: ${note.title as string}`,
                difficulty: "Medium",
                status: "Not Started",
                score: null,
                questions,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ exercise });
    } catch (error: unknown) {
        console.error("POST exercises error:", error);
        return apiError("Failed to generate exercise. Please try again.", 500, "INTERNAL_SERVER_ERROR");
    }
}
