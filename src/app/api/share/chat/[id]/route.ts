import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/share/chat/[id] — public, no auth required
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: shared, error } = await supabase
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
