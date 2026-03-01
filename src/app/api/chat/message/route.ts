import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { chatId, userId, role, content } = await req.json();

        if (!chatId || !userId || !role || !content) {
            return Response.json({ error: "Missing fields" }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser || dbUser.id !== userId) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        if (chatId !== 'temp-chat' && content.trim().length > 0) {
            await supabase.from("messages").insert({
                chat_id: chatId,
                user_id: userId,
                role: role,
                content: content,
                email: session.user.email
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        console.error("Save message Error:", error);
        return Response.json({ error: "Failed to save message" }, { status: 500 });
    }
}
