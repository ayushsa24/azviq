import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:latest";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { prompt, selectedText, contextText } = await req.json();

        if (!prompt && !selectedText) {
            return NextResponse.json({ error: "No prompt or selected text provided" }, { status: 400 });
        }

        let systemInstruction = "You are an AI assistant integrated directly into a Notion-style text editor. Your job is to help the user write, brainstorm, edit, or explain text. Use standard Markdown formatting (like headers, bolding, bullet points, and tables) where appropriate to make your response clear and professional. Return ONLY the requested text, without conversational filler like 'Here is the response'.";

        const lowerPrompt = prompt?.toLowerCase() || "";
        if (lowerPrompt.startsWith("explain")) {
            systemInstruction = "You are an AI assistant. Explain the following text clearly and concisely.";
        } else if (lowerPrompt.startsWith("summarize")) {
            systemInstruction = "You are an AI assistant. Summarize the following text into a few sharp bullet points.";
        }

        let fullPrompt = "";
        if (prompt && !lowerPrompt.startsWith("explain") && !lowerPrompt.startsWith("summarize")) {
            fullPrompt = `User Prompt: ${prompt}\n\n`;
        }
        if (selectedText) {
            fullPrompt += `Selected Text to modify/reference: "${selectedText}"\n\n`;
        }
        if (contextText) {
            fullPrompt += `Surrounding Document Context: "${contextText.substring(0, 500)}..."`;
        }

        // Call Ollama with streaming enabled
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: fullPrompt },
                ],
                stream: true,
            }),
        });

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            console.error("Ollama API error:", errorText);
            return NextResponse.json({ error: `Ollama error: ${errorText.substring(0, 200)}` }, { status: 500 });
        }

        // Stream the response back to the client as a ReadableStream
        const encoder = new TextEncoder();
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async pull(controller) {
                const { done, value } = await reader.read();
                if (done) {
                    controller.close();
                    return;
                }

                const text = decoder.decode(value, { stream: true });
                // Ollama streams newline-separated JSON objects
                const lines = text.split("\n").filter(Boolean);
                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        const content = json.message?.content || "";
                        if (content) {
                            // Send as SSE-style data
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                        }
                        if (json.done) {
                            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                        }
                    } catch {
                        // Skip malformed JSON
                    }
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("AI Editor error:", error);
        return NextResponse.json({ error: error.message || "Failed to process AI request" }, { status: 500 });
    }
}
