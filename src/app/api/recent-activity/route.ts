import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET — Fetch recent activity for the logged-in user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { data: items, error } = await supabase
            .from("recent_activity")
            .select("id, item_id, item_type, title, href, opened_at")
            .eq("user_id", user.id)
            .order("opened_at", { ascending: false })
            .limit(15);

        if (error) {
            console.error("Error fetching recent activity:", error);
            return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
        }

        return NextResponse.json({ items: items || [] });
    } catch (err) {
        console.error("Error in recent-activity GET:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// POST — Log an activity (upsert: if item already exists, update opened_at)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { item_id, item_type, title, href } = body;

        if (!item_id || !item_type || !href) {
            return NextResponse.json({ error: "Missing required fields: item_id, item_type, href" }, { status: 400 });
        }

        // Explicitly delete any existing entry for this item first to avoid duplicates
        // We delete by title (which is shared between a Note, its Exercise, and its Revision)
        // This ensures the Recent Activity list only shows the single most recent interaction for a given material.
        const itemTitle = title || "Untitled";
        await supabase
            .from("recent_activity")
            .delete()
            .eq("user_id", user.id)
            .eq("title", itemTitle);

        // Insert as new, giving it the latest timestamp
        const { error } = await supabase
            .from("recent_activity")
            .insert({
                user_id: user.id,
                item_id,
                item_type,
                title: title || "Untitled",
                href,
                opened_at: new Date().toISOString(),
            });

        if (error) {
            console.error("Error logging recent activity:", error);
            return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error in recent-activity POST:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
