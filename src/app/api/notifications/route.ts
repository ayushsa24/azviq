import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getSupabase() {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getUserId(session: { user?: { email?: string | null } }, supabase: SupabaseClient) {
    const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", session?.user?.email)
        .single();
    return user?.id ?? null;
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabase();
        const userId = await getUserId(session, supabase);
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const url = new URL(req.url);
        const unreadOnly = url.searchParams.get("unread_only") === "true";

        // Secretly clean up notifications older than 14 days
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from("notifications")
            .delete()
            .eq("user_id", userId)
            .lt("created_at", fourteenDaysAgo);

        let query = supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (unreadOnly) query = query.eq("is_read", false);

        const { data: notifications, error } = await query;
        if (error) throw error;

        return NextResponse.json({ notifications });
    } catch (err) {
        console.error("GET notifications error:", err);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabase();
        const userId = await getUserId(session, supabase);
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const { type, title, message, related_subject, related_topic } = body;

        if (!type || !title?.trim() || !message?.trim()) {
            return NextResponse.json({ error: "type, title, and message are required" }, { status: 400 });
        }
        if (type === "todo_reminder" && related_topic) {
            const { data: existing } = await supabase
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", "todo_reminder")
                .eq("related_topic", related_topic)
                .gt("created_at", new Date(Date.now() - 60000).toISOString()) // Within last 60 seconds
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ success: true, duplicated: true });
            }
        }

        const { data: notification, error } = await supabase
            .from("notifications")
            .insert({ user_id: userId, type, title, message, related_subject, related_topic })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ notification }, { status: 201 });
    } catch (err) {
        console.error("POST notification error:", err);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}
