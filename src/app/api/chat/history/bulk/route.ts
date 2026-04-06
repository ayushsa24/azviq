import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// PATCH /api/chat/history/bulk — Archive/Unarchive all chats
export async function PATCH() {
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

        const { error } = await supabase
            .from("chats")
            .update({ is_archived: true })
            .eq("user_id", dbUser.id)
            .eq("is_archived", false); // Only archive non-archived ones

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[chat/history/bulk PATCH]", err);
        return NextResponse.json({ error: "Failed to archive chats." }, { status: 500 });
    }
}

// DELETE /api/chat/history/bulk — Delete all archived chats
export async function DELETE() {
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

        const { error } = await supabase
            .from("chats")
            .delete()
            .eq("user_id", dbUser.id)
            .eq("is_archived", true); // Only delete archived ones

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[chat/history/bulk DELETE]", err);
        return NextResponse.json({ error: "Failed to delete archived chats." }, { status: 500 });
    }
}
