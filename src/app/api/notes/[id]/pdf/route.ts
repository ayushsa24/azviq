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

        // --- Subscription PDF Size Limit Check ---
        const { getSubscriptionStatus, checkPdfSizeAccess } = await import("@/lib/subscription");
        const subStatus = await getSubscriptionStatus(session.user.email);
        const sizeCheck = checkPdfSizeAccess(file.size, subStatus.tier);
        
        if (!sizeCheck.allowed) {
            return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
        }

        // Generate a new clean filename to bust caches
        const fileExt = "pdf";
        const fileName = `${user.id}/${Date.now()}_annotated.${fileExt}`;

        // Upload new file directly overriding if needed
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

        // Update Note record with new file_url
        const { data: updatedNote, error: updateError } = await supabase
            .from("notes")
            .update({ file_url: urlData.publicUrl })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ note: updatedNote });
    } catch (error: unknown) {
        console.error("PDF upload error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to update PDF" }, { status: 500 });
    }
}
