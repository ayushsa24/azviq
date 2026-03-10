import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const { activity_type, start_time, end_time, duration_minutes, subject, topic } = await req.json();

        if (!activity_type || !start_time || !end_time || duration_minutes === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = user.id;

        // 1. Insert the session
        const { error: sessionError } = await supabase
            .from("study_sessions")
            .insert({
                user_id: userId,
                activity_type,
                start_time,
                end_time,
                duration_minutes
            });

        if (sessionError) {
            console.error("Error inserting study session:", sessionError);
            return NextResponse.json({ error: "Failed to log session", details: sessionError }, { status: 500 });
        }

        // 2. Update the daily summary
        const studyDate = new Date(start_time).toISOString().split('T')[0];

        // Use an RPC if available to increment safely, but for simplicity we can read then upsert.
        // It's safer to upsert. Let's fetch current to see if we need to add.
        const { data: existingSummary, error: fetchError } = await supabase
            .from("daily_study_summary")
            .select("*")
            .eq("user_id", userId)
            .eq("study_date", studyDate)
            .single();

        let newTotalMinutes = duration_minutes;
        let newActivityCount = 1;
        let newActivitiesSummary: Record<string, number> = { [activity_type]: duration_minutes };

        if (existingSummary && !fetchError) {
            newTotalMinutes += existingSummary.total_minutes || 0;
            newActivityCount += existingSummary.activity_count || 0;

            const existingActivities = existingSummary.activities_summary || {};
            newActivitiesSummary = { ...existingActivities };
            newActivitiesSummary[activity_type] = (newActivitiesSummary[activity_type] || 0) + duration_minutes;
        }

        const { error: upsertError } = await supabase
            .from("daily_study_summary")
            .upsert({
                user_id: userId,
                study_date: studyDate,
                total_minutes: newTotalMinutes,
                activity_count: newActivityCount,
                activities_summary: newActivitiesSummary
            }, {
                onConflict: "user_id,study_date"
            });

        if (upsertError) {
            console.error("Error updating daily summary:", upsertError);
            // We don't fail the request if summary fails, but we log it. Session is recorded.
        }

        // 3. Update revision schedule if subject and topic are provided
        if (subject && topic) {
            const { data: existingRevision } = await supabase
                .from("revision_schedule")
                .select("*")
                .eq("user_id", userId)
                .eq("subject", subject)
                .eq("topic", topic)
                .single();

            const intervals = [1, 3, 7, 15, 30];
            let newStage = 1;

            if (existingRevision) {
                // If the user is studying it on or after the next_revision_date, progress the stage
                const today = new Date(studyDate);
                const nextRevision = new Date(existingRevision.next_revision_date);

                if (today >= nextRevision) {
                    newStage = Math.min(existingRevision.revision_stage + 1, intervals.length);
                } else {
                    newStage = existingRevision.revision_stage; // Keep same stage if studying early
                }
            }

            const daysToAdd = intervals[newStage - 1] || 30; // default to 30 if maxed out
            const nextRevDate = new Date(studyDate);
            nextRevDate.setDate(nextRevDate.getDate() + daysToAdd);

            const { error: revError } = await supabase
                .from("revision_schedule")
                .upsert({
                    user_id: userId,
                    subject,
                    topic,
                    last_studied_date: studyDate,
                    next_revision_date: nextRevDate.toISOString().split('T')[0],
                    revision_stage: newStage
                }, {
                    onConflict: "user_id,subject,topic" // Needs unique constraint on these 3 columns to upsert like this
                });

            if (revError) {
                // Let's fallback to checking if it needs an insert or update since we might not have a UNIQUE constraint
                if (existingRevision) {
                    await supabase.from("revision_schedule").update({
                        last_studied_date: studyDate,
                        next_revision_date: nextRevDate.toISOString().split('T')[0],
                        revision_stage: newStage
                    }).eq("id", existingRevision.id);
                } else {
                    await supabase.from("revision_schedule").insert({
                        user_id: userId,
                        subject,
                        topic,
                        last_studied_date: studyDate,
                        next_revision_date: nextRevDate.toISOString().split('T')[0],
                        revision_stage: newStage
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in study session API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
