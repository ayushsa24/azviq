import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getUser(email: string) {
    const { data } = await supabase.from("users").select("id").eq("email", email).single();
    return data;
}

// PATCH — update a todo (toggle done, edit fields)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await getUser(session.user.email);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const updates: Record<string, unknown> = {};

        if (body.title !== undefined) updates.title = body.title;
        if (body.note !== undefined) updates.note = body.note || null;
        if (body.time !== undefined) updates.time = body.time || null;
        if (body.repeat !== undefined) updates.repeat = body.repeat;
        if (body.custom_days !== undefined) updates.custom_days = body.custom_days;
        if (body.done !== undefined) updates.done = body.done;

        const { data: todo, error } = await supabase
            .from("todos")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ todo });
    } catch (err) {
        console.error("PATCH todo error:", err);
        return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
    }
}

// DELETE — remove a todo
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await getUser(session.user.email);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE todo error:", err);
        return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
    }
}
