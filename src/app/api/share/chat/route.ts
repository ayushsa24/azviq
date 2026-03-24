import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// POST /api/share/chat — create a shared chat snapshot
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 403 });
        }

        const body = await req.json();
        const { chatId, title, messages } = body;

        if (!chatId || !messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { data: shared, error } = await supabase
            .from("shared_chats")
            .insert({
                chat_id: chatId,
                user_id: dbUser.id,
                title: title || "Shared Chat",
                messages: messages,
            })
            .select("id")
            .single();

        if (error) throw error;

        return NextResponse.json({ id: shared.id });
    } catch (err) {
        console.error("[share/chat POST]", err);
        return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
    }
}
