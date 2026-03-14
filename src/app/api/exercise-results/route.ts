import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function getSupabase() {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Helper: compute next revision date based on stage
function getNextRevisionDate(stage: number): string {
    const days = [1, 3, 7, 15, 30];
    const daysToAdd = days[Math.min(stage - 1, days.length - 1)] || 30;
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString().split("T")[0];
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = getSupabase();
        const { data: user } = await supabase
            .from("users").select("id").eq("email", session.user.email).single();
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { exercise_id, subject, topic, total_questions, correct_answers } = await req.json();

        if (!total_questions || total_questions === 0) {
            return NextResponse.json({ error: "total_questions required" }, { status: 400 });
        }

        const accuracy_percent = ((correct_answers ?? 0) / total_questions) * 100;

        const { data: result, error } = await supabase
            .from("exercise_results")
            .insert({
                user_id: user.id,
                exercise_id: exercise_id || null,
                subject: subject || null,
                topic: topic || null,
                total_questions,
                correct_answers: correct_answers ?? 0,
                accuracy_percent: parseFloat(accuracy_percent.toFixed(2)),
            })
            .select()
            .single();

        if (error) throw error;

        // Also update revision schedule for this topic if accuracy >= 60%
        if (subject && topic && accuracy_percent >= 60) {
            const todayStr = new Date().toISOString().split("T")[0];

            const { data: existing } = await supabase
                .from("revision_schedule")
                .select("*")
                .eq("user_id", user.id)
                .eq("subject", subject)
                .eq("topic", topic)
                .single();

            if (!existing) {
                // First time — create stage 1 revision
                await supabase.from("revision_schedule").insert({
                    user_id: user.id,
                    subject,
                    topic,
                    last_studied_date: todayStr,
                    next_revision_date: getNextRevisionDate(1),
                    revision_stage: 1,
                });
            } else {
                // Advance to next stage
                const nextStage = Math.min(existing.revision_stage + 1, 5);
                await supabase.from("revision_schedule").update({
                    last_studied_date: todayStr,
                    next_revision_date: getNextRevisionDate(nextStage),
                    revision_stage: nextStage,
                }).eq("id", existing.id);
            }
        }

        return NextResponse.json({ result }, { status: 201 });
    } catch (err) {
        console.error("POST exercise-results error:", err);
        return NextResponse.json({ error: "Failed to record exercise result" }, { status: 500 });
    }
}
