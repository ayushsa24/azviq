import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
    try {
        const { chatId, userId, messages } = await req.json();

        if (!chatId || !userId || !messages || !Array.isArray(messages)) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        const latestUserMessage = messages[messages.length - 1];

        // 1. Save user message to Supabase (Skip if temporary)
        if (chatId !== 'temp-chat') {
            const { error: insertUserError } = await supabase.from("messages").insert({
                chat_id: chatId,
                role: 'user',
                content: latestUserMessage.content
            });
            if (insertUserError) throw insertUserError;
        }

        // 2. Generate Gemini Response
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are Ascend AI, a highly intelligent and helpful AI study companion. Keep answers clear, beautifully formatted, and educational.",
        });

        // We only send the text content to Gemini to maintain context
        // Real implementation requires formatting history into Gemini's History object type
        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));

        const chatSession = model.startChat({ history });
        const result = await chatSession.sendMessage(latestUserMessage.content);
        const aiResponseText = result.response.text();

        // 3a. Generate elegant title if first message & not temporary
        let generatedTitle = null;
        if (messages.length === 1 && chatId !== 'temp-chat') {
            try {
                const titleResult = await model.generateContent(`Based on the following first message of a chat, generate a very short, concise 2 to 4 word summary title for the chat. Do not use quotes or punctuation.\n\nMessage: "${latestUserMessage.content}"`);
                generatedTitle = titleResult.response.text().trim().replace(/['"]/g, '');

                await supabase.from("chats").update({ title: generatedTitle }).eq("id", chatId);
            } catch (e) {
                console.error("Could not generate title");
            }
        }

        // 3. Save AI response to Supabase (Skip if temporary)
        if (chatId !== 'temp-chat') {
            const { error: insertModelError } = await supabase.from("messages").insert({
                chat_id: chatId,
                role: 'model',
                content: aiResponseText
            });
            if (insertModelError) throw insertModelError;
        }

        // 4. Return to client
        return Response.json({
            role: 'model',
            content: aiResponseText,
            topicTitle: generatedTitle
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
}
