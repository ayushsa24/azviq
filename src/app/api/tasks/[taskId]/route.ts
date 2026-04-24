import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
    req: Request,
    context: { params: Record<string, string> }
) {
    const params = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        const body = await req.json();
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        const allowedFields = [
            "title",
            "project_id",
            "status",
            "start_date",
            "due_date",
            "linked_document_id",
            "linked_document_type",
            "description",
            "is_pinned",
            "is_favorite",
        ];

        allowedFields.forEach((field) => {
            if (body[field] !== undefined) {
                // Support nullifying fields like due_date
                updateData[field] = body[field];
            }
        });

        const { data: task, error } = await supabase
            .from("tasks")
            .update(updateData)
            .eq("id", params.taskId)
            .eq("user_id", userId) // Ensure the user owns this task
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ task });
    } catch (error) {
        console.error("PUT task error:", error);
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    context: { params: Record<string, string> }
) {
    const params = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", params.taskId)
            .eq("user_id", userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE task error:", error);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
