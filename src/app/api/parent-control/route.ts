import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function getUserId(email: string) {
    const { data } = await supabase.from("users").select("id").eq("email", email).single();
    return data?.id ?? null;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data, error } = await supabase
        .from("parent_control")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: data || [] });
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { family_email, daily_target_hours, restricted_mode, control_enabled, report_time } = body;

    // If this is an email add request
    if (family_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(family_email)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        // Check existing count
        const { count } = await supabase
            .from("parent_control")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if ((count ?? 0) >= 5) {
            return NextResponse.json({ error: "Maximum 5 family emails allowed" }, { status: 400 });
        }

        // Check duplicate
        const { data: existing } = await supabase
            .from("parent_control")
            .select("id")
            .eq("user_id", userId)
            .eq("family_email", family_email)
            .single();

        if (existing) {
            return NextResponse.json({ error: "Email already added" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("parent_control")
            .insert({ user_id: userId, family_email })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ entry: data });
    }

    // Otherwise it's a settings update (PATCH-style via POST for simplicity)
    const { error } = await supabase
        .from("parent_control")
        .update({ daily_target_hours, restricted_mode, control_enabled, report_time })
        .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
        .from("parent_control")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = await getUserId(session.user.email);
    if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { daily_target_hours, restricted_mode, control_enabled, report_time } = await req.json();

    // Upsert settings on all rows for this user (or we store settings separately)
    // We update all rows with the new settings
    const { error } = await supabase
        .from("parent_control")
        .update({ daily_target_hours, restricted_mode, control_enabled, report_time })
        .eq("user_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
