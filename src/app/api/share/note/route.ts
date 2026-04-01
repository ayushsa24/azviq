import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// GET /api/share/note — list user's shared notes
export async function GET() {
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

        const { data: notes, error } = await supabase
            .from("notes")
            .select("id, title, created_at")
            .eq("user_id", dbUser.id)
            .neq("share_mode", "private")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ notes });
    } catch (err) {
        console.error("[share/note GET]", err);
        return NextResponse.json({ error: "Failed to list shared notes" }, { status: 500 });
    }
}
