import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getSupabase() {
    return createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

async function getUserId(
    session: { user?: { email?: string | null } },
    supabase: SupabaseClient
) {
    const { data: user, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", session?.user?.email)
        .maybeSingle();
    if (error) throw error;
    return user?.id ?? null;
}

// GET — fetch notifications for the authenticated user
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabase();
        const userId = await getUserId(session, supabase);
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const url = new URL(req.url);
        const unreadOnly = url.searchParams.get("unread_only") === "true";

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
        console.error("GET /api/notifications error:", err);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

// POST — create a notification (with dedup for todo_reminders)
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabase();
        const userId = await getUserId(session, supabase);
        if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

        let body: any;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { type, title, message, related_subject, related_topic } = body;

        if (
            typeof type !== "string" ||
            typeof title !== "string" ||
            typeof message !== "string" ||
            !title.trim() ||
            !message.trim()
        ) {
            return NextResponse.json(
                { error: "type (string), title (string), and message (string) are required" },
                { status: 400 }
            );
        }

        // Dedupe using DB-side idempotency
        // Calculate a 60-second window bucket key
        const dedupeKey = type === "todo_reminder" && related_topic 
            ? `todo_reminder:${related_topic}:${Math.floor(Date.now() / 60000)}`
            : null;

        const { data: notification, error } = await supabase
            .from("notifications")
            .insert({ 
                user_id: userId, 
                type, 
                title: title.trim(), 
                message: message.trim(), 
                related_subject, 
                related_topic,
                dedupe_key: dedupeKey 
            })
            .select()
            .maybeSingle();

        if (error) {
            // Check for Postgres unique constraint violation (code 23505)
            if (error.code === "23505") {
                return NextResponse.json({ success: true, duplicated: true });
            }
            throw error;
        }

        if (!notification && dedupeKey) {
            return NextResponse.json({ success: true, duplicated: true });
        }

        return NextResponse.json({ notification }, { status: 201 });
    } catch (err) {
        console.error("POST /api/notifications error:", err);
        return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }
}
