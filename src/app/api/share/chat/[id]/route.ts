import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET /api/share/chat/[id] — public, no auth required
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabaseClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: shared, error } = await supabaseClient
            .from("shared_chats")
            .select("id, title, messages, created_at")
            .eq("id", id)
            .single();

        if (error || !shared) {
            return NextResponse.json({ error: "Shared chat not found." }, { status: 404 });
        }

        return NextResponse.json({ shared });
    } catch (err) {
        console.error("[share/chat/:id GET]", err);
        return NextResponse.json({ error: "Failed to fetch shared chat." }, { status: 500 });
    }
}

// DELETE /api/share/chat/[id] — revoke a shared link (supports id="bulk")
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 403 });
        }

        const adminSupabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (id === "bulk") {
            const { error } = await adminSupabase
                .from("shared_chats")
                .delete()
                .eq("user_id", dbUser.id);
            if (error) throw error;
        } else {
            const { error } = await adminSupabase
                .from("shared_chats")
                .delete()
                .eq("id", id)
                .eq("user_id", dbUser.id);
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[share/chat/:id DELETE]", err);
        return NextResponse.json({ error: "Failed to delete shared link." }, { status: 500 });
    }
}
