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

        // 1. Verify ownership of the note
        const { data: note, error: noteError } = await supabase
            .from("notes")
            .select("user_id")
            .eq("id", id)
            .single();

        if (noteError || !note) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        if (note.user_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Find all notes that cloned this note
        const { data: clonedNotes, error: impError } = await supabase
            .from("notes")
            .select("user_id, created_at")
            .eq("original_note_id", id)
            .neq("user_id", user.id); // Exclude the owner
        
        if (impError) {
            console.error("[Note Importers API] Note fetch error:", impError);
        }

        let importers: any[] = [];
        if (clonedNotes && clonedNotes.length > 0) {
            // 3. Extract unique user IDs and map their import times
            const importTimeMap: Record<string, string> = {};
            clonedNotes.forEach(n => {
                if (!importTimeMap[n.user_id]) {
                    importTimeMap[n.user_id] = n.created_at;
                }
            });

            const uniqueUserIds = Object.keys(importTimeMap);
            
            // 4. Fetch the user profiles
            const { data: userProfiles, error: userError } = await supabase
                .from("users")
                .select("id, name, email, avatar_url")
                .in("id", uniqueUserIds);
                
            if (userError) {
                console.error("[Note Importers API] User fetch error:", userError);
            }

            // 5. Map the profiles with their corresponding import time
            importers = userProfiles?.map((profile: any) => ({
                id: profile.id,
                name: profile.name || profile.email || "Anonymous Importer",
                email: profile.email || "No Email Provided",
                image: profile.avatar_url || null,
                importedAt: importTimeMap[profile.id]
            })) || [];
        }

        return NextResponse.json({ importers });
    } catch (error: unknown) {
        console.error("[Note Importers API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
