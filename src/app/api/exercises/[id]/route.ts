import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/db";

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

        const { data: exercise, error } = await supabase
            .from("exercises")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !exercise)
            return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

        return NextResponse.json({ exercise });
    } catch (error) {
        console.error("GET exercise error:", error);
        return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { status, score, time_taken, questions } = body;

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only update allowed fields
        const updates: Record<string, unknown> = {};
        if (status !== undefined) updates.status = status;
        if (score !== undefined) updates.score = score;
        if (time_taken !== undefined) updates.time_taken = time_taken;
        if (questions !== undefined) updates.questions = questions;
        updates.updated_at = new Date().toISOString();

        let { error: updateError } = await supabase
            .from("exercises")
            .update(updates)
            .eq("id", resolvedParams.id)
            .eq("user_id", user.id);

        // If time_taken column doesn't exist yet, retry without it (column still needs migration)
        if (updateError && (updateError as { code?: string }).code === "42703" && updates.time_taken !== undefined) {
            console.warn("time_taken column missing — retrying without it. Run: ALTER TABLE exercises ADD COLUMN time_taken integer;");
            const updatesWithout = { ...updates };
            delete updatesWithout.time_taken;
            const { error: retryError } = await supabase
                .from("exercises")
                .update(updatesWithout)
                .eq("id", resolvedParams.id)
                .eq("user_id", user.id);
            updateError = retryError;
        }

        if (updateError) {
            throw updateError;
        }



        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH exercise error:", error);
        return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { data: deleteData, error: deleteError } = await supabase
            .from("exercises")
            .delete()
            .eq("id", resolvedParams.id)
            .eq("user_id", user.id)
            .select();

        if (deleteError) {
            throw deleteError;
        }

        if (!deleteData || deleteData.length === 0) {
            return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
        }

        // Also remove from recent activity
        await supabase
            .from("recent_activity")
            .delete()
            .eq("item_id", resolvedParams.id)
            .eq("user_id", user.id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE exercise error:", error);
        return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
    }
}
