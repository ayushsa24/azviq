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

        const { data: note, error } = await supabase
            .from("notes")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        return NextResponse.json({ note });
    } catch (error: any) {
        console.error("GET note error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch note" }, { status: 500 });
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
        const updateData: any = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.workspace_id !== undefined) updateData.workspace_id = body.workspace_id;
        if (body.is_favourite !== undefined) updateData.is_favourite = body.is_favourite;
        if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;
        if (body.is_pinned_in_favourites !== undefined) updateData.is_pinned_in_favourites = body.is_pinned_in_favourites;
        if (body.content !== undefined) updateData.content = body.content;

        // Spaced repetition fields
        if (body.retention_score !== undefined) updateData.retention_score = body.retention_score;
        if (body.last_reviewed_at !== undefined) updateData.last_reviewed_at = body.last_reviewed_at;
        if (body.next_review_at !== undefined) updateData.next_review_at = body.next_review_at;

        const { data: note, error } = await supabase
            .from("notes")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ note });
    } catch (error: any) {
        console.error("PATCH notes error:", error);
        return NextResponse.json({ error: error.message || "Failed to update note" }, { status: 500 });
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE notes error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete note" }, { status: 500 });
    }
}
