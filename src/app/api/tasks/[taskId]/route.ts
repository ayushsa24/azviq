import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
    req: Request,
    context: any
) {
    const params = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const updateData: any = { updated_at: new Date().toISOString() };

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
            .eq("user_id", user.id) // Ensure the user owns this task
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
    context: any
) {
    const params = await context.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { error } = await supabase
            .from("tasks")
            .delete()
            .eq("id", params.taskId)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE task error:", error);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
