import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { chatId, userId, messages } = await req.json();

        if (!chatId || !userId || !messages || !Array.isArray(messages)) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        // ✅ SECURITY CHECK: Verify the request is made by an authenticated user
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ✅ SECURITY CHECK: Verify the provided userId actually belongs to the logged-in email!
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser || dbUser.id !== userId) {
            return Response.json({ error: "Forbidden: You do not have permission to perform this action." }, { status: 403 });
        }

        const latestUserMessage = messages[messages.length - 1];

        // 1. Save user message to Supabase (Skip if temporary)
        if (chatId !== 'temp-chat') {
            const { error: insertUserError } = await supabase.from("messages").insert({
                chat_id: chatId,
                user_id: userId,
                role: 'user',
                content: latestUserMessage.content,
                email: session.user.email
            });
            if (insertUserError) throw insertUserError;
        }

        // 2. Generate Ollama Response
        // We format the messages for Ollama (it expects role and content)
        const formattedMessages = messages.map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // Add a system instruction as the very first message
        formattedMessages.unshift({
            role: "system",
            content: "You are Ascend AI, a highly intelligent and helpful AI study companion. Keep answers clear, beautifully formatted, and educational."
        });

        // Call the local Ollama API - Enable Streaming!
        const response = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama3.2",
                messages: formattedMessages,
                stream: true // Changed to stream: true
            }),
        });

        if (!response.ok) {
            console.error("Ollama error:", await response.text());
            throw new Error(`Ollama API error. Is Ollama running?`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        let titlePromise: Promise<string | null> | null = null;

        // 3a. Generate elegant title if first message & not temporary (Does NOT block streaming tokens!)
        if (messages.length === 1 && chatId !== 'temp-chat') {
            titlePromise = fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "llama3.2",
                    prompt: `Based on the following first message of a chat, generate a very short, concise 2 to 4 word summary title for the chat. Do not use quotes or punctuation.\n\nMessage: "${latestUserMessage.content}"`,
                    stream: false
                }),
            }).then(async res => {
                if (res.ok) {
                    const titleData = await res.json();
                    const newTitle = titleData.response.trim().replace(/['"]/g, '');
                    await supabase.from("chats").update({ title: newTitle }).eq("id", chatId);
                    return newTitle;
                }
                return null;
            }).catch(e => {
                console.error("Could not generate title with Ollama", e);
                return null;
            });
        }

        // 4. Return Streaming Web Response
        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = decoder.decode(chunk, { stream: true });
                const lines = text.split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            fullContent += parsed.message.content;
                        }
                    } catch (e) { }
                }
                // Pass raw chunk directly to client
                controller.enqueue(chunk);
            },
            async flush(controller) {
                // 3. Save full AI response to Supabase ONLY when stream finishes
                if (chatId !== 'temp-chat') {
                    await supabase.from("messages").insert({
                        chat_id: chatId,
                        user_id: userId,
                        role: 'model',
                        content: fullContent,
                        email: session.user!.email
                    });
                }

                // Alert client to what the title updated to
                if (titlePromise) {
                    const resolvedTitle = await titlePromise;
                    if (resolvedTitle) {
                        controller.enqueue(encoder.encode("\n" + JSON.stringify({ __generatedTitle: resolvedTitle }) + "\n"));
                    }
                }
            }
        });

        return new Response(response.body!.pipeThrough(transformStream), {
            headers: {
                "Content-Type": "application/x-ndjson",
                "Cache-Control": "no-cache"
            }
        });

    } catch (error) {
        console.error("Chat API Error:", error);
        return Response.json({ error: "Something went wrong! Is Ollama installed and running?" }, { status: 500 });
    }
}
