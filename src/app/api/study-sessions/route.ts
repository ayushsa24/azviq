import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getSupabase() {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabase();
        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { activity_type, subject, topic, duration_minutes, start_time, end_time } = await req.json();

        if (!activity_type) {
            return NextResponse.json({ error: "activity_type is required" }, { status: 400 });
        }

        const { data: session_record, error } = await supabase
            .from("study_sessions")
            .insert({
                user_id: user.id,
                activity_type,
                subject: subject || null,
                topic: topic || null,
                duration_minutes: duration_minutes || null,
                start_time: start_time || new Date().toISOString(),
                end_time: end_time || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Update or insert user_stats streak
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: stats } = await supabase
            .from("user_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!stats) {
            await supabase.from("user_stats").insert({
                user_id: user.id,
                current_streak: 1,
                longest_streak: 1,
                last_active_date: todayStr,
            });
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            if (stats.last_active_date === todayStr) {
                // Already studied today — no change needed
            } else if (stats.last_active_date === yesterdayStr) {
                // Consecutive day — increment streak
                const newStreak = stats.current_streak + 1;
                await supabase.from("user_stats").update({
                    current_streak: newStreak,
                    longest_streak: Math.max(newStreak, stats.longest_streak),
                    last_active_date: todayStr,
                    updated_at: new Date().toISOString(),
                }).eq("user_id", user.id);
            } else {
                // Streak broken — reset
                await supabase.from("user_stats").update({
                    current_streak: 1,
                    last_active_date: todayStr,
                    updated_at: new Date().toISOString(),
                }).eq("user_id", user.id);
            }
        }

        return NextResponse.json({ session: session_record }, { status: 201 });
    } catch (err) {
        console.error("POST study-sessions error:", err);
        return NextResponse.json({ error: "Failed to record study session" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabase();
        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get("limit") ?? "20");

        const { data: sessions, error } = await supabase
            .from("study_sessions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return NextResponse.json({ sessions });
    } catch (err) {
        console.error("GET study-sessions error:", err);
        return NextResponse.json({ error: "Failed to fetch study sessions" }, { status: 500 });
    }
}
