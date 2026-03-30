import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .maybeSingle();

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
        console.error("GET projects error:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .maybeSingle();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { title, color_theme } = await req.json();

        if (!title?.trim() || title.trim().length > 200) {
            return NextResponse.json({ error: "Title is required and must be under 200 characters" }, { status: 400 });
        }

        const { data: project, error } = await supabase
            .from("projects")
            .insert({
                user_id: user.id,
                title,
                color_theme: color_theme || "blue",
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ project });
    } catch (error) {
        console.error("POST projects error:", error);
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}
