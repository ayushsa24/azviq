import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getUserByEmail(email: string) {
    const { data } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
    return data;
}

// GET — fetch all todos for the user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getUserByEmail(session.user.email);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { data: todos, error } = await supabase
            .from("todos")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ todos });
    } catch (err) {
        console.error("GET /api/todos error:", err);
        return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
    }
}

// POST — create a new todo
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getUserByEmail(session.user.email);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const { title, note, time, repeat, custom_days } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const { data: todo, error } = await supabase
            .from("todos")
            .insert({
                user_id: user.id,
                title: title.trim(),
                note: note || null,
                time: time || null,
                repeat: repeat || "today",
                custom_days: custom_days || [],
                done: false,
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ todo }, { status: 201 });
    } catch (err) {
        console.error("POST /api/todos error:", err);
        return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
    }
}
