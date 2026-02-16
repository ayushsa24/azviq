import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Summarize study notes into clear bullet points.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    return Response.json({
      summary: response.choices[0].message.content,
    });
  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
