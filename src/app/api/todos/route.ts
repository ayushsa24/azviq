import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scheduleTodoNotification } from "@/lib/scheduler";

// GET — fetch all todos for the user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session.user as { id: string }).id;

        const { data: todos, error } = await supabase
            .from("todos")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ todos });
    } catch (err) {
        console.error("GET todos error:", err);
        return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
    }
}

// POST — create a new todo
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const userId = (session.user as { id: string }).id;

        const body = await req.json();
        const { title, note, time, repeat, custom_days, linked_document_id, linked_document_type } = body;

        if (!title?.trim())
            return NextResponse.json({ error: "Title is required" }, { status: 400 });

        const { data: todo, error } = await supabase
            .from("todos")
            .insert({
                user_id: userId,
                title: title.trim(),
                note: note || null,
                time: time || null,
                repeat: repeat || "today",
                custom_days: custom_days || [],
                done: false,
                linked_document_id: linked_document_id || null,
                linked_document_type: linked_document_type || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Schedule a push notification if a time was set
        if (todo && time) {
            const [hours, minutes] = time.split(":").map(Number);
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            if (d.getTime() > Date.now()) {
                const runId = await scheduleTodoNotification({
                    todoId: todo.id,
                    userId,
                    title: title.trim(),
                    note: note || undefined,
                    reminderTime: d.toISOString(),
                });
                if (runId) {
                    await supabase.from("todos").update({ workflow_run_id: runId }).eq("id", todo.id);
                    todo.workflow_run_id = runId;
                }
            }
        }

        return NextResponse.json({ todo }, { status: 201 });
    } catch (err) {
        console.error("POST todos error:", err);
        return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
    }
}
