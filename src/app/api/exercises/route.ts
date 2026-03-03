import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch exercises, order by most recent
        const { data: exercises, error: exercisesError } = await supabase
            .from("exercises")
            .select(`
        *,
        notes ( title, file_url )
      `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (exercisesError) {
            throw exercisesError;
        }

        return NextResponse.json({ exercises });
    } catch (error) {
        console.error("GET exercises error:", error);
        return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { noteId, count } = await req.json();
        const questionCount = Math.min(Math.max(parseInt(count) || 5, 2), 20); // range 2-20

        if (!noteId) {
            return NextResponse.json({ error: "noteId is required" }, { status: 400 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Fetch the note content to use as context
        const { data: note, error: noteError } = await supabase
            .from("notes")
            .select("id, title, content, file_url")
            .eq("id", noteId)
            .eq("user_id", user.id)
            .single();

        if (noteError || !note) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
        }

        // In a real robust system, if it's a PDF, we'd extract text from the file_url.
        // For now, we will use the `content` field which is populated for text notes.
        const noteContext = note.content || "Use general knowledge about this topic.";

        // 2. Generate questions with Gemini
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

        const prompt = `Topic/Title: ${note.title}\n\nContent:\n${noteContext}\n\nGenerate the quiz.`;

        const response = await model.generateContent(prompt);
        let text = response.response.text().trim();

        if (text.startsWith("```json")) {
            text = text.replace(/^```json/, "");
        }
        if (text.startsWith("```")) {
            text = text.replace(/^```/, "");
        }
        if (text.endsWith("```")) {
            text = text.replace(/```$/, "");
        }

        const questions = JSON.parse(text);

        if (!Array.isArray(questions)) {
            throw new Error("AI did not return an array");
        }

        // 3. Insert into database
        const title = `${note.title} Quiz`;
        const difficulty = "Medium"; // Defaulting or could ask AI to judge

        const { data: exercise, error: insertError } = await supabase
            .from("exercises")
            .insert({
                user_id: user.id,
                note_id: note.id,
                title,
                difficulty,
                status: "Not Started",
                score: null,
                questions,
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        return NextResponse.json({ exercise });
    } catch (error) {
        console.error("POST exercises error:", error);
        return NextResponse.json({ error: "Failed to generate exercise" }, { status: 500 });
    }
}
