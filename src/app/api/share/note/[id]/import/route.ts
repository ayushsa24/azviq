import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

        // 1. Get the current user
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 2. Fetch the shared note
        const { data: sharedNote, error: noteError } = await supabase
            .from("notes")
            .select("*")
            .eq("id", id)
            .single();

        if (noteError || !sharedNote) {
            return NextResponse.json({ error: "Shared note not found" }, { status: 404 });
        }

        // 3. Create the clone with a link to the original to enable collaborative permission sync
        const { data: newNote, error: insertError } = await supabase
            .from("notes")
            .insert({
                user_id: user.id,
                original_note_id: id,
                title: `Imported: ${sharedNote.title}`,
                content: sharedNote.content,
                share_mode: "private",
                is_public: false
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ success: true, noteId: newNote.id });
    } catch (err: unknown) {
        console.error("Import note error:", err);
        return NextResponse.json({ error: "Failed to import note" }, { status: 500 });
    }
}
