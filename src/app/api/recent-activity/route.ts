import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET — Fetch recent activity for the logged-in user
export async function GET(req: Request) {
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
            .limit(30); // Increased limit to account for filtered trashed items

        if (error) {
            console.error("Error fetching recent activity:", error);
            return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
        }

        // Fetch trashed item IDs for this user to filter them out
        const { data: trashItems } = await supabase
            .from("trash")
            .select("item_id, item_type")
            .eq("user_id", user.id);
        
        const trashSet = new Set(trashItems?.map(ti => ti.item_id) || []);

        // Filter out items that are in the trash
        const filteredItems = (items || []).filter(item => !trashSet.has(item.item_id));

        // Fetch original_note_id for notes that are still active
        const noteIds = filteredItems
            .filter(i => i.item_type === "note" || i.item_type === "pdf")
            .map(i => i.item_id);

        let noteMap: Record<string, string> = {};
        if (noteIds.length > 0) {
            const { data: noteData } = await supabase
                .from("notes")
                .select("id, original_note_id, workspace_id")
                .in("id", noteIds);

            if (noteData) {
                // Also get trashed workspace IDs
                const trashedWorkspaceIds = new Set(
                    (trashItems || [])
                        .filter(ti => ti.item_type === "workspace")
                        .map(ti => ti.item_id)
                );

                // Create a set of note IDs whose workspace is trashed
                const notesInTrashedWorkspaces = new Set(
                    noteData
                        .filter(n => n.workspace_id && trashedWorkspaceIds.has(n.workspace_id))
                        .map(n => n.id)
                );

                noteMap = noteData.reduce((acc, n) => ({ ...acc, [n.id]: n.original_note_id }), {});
                
                // Further filter filteredItems to remove notes in trashed workspaces
                // and notes that no longer exist in the notes table (hard deleted)
                const existingNoteIds = new Set(noteData.map(n => n.id));
                const finalFilteredItems = [];
                for (const item of filteredItems) {
                    if (item.item_type === "note" || item.item_type === "pdf") {
                        if (!existingNoteIds.has(item.item_id) || notesInTrashedWorkspaces.has(item.item_id)) {
                            continue;
                        }
                    }
                    finalFilteredItems.push(item);
                }
                
                // Update enrichedItems to use finalFilteredItems
                const enrichedItems = finalFilteredItems.map(item => ({
                    ...item,
                    original_note_id: (item.item_type === "note" || item.item_type === "pdf") ? noteMap[item.item_id] : null
                })).slice(0, 15);

                return NextResponse.json({ items: enrichedItems });
            }
        }

        const enrichedItems = filteredItems.map(item => ({
            ...item,
            original_note_id: (item.item_type === "note" || item.item_type === "pdf") ? noteMap[item.item_id] : null
        })).slice(0, 15); // Return only the top 15 non-trashed items

        return NextResponse.json({ items: enrichedItems });
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

        // Insert or update securely, giving it the latest timestamp
        // we use upsert matching the unique constraint in the db!
        const { error } = await supabase
            .from("recent_activity")
            .upsert({
                user_id: user.id,
                item_id,
                item_type,
                title: title || "Untitled",
                href,
                opened_at: new Date().toISOString(),
            }, { 
                onConflict: 'user_id, item_id, item_type' 
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
