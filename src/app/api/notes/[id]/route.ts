import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, '');
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, '');
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch the main note and its parent (if any)
        const { data: note, error: noteError } = await (supabase
            .from("notes")
            .select(`
                *,
                original_note:original_note_id (
                    share_mode,
                    user_id
                )
            `)
            .eq("id", id)
            .single() as any);

        if (noteError || !note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const isOwner = note.user_id === user.id;
        
        // SECURITY HARDENING: Re-verify the parent share mode and original ownership explicitly
        // This prevents "inspect" hacks if the join was optimized away or failed.
        let parentShareMode = note.original_note?.share_mode;
        let originalOwnerId = note.original_note?.user_id;
        
        if (note.original_note_id) {
            const { data: original } = await supabase
                .from("notes")
                .select("share_mode, user_id")
                .eq("id", note.original_note_id)
                .single();
            
            if (original) {
                parentShareMode = original.share_mode;
                originalOwnerId = original.user_id;
            } else {
                // If original note is gone, consider it revoked
                parentShareMode = "private";
            }
        }

        const isOriginalOwner = originalOwnerId === user.id;

        // AGGRESSIVE REDACTION: If this is an import AND user is NOT the original creator AND original is private
        if (note.original_note_id && !isOriginalOwner && parentShareMode === 'private') {
            console.warn(`[Security] REVOKING ACCESS for note ${id}. User ${user.id} is not original owner ${originalOwnerId}`);
            note.content = "<p>Access to this shared material has been restricted by the owner.</p>";
            note.is_revoked = true; // Tell the frontend it's revoked so it can show an icon
        }
        
        // Stabilized Importer Fetch: Get users who have cloned this note
        let importers: any[] = [];
        if (isOwner) {
            // Step 1: Find all notes that cloned this note
            const { data: clonedNotes, error: impError } = await supabase
                .from("notes")
                .select("user_id, created_at")
                .eq("original_note_id", id)
                .neq("user_id", user.id); // Exclude the owner
            
            if (impError) {
                console.error("[Importers API] Note fetch error:", impError);
            }

            if (clonedNotes && clonedNotes.length > 0) {
                // Step 2: Extract unique user IDs and map their import times
                const importTimeMap: Record<string, string> = {};
                clonedNotes.forEach(n => {
                    if (!importTimeMap[n.user_id]) {
                        importTimeMap[n.user_id] = n.created_at;
                    }
                });

                const uniqueUserIds = Object.keys(importTimeMap);
                
                // Step 3: Fetch the user profiles directly
                const { data: userProfiles, error: userError } = await supabase
                    .from("users")
                    .select("id, name, email, avatar_url")
                    .in("id", uniqueUserIds);
                    
                if (userError) {
                    console.error("[Importers API] User fetch error:", userError);
                }

                // Step 4: Map the profiles with their corresponding import time
                importers = userProfiles?.map((profile: any) => ({
                    id: profile.id,
                    name: profile.name || profile.email || "Anonymous Importer",
                    email: profile.email || "No Email Provided",
                    image: profile.avatar_url || null,
                    importedAt: importTimeMap[profile.id]
                })) || [];
            }
            
            console.log(`[Importers API] Found ${importers.length} total importers for note ${id}`);
        }

        // Return enriched note data with parent permissions and importers list
        return NextResponse.json({ 
            note, 
            isOwner,
            parentShareMode: parentShareMode ?? null,
            importers
        });
    } catch (error: unknown) {
        console.error("GET note error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to fetch note" }, { status: 500 });
    }
}


export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.workspace_id !== undefined) updateData.workspace_id = body.workspace_id;
        if (body.is_favourite !== undefined) updateData.is_favourite = body.is_favourite;
        if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;
        if (body.is_pinned_in_favourites !== undefined) updateData.is_pinned_in_favourites = body.is_pinned_in_favourites;
        if (body.content !== undefined) updateData.content = body.content;
        if (body.is_public !== undefined) updateData.is_public = body.is_public;
        if (body.share_mode !== undefined) updateData.share_mode = body.share_mode;

        // Spaced repetition fields
        if (body.retention_score !== undefined) updateData.retention_score = body.retention_score;
        if (body.last_reviewed_at !== undefined) updateData.last_reviewed_at = body.last_reviewed_at;
        if (body.next_review_at !== undefined) updateData.next_review_at = body.next_review_at;

        // Check permissions first: Owners see everything, collaborators match by share_mode
        const { data: note, error: fetchError } = await supabase
            .from("notes")
            .select("user_id, share_mode")
            .eq("id", id)
            .single();

        if (fetchError || !note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        const isOwner = note.user_id === user.id;
        const canEdit = isOwner || note.share_mode === "edit";

        if (!canEdit) {
            return NextResponse.json({ error: "No permission to edit this note" }, { status: 403 });
        }

        const { data: updatedNote, error } = await supabase
            .from("notes")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ note: updatedNote });
    } catch (error: unknown) {
        console.error("PATCH notes error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to update note" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch note to get file URL before deleting
        const { data: noteData, error: fetchError } = await supabase
            .from("notes")
            .select("file_url")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !noteData) {
            return NextResponse.json({ error: "Note not found or unauthorized to delete" }, { status: 404 });
        }

        // Try extracting filename from the file URL if it was stored in the "notes" bucket
        if (noteData.file_url) {
            try {
                const urlParts = noteData.file_url.split('/notes/');
                if (urlParts.length > 1) {
                    const fileName = urlParts[1];
                    await supabase.storage.from("notes").remove([fileName]);
                }
            } catch (e) {
                console.error("Failed to delete from storage, proceeding with DB deletion:", e);
            }
        }

        const { error: deleteError } = await supabase
            .from("notes")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // Also remove from recent activity
        await supabase
            .from("recent_activity")
            .delete()
            .eq("item_id", id)
            .eq("user_id", user.id);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("DELETE notes error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to delete note" }, { status: 500 });
    }
}
