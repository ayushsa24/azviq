import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/share/note/[id] — public, no auth required
export async function GET(req: Request, { params }: { params: any }) {
    try {
        const id = (await params).id;

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: note, error } = await supabase
            .from("notes")
            .select("id, title, content, created_at, share_mode")
            .eq("id", id)
            .single();

        if (error || !note) {
            return NextResponse.json({ error: "Note not found." }, { status: 404 });
        }

        if (note.share_mode === "private" || !note.share_mode) {
            return NextResponse.json({ error: "Note is private." }, { status: 404 });
        }

        return NextResponse.json({ note });
    } catch (err: unknown) {
        return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
    }
}

// DELETE /api/share/note/[id] — revoke a shared note
export async function DELETE(req: Request, { params }: { params: any }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const id = (await params).id;

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verify ownership
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // Revoke by setting to private
        const { error } = await supabase
            .from("notes")
            .update({ share_mode: "private" })
            .eq("id", id)
            .eq("user_id", dbUser.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Failed to revoke share." }, { status: 500 });
    }
}

// PATCH /api/share/note/[id] — public edit
export async function PATCH(req: Request, { params }: { params: any }) {
    try {
        const id = (await params).id;
        const body = await req.json();

        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: existing } = await supabase
            .from("notes")
            .select("share_mode")
            .eq("id", id)
            .single();

        if (!existing || existing.share_mode !== "edit") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const updateData: any = {};
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
    } catch (err) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
