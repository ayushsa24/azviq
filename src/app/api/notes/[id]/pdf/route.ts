import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
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

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as Blob;

        if (!file) {
            return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
        }

        // 1. Verify note exists and belongs to user BEFORE uploading to storage
        const { data: existingNote, error: noteError } = await supabase
            .from("notes")
            .select("id")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (noteError || !existingNote) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
        }

        // 2. Generate a new clean filename to bust caches
        const fileExt = "pdf";
        const fileName = `${user.id}/${Date.now()}_annotated.${fileExt}`;

        // 3. Upload new file directly overriding if needed
        const { error: uploadError } = await supabase.storage
            .from("notes")
            .upload(fileName, file, {
                contentType: file.type || "application/pdf",
                upsert: true,
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw uploadError;
        }

        const { data: urlData } = supabase.storage
            .from("notes")
            .getPublicUrl(fileName);

        // 4. Update Note record with new file_url
        const { data: updatedNote, error: updateError } = await supabase
            .from("notes")
            .update({ file_url: urlData.publicUrl })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            // Cleanup orphaned file if DB update fails
            await supabase.storage.from("notes").remove([fileName]);
            throw updateError;
        }

        return NextResponse.json({ note: updatedNote });
    } catch (error: unknown) {
        console.error("PDF upload error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to update PDF" }, { status: 500 });
    }
}
