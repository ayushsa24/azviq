import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

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
