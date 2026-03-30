import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
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

        const { data: workspaces, error } = await supabase
            .from("workspaces")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ workspaces });
    } catch (error: unknown) {
        console.error("Fetch workspaces error:", error);
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : String(error)) || "Failed to fetch workspaces" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { name, description } = await req.json();

        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Workspace name is required" },
                { status: 400 }
            );
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

        const { data: workspace, error } = await supabase
            .from("workspaces")
            .insert({
                user_id: user.id,
                name: name.trim(),
                description: description?.trim() || null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ workspace }, { status: 201 });
    } catch (error: unknown) {
        console.error("Create workspace error:", error);
        return NextResponse.json(
            { error: (error instanceof Error ? error.message : String(error)) || "Failed to create workspace" },
            { status: 500 }
        );
    }
}
