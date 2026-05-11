import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, context: { params: Promise<{ chatId: string }> }) {
    try {
        const { title, is_pinned, is_archived } = await req.json();
        const { chatId } = await context.params;

        if (!chatId) {
            return Response.json({ error: "Missing chatId" }, { status: 400 });
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

        const { data: chatData } = await supabase
            .from("chats")
            .select("user_id")
            .eq("id", chatId)
            .single();

        if (!chatData || !dbUser || chatData.user_id !== dbUser.id) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const updates: Record<string, unknown> = {};
        if (title !== undefined) updates.title = title;
        if (is_pinned !== undefined) updates.is_pinned = is_pinned;
        if (is_archived !== undefined) updates.is_archived = is_archived;

        const { data, error } = await supabase
            .from("chats")
            .update(updates)
            .eq("id", chatId)
            .select()
            .single();

        if (error) throw error;

        return Response.json({ success: true, chat: data });
    } catch (error) {
        console.error("Error updating chat:", error);
        return Response.json({ error: "Failed to update chat" }, { status: 500 });
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ chatId: string }> }) {
    try {
        const { chatId } = await context.params;

        if (!chatId) {
            return Response.json({ error: "Missing chatId" }, { status: 400 });
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

        // 1. Fetch chat metadata
        const { data: chatData, error: fetchError } = await supabase
            .from("chats")
            .select("*")
            .eq("id", chatId)
            .single();
            
        if (fetchError || !chatData) {
            return Response.json({ error: "Chat not found" }, { status: 404 });
        }

        if (!dbUser || chatData.user_id !== dbUser.id) {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Fetch all messages for backup
        const { data: messages } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true });

        // Insert into Trash for soft-delete
        await supabase.from("trash").insert({
            user_id: dbUser.id,
            item_type: "chat",
            item_id: chatId,
            title: chatData.title || "Untitled Chat",
            data: { ...chatData, messages: messages || [] }
        });

        // 3. Delete related items explicitly to avoid foreign key errors
        await supabase.from("shared_chats").delete().eq("chat_id", chatId);
        await supabase.from("messages").delete().eq("chat_id", chatId);

        // 4. Finally delete the chat
        const { error: deleteError } = await supabase
            .from("chats")
            .delete()
            .eq("id", chatId);

        if (deleteError) throw deleteError;

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error deleting chat:", error);
        return Response.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
