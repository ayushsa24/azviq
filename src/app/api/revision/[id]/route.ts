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

        const userId = (session.user as { id: string }).id;

        const { data: revision, error } = await supabase
            .from("revisions")
            .select("*, notes(title)")
            .eq("id", id)
            .eq("user_id", userId)
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

        const userId = (session.user as { id: string }).id;

        const { error } = await supabase
            .from("revisions")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) throw error;

        // Also remove from recent activity
        await supabase
            .from("recent_activity")
            .delete()
            .eq("item_id", id)
            .eq("user_id", userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE revision error:", error);
        return NextResponse.json({ error: "Failed to delete revision" }, { status: 500 });
    }
}
