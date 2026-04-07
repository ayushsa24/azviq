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

        const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, '');
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, '');

        const supabase = createClient(supabaseUrl, supabaseKey);

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

        // 3. Create the clone with a link to the original to enable collaborative sync
        const originalTitle = sharedNote.title || "Untitled Note";
        const cleanTitle = originalTitle.startsWith("Imported: ") 
            ? originalTitle 
            : `Imported: ${originalTitle}`;

        const { data: newNote, error: insertError } = await supabase
            .from("notes")
            .insert({
                user_id: user.id,
                title: cleanTitle,
                content: sharedNote.content,
                original_note_id: id, // Use the ID from the URL path
                share_mode: "private" // Clones are private by default
            })
            .select()
            .single();

        if (insertError) {
            console.error("Import insert error:", insertError);
            return NextResponse.json({ error: "Failed to create note clone" }, { status: 500 });
        }

        return NextResponse.json({ success: true, noteId: newNote.id });
    } catch (err: unknown) {
        console.error("Import note error:", err);
        return NextResponse.json({ error: "Failed to import note" }, { status: 500 });
    }
}
