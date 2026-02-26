import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || !text.trim()) {
      return Response.json({ error: "Text is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "Summarize study notes into clear bullet points.",
    });

    const response = await model.generateContent(text);

    return Response.json({
      summary: response.response.text(),
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
