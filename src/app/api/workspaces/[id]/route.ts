import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

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

        if (body.name !== undefined) updateData.name = body.name;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;

        const { data: workspace, error } = await supabase
            .from("workspaces")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ workspace });
    } catch (error: unknown) {
        console.error("PATCH workspace error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to update workspace" }, { status: 500 });
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

        // 1. Fetch all notes inside this workspace to grab their file URLs
        const { data: notes, error: fetchError } = await supabase
            .from("notes")
            .select("file_url")
            .eq("workspace_id", id)
            .eq("user_id", user.id);

        if (!fetchError && notes && notes.length > 0) {
            // Extract the actual filename from the URL, assuming it's stored in the "notes" bucket
            const filePathsToDelete = notes
                .map((n) => {
                    const parts = n.file_url.split('/notes/');
                    return parts.length > 1 ? parts[1] : null;
                })
                .filter(Boolean) as string[];

            if (filePathsToDelete.length > 0) {
                // Bulk delete from Supabase Storage
                const { error: storageError } = await supabase.storage
                    .from("notes")
                    .remove(filePathsToDelete);

                if (storageError) {
                    console.error("Failed to delete some files from storage:", storageError);
                    // Decide whether to fail the whole request or continue to DB delete. 
                    // Proceeding since DB CASCADE will happen anyway.
                }
            }
        }

        // 2. Delete the workspace. Because of ON DELETE CASCADE on notes.workspace_id,
        // the corresponding rows in "notes" will be automatically deleted by Postgres.
        const { error: deleteError } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("DELETE workspace error:", error);
        return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || "Failed to delete workspace" }, { status: 500 });
    }
}
