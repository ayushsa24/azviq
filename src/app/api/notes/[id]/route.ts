import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession();
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
        const session = await getServerSession();
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
        try {
            const urlParts = noteData.file_url.split('/notes/');
            if (urlParts.length > 1) {
                const fileName = urlParts[1];
                await supabase.storage.from("notes").remove([fileName]);
            }
        } catch (e) {
            console.error("Failed to delete from storage, proceeding with DB deletion:", e);
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
