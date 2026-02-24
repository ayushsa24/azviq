import { supabase } from "@/lib/supabase";

export async function PUT(req: Request, context: { params: Promise<{ chatId: string }> }) {
    try {
        const { title, is_pinned, is_archived } = await req.json();
        const { chatId } = await context.params;

        if (!chatId) {
            return Response.json({ error: "Missing chatId" }, { status: 400 });
        }

        const updates: any = {};
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

        const { error } = await supabase
            .from("chats")
            .delete()
            .eq("id", chatId);

        if (error) throw error;

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error deleting chat:", error);
        return Response.json({ error: "Failed to delete chat" }, { status: 500 });
    }
}
