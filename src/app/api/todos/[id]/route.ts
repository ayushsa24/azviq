import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scheduleTodoNotification, cancelTodoNotification } from "@/lib/scheduler";

/**
 * Converts a "HH:MM" time string (user's local time for today) into
 * a full ISO UTC string for scheduling.
 */
function buildReminderISO(timeStr: string): string | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    // If the time already passed today, don't schedule
    if (d.getTime() <= Date.now()) return null;
    return d.toISOString();
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

        const userId = (session.user as { id: string }).id;

        const body = await req.json();
        const updates: Record<string, unknown> = {};

        if (body.title !== undefined) updates.title = body.title;
        if (body.note !== undefined) updates.note = body.note || null;
        if (body.time !== undefined) updates.time = body.time || null;
        if (body.repeat !== undefined) updates.repeat = body.repeat;
        if (body.custom_days !== undefined) updates.custom_days = body.custom_days;
        if (body.done !== undefined) updates.done = body.done;
        if (body.linked_document_id !== undefined) updates.linked_document_id = body.linked_document_id || null;
        if (body.linked_document_type !== undefined) updates.linked_document_type = body.linked_document_type || null;

        // Cancel previous notification if time is being changed/removed
        if (body.time !== undefined) {
            const { data: existing } = await supabase
                .from("todos")
                .select("workflow_run_id")
                .eq("id", id)
                .maybeSingle();

            if (existing?.workflow_run_id) {
                await cancelTodoNotification(existing.workflow_run_id);
                updates.workflow_run_id = null;
            }

            // Schedule a new notification if a new time was provided
            if (body.time) {
                const reminderISO = buildReminderISO(body.time);
                if (reminderISO) {
                    const todoTitle = body.title || "Your Todo";
                    const runId = await scheduleTodoNotification({
                        todoId: id,
                        userId,
                        title: todoTitle,
                        note: body.note,
                        reminderTime: reminderISO,
                    });
                    if (runId) updates.workflow_run_id = runId;
                }
            }
        }

        const { data: todo, error } = await supabase
            .from("todos")
            .update(updates)
            .eq("id", id)
            .eq("user_id", userId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ todo });
    } catch (err) {
        console.error("PATCH todo error:", err);
        return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
    }
}

// DELETE — remove a todo (also cancel its scheduled notification)
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session.user as { id: string }).id;

        // Cancel scheduled notification before deleting
        const { data: todo } = await supabase
            .from("todos")
            .select("workflow_run_id")
            .eq("id", id)
            .maybeSingle();

        if (todo?.workflow_run_id) {
            await cancelTodoNotification(todo.workflow_run_id);
        }

        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("DELETE todo error:", err);
        return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
    }
}
