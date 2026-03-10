import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// GET: Fetch all revisions for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { data: revisions, error } = await supabase
            .from("revisions")
            .select("*, notes(title)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ revisions });
    } catch (error) {
        console.error("GET revisions error:", error);
        return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
    }
}

// POST: Generate + save a new revision
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { noteId } = await req.json();
        if (!noteId) return NextResponse.json({ error: "noteId is required" }, { status: 400 });

        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { data: note, error: noteError } = await supabase
            .from("notes")
            .select("id, title, content, file_url")
            .eq("id", noteId)
            .eq("user_id", user.id)
            .single();

        if (noteError || !note)
            return NextResponse.json({ error: "Note not found" }, { status: 404 });

        const isPdf = !!(note.file_url && (!note.content || note.content.trim() === ""));

        if (!isPdf && !note.content)
            return NextResponse.json({ error: "Note has no content" }, { status: 400 });

        if (!genAI) return NextResponse.json({ error: "AI service not configured" }, { status: 500 });

        const systemInstruction = `You are an expert revision tutor. Based on the provided note, produce a structured JSON object with exactly these three fields:
{
  "summary": "...",
  "keywords": [{ "term": "Keyword", "definition": "Short definition." }],
  "qa_pairs": [{ "question": "A review question?", "answer": "The answer." }]
}

IMPORTANT — For the "summary" field, generate a COMPACT, SCANNABLE revision sheet that covers every major heading and topic from the note:
- Use ## for each major heading/topic from the note.
- Under each heading, use one of these formats (choose whichever fits best):
  • 3-5 bullet points (- point) summarizing the key facts.
  • A 2-3 line definition or explanation for concepts.
  • A markdown table (| Col1 | Col2 |) for comparisons, lists of types, steps, or properties.
- Keep each section SHORT and FOCUSED — the entire summary should be quick to scan, not read like an essay.
- Use **bold** to highlight the most important terms or values in each section.
- Cover ALL important topics from the note — don't skip any headings.
- Separate sections with a blank line.

For "keywords": 8-12 items.
For "qa_pairs": 6-10 items.

Return ONLY the raw JSON object — no markdown code fences, no backticks.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction,
        });

        let response;

        if (isPdf) {
            // Fetch PDF bytes from the public URL
            const pdfRes = await fetch(note.file_url);
            if (!pdfRes.ok) {
                return NextResponse.json({ error: "Failed to fetch PDF file" }, { status: 502 });
            }
            const pdfBuffer = await pdfRes.arrayBuffer();
            const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

            response = await model.generateContent([
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: pdfBase64,
                    }
                },
                `Note Title: ${note.title}\n\nThis is a PDF document. Generate the revision object covering all topics in the PDF.`,
            ]);
        } else {
            const prompt = `Note Title: ${note.title}\n\nContent:\n${note.content}\n\nGenerate the revision object.`;
            response = await model.generateContent(prompt);
        }

        let text = response.response.text().trim()
            .replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();

        const parsed = JSON.parse(text);

        const { data: revision, error: insertError } = await supabase
            .from("revisions")
            .insert({
                user_id: user.id,
                note_id: note.id,
                title: `Revision: ${note.title}`,
                summary: parsed.summary || "",
                keywords: parsed.keywords || [],
                qa_pairs: parsed.qa_pairs || [],
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ revision });
    } catch (error) {
        console.error("POST revision error:", error);
        return NextResponse.json({ error: "Failed to generate revision" }, { status: 500 });
    }
}
