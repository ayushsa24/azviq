import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public API — no auth required. Returns a note only if share_mode is 'view' or 'edit'.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // First fetch the note by ID regardless of share_mode
        const { data: note, error } = await supabase
            .from("notes")
            .select("id, title, content, created_at, share_mode")
            .eq("id", id)
            .single();

        if (error || !note) {
            console.error("[share/note] Note not found:", id, error);
            return NextResponse.json({ error: "Note not found." }, { status: 404 });
        }

        // Then check the share_mode
        if (note.share_mode === "private" || !note.share_mode) {
            console.log("[share/note] Note is private, share_mode:", note.share_mode);
            return NextResponse.json({ error: "Note is private." }, { status: 404 });
        }

        return NextResponse.json({ note });
    } catch (error: unknown) {
        console.error("[share/note] Unexpected error:", error);
        return NextResponse.json({ error: "Failed to fetch shared note." }, { status: 500 });
    }
}

// Public PATCH — only works if share_mode = 'edit'
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify the note allows editing before accepting changes
        const { data: existing } = await supabase
            .from("notes")
            .select("share_mode")
            .eq("id", id)
            .single();

        if (!existing || existing.share_mode !== "edit") {
            return NextResponse.json({ error: "This note does not allow public editing." }, { status: 403 });
        }

        const body = await req.json();
        const updateData: Record<string, unknown> = {};
        if (body.title !== undefined) updateData.title = body.title;
        if (body.content !== undefined) updateData.content = body.content;

        const { data: note, error } = await supabase
            .from("notes")
            .update(updateData)
            .eq("id", id)
            .select("id, title, content, share_mode")
            .single();

        if (error) throw error;
        return NextResponse.json({ note });
    } catch (error: unknown) {
        return NextResponse.json({ error: "Failed to save note." }, { status: 500 });
    }
}

