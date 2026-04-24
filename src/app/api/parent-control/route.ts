import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;

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
    const userId = (session.user as { id: string }).id;

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
            .insert({ 
                user_id: userId, 
                family_email,
                daily_target_hours: daily_target_hours !== undefined ? daily_target_hours : null,
                restricted_mode: restricted_mode !== undefined ? restricted_mode : true,
                control_enabled: control_enabled !== undefined ? control_enabled : false,
                report_time: report_time !== undefined ? report_time : "20:00"
            })
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
    const userId = (session.user as { id: string }).id;

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
    const userId = (session.user as { id: string }).id;

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
