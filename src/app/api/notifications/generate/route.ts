import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";

interface WeakTopicStat {
    id: string;
    subject: string;
    topic: string;
    created_at: string;
    total_questions: number;
    correct_answers: number;
    accuracy: number;
    identifier: string;
}

function getSupabase() {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Helper: get today's date string in 'YYYY-MM-DD'
function today() {
    return new Date().toISOString().split("T")[0];
}

// Helper: check if a notification of given type already exists for this user recently (last 24h)
async function notifExistsRecently(supabase: SupabaseClient, userId: string, type: string, relatedTopic?: string) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let query = supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", type)
        .gte("created_at", twentyFourHoursAgo.toISOString());

    if (relatedTopic) {
        query = query.eq("related_topic", relatedTopic);
    }

    const { data } = await query.limit(1);
    return (data?.length ?? 0) > 0;
}

// Helper: insert a notification
async function createNotif(supabase: SupabaseClient, userId: string, payload: {
    type: string; title: string; message: string;
    related_subject?: string; related_topic?: string;
}) {
    // Only insert if it doesn't already exist to prevent duplicates within the same run or across runs
    const exists = await notifExistsRecently(supabase, userId, payload.type, payload.related_topic);
    if (!exists) {
        await supabase.from("notifications").insert({ user_id: userId, ...payload });
        return true;
    }
    return false;
}

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return apiError("Unauthorized", 401, "UNAUTHORIZED");

        const supabase = getSupabase();
        const userId = (session.user as { id: string }).id;
        const todayStr = today();
        const generated: string[] = [];

        // ─────────────────────────────────────────────────────────────
        // 1. DAILY STUDY REMINDER
        // ─────────────────────────────────────────────────────────────
        const { data: todaySummary } = await supabase
            .from("daily_study_summary")
            .select("total_minutes")
            .eq("user_id", userId)
            .eq("study_date", todayStr)
            .single();

        const totalMinutesToday = todaySummary?.total_minutes ?? 0;

        if (totalMinutesToday < 60) {
            if (await createNotif(supabase, userId, {
                type: "study_reminder",
                title: "Time to Study",
                message: "Study 60+ min today to keep your streak.",
            })) {
                generated.push("study_reminder");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 2. TASK REMINDERS (due strictly today, not done)
        const { data: todayTasks } = await supabase
            .from("tasks")
            .select("id, title, due_date")
            .eq("user_id", userId)
            .not("status", "eq", "done")
            .not("status", "eq", "archived")
            .gte("due_date", todayStr + "T00:00:00Z")
            .lte("due_date", todayStr + "T23:59:59Z");

        for (const task of (todayTasks ?? [])) {
            const dueDate = new Date(task.due_date).toLocaleDateString("en-IN", {
                dateStyle: "medium",
            });

            if (await createNotif(supabase, userId, {
                type: "task_reminder",
                title: `Task Due: ${task.title}`,
                message: `Due ${dueDate}`,
                related_topic: task.id,
            })) {
                generated.push("task_reminder");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 3. WEAK SUBJECT DETECTION (Randomized 2-4 days delay, ONCE ever)
        // ─────────────────────────────────────────────────────────────
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentLowScores } = await supabase
            .from("exercise_results")
            .select("id, subject, topic, created_at, total_questions, correct_answers")
            .eq("user_id", userId)
            .gte("created_at", fiveDaysAgo);

        const weakTopics = new Map<string, WeakTopicStat>();

        for (const res of (recentLowScores ?? [])) {
            const accuracy = ((res.correct_answers || 0) / (res.total_questions || 1)) * 100;
            if (accuracy < 60) {
                // Use search prefix to handle dynamic topics seamlessly
                const identifier = `search:${res.topic}`;

                // Track oldest low score within the window to guarantee trigger on day 3
                if (!weakTopics.has(identifier) || new Date(res.created_at as string) < new Date((weakTopics.get(identifier) as WeakTopicStat).created_at)) {
                    weakTopics.set(identifier, { ...res, accuracy, identifier } as WeakTopicStat);
                }
            }
        }

        for (const [identifier, stats] of Array.from(weakTopics.entries())) {
            // Ensure we ONLY notify ONCE for a given topic
            const { data: pastNotif } = await supabase
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", "weak_subject")
                .eq("related_topic", identifier)
                .limit(1);

            if ((pastNotif?.length ?? 0) > 0) continue;

            // Calculate days elapsed (0 to 5+)
            const daysSince = Math.floor((Date.now() - new Date(stats.created_at).getTime()) / (1000 * 60 * 60 * 24));

            // Wait at least 2 full days before notifying
            if (daysSince < 2) continue;

            // Random chance to notify. Guarantees notification by day 4.
            const shouldNotify = daysSince >= 4 || Math.random() < 0.4; // 40% chance per day after day 2

            if (shouldNotify) {
                if (await createNotif(supabase, userId, {
                    type: "weak_subject",
                    title: `Weak Topic: ${stats.topic}`,
                    message: `You scored ${stats.accuracy.toFixed(0)}% in ${stats.topic}. Time to review!`,
                    related_subject: stats.subject,
                    related_topic: identifier,
                })) {
                    generated.push("weak_subject");
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 4. REVISION DUE (Notes/PDFs 7+ days old, randomized delay, ONCE ever)
        // ─────────────────────────────────────────────────────────────
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

        const { data: oldNotes } = await supabase
            .from("notes")
            .select("id, title, file_url, created_at, subject")
            .eq("user_id", userId)
            .lt("created_at", sevenDaysAgo)
            .gte("created_at", tenDaysAgo);

        for (const note of (oldNotes ?? [])) {
            const identifier = note.file_url ? `pdf:${note.id}` : `note:${note.id}`;

            // Ensure we ONLY notify ONCE for a given material
            const { data: pastNotif } = await supabase
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", "revision_reminder")
                .eq("related_topic", identifier)
                .limit(1);

            if ((pastNotif?.length ?? 0) > 0) continue;

            const daysSince = Math.floor((Date.now() - new Date(note.created_at).getTime()) / (1000 * 60 * 60 * 24));

            // Wait at least 7 full days before notifying
            if (daysSince < 7) continue;

            // Random chance to notify. Guarantees notification by day 9.
            const shouldNotify = daysSince >= 9 || Math.random() < 0.4; // 40% chance per day after day 7

            if (shouldNotify) {
                if (await createNotif(supabase, userId, {
                    type: "revision_reminder",
                    title: "Time to Revise!",
                    message: `It's been a week since you added ${note.title}. Time for a quick review.`,
                    related_subject: note.subject || "Library",
                    related_topic: identifier,
                })) {
                    generated.push("revision_reminder");
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 6. STREAK PROTECTION
        // ─────────────────────────────────────────────────────────────
        const { data: stats } = await supabase
            .from("user_stats")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (stats && stats.current_streak > 0 && stats.last_active_date !== todayStr) {
            if (await createNotif(supabase, userId, {
                type: "streak_protection",
                title: "Streak at Risk",
                message: `Keep your ${stats.current_streak}-day streak alive!`,
            })) {
                generated.push("streak_protection");
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 7. WEEKLY SUMMARY (every Monday)
        // ─────────────────────────────────────────────────────────────
        const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon
        if (dayOfWeek === 1) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const { data: weeklySessions } = await supabase
                .from("study_sessions")
                .select("duration_minutes")
                .eq("user_id", userId)
                .gte("start_time", weekAgo);

            const { data: weeklyTasks } = await supabase
                .from("tasks")
                .select("id")
                .eq("user_id", userId)
                .eq("status", "done")
                .gte("updated_at", weekAgo);

            const { data: weeklyExercises } = await supabase
                .from("exercise_results")
                .select("id")
                .eq("user_id", userId)
                .gte("created_at", weekAgo);

            const totalHours = ((weeklySessions ?? []).reduce(
                (sum: number, s: { duration_minutes?: number }) => sum + (s.duration_minutes ?? 0), 0
            ) / 60).toFixed(1);

            if (await createNotif(supabase, userId, {
                type: "weekly_summary",
                title: "Weekly Summary",
                message: `${totalHours}h studied, ${weeklyTasks?.length ?? 0} tasks done`,
            })) {
                generated.push("weekly_summary");
            }
        }

        return NextResponse.json({ success: true, generated });
    } catch (err: unknown) {
        console.error("Generate notifications error:", err);
        return apiError("Failed to generate notifications", 500, "INTERNAL_SERVER_ERROR");
    }
}
