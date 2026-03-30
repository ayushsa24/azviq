import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getUserByEmail(email: string) {
    const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
    if (error) throw error;
    return data;
}

// GET — fetch all projects for authenticated user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { data: projects, error } = await supabase
            .from("projects")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json({ projects });
    } catch (error) {
        console.error("GET /api/projects error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

// POST — create a new project
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getUserByEmail(session.user.email);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, color_theme } = body;

        if (!title?.trim() || title.trim().length > 200) {
            return NextResponse.json(
                { error: "Title is required and must be under 200 characters" },
                { status: 400 }
            );
        }

        const { data: project, error } = await supabase
            .from("projects")
            .insert({
                user_id: user.id,
                title: title.trim(),
                color_theme: color_theme || "blue",
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error("POST /api/projects error:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}
