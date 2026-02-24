import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: "Missing userId" }, { status: 400 });
    }

    try {
        // Fetch all chats for the user, ordered by pinned first, then newest first
        const { data: chats, error } = await supabase
            .from('chats')
            .select('*, messages(*)')
            .eq('user_id', userId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return Response.json({ chats });
    } catch (error) {
        console.error("History API Error:", error);
        return Response.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    // Use POST to create a new chat session explicitly
    try {
        const { userId, title } = await req.json();

        if (!userId) {
            return Response.json({ error: "Missing userId" }, { status: 400 });
        }

        const { data: userRecord } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();

        const { data, error } = await supabase
            .from('chats')
            .insert({
                user_id: userId,
                title: title || "New Chat",
                username: userRecord?.username || null
            })
            .select()
            .single();

        if (error) throw error;

        return Response.json({ chat: data });
    } catch (error) {
        console.error("Create Chat Error:", error);
        return Response.json({ error: "Failed to create chat" }, { status: 500 });
    }
}
