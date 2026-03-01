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

        const updateData: any = {};

        const allowedFields = [
            "title",
            "color_theme",
            "description",
            "status",
            "start_date",
            "due_date",
            "is_pinned",
            "is_favorite",
        ];

        allowedFields.forEach((field) => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        const { data: project, error } = await supabase
            .from("projects")
            .update(updateData)
            .eq("id", params.projectId)
            .eq("user_id", user.id) // Security check to ensure user owns the project
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ project });
    } catch (error) {
        console.error("PUT project error:", error);
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
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

        // Rely on RLS and user_id check to authorize
        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", params.projectId)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE project error:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
