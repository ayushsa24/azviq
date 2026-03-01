import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt } = await req.json();

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are a productivity assistant for a student. The user will give you a high-level task or project.
Your job is to break it down into a list of actionable, bite-sized tasks.
Return ONLY a raw JSON array of objects. Do not wrap it in markdown codeblocks like \`\`\`json\`\`\`.
Each object MUST have the following structure:
{
  "title": "Task name",
  "status": "not_started"
}
Limit to maximum 10 tasks. Be concise and realistic for a student.`,
        });

        const response = await model.generateContent(prompt);
        let text = response.response.text().trim();

        // Attempt to strip markdown code blocks if the AI disobeyed instructions
        if (text.startsWith("```json")) {
            text = text.replace(/^```json/, "");
            text = text.replace(/```$/, "");
        } else if (text.startsWith("```")) {
            text = text.replace(/^```/, "");
            text = text.replace(/```$/, "");
        }

        const tasks = JSON.parse(text);

        if (!Array.isArray(tasks)) {
            throw new Error("AI did not return an array");
        }

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error("AI Task Generation Error:", error);
        return NextResponse.json({ error: "Failed to generate tasks" }, { status: 500 });
    }
}
