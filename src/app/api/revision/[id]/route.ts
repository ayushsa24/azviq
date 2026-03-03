import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { data: revision, error } = await supabase
            .from("revisions")
            .select("*, notes(title)")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !revision)
            return NextResponse.json({ error: "Revision not found" }, { status: 404 });

        return NextResponse.json({ revision });
    } catch (error) {
        console.error("GET revision error:", error);
        return NextResponse.json({ error: "Failed to fetch revision" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { error } = await supabase
            .from("revisions")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE revision error:", error);
        return NextResponse.json({ error: "Failed to delete revision" }, { status: 500 });
    }
}
