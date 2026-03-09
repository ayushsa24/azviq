import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
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
        const suggestions: any[] = [];
        const todayString = new Date().toISOString().split('T')[0];
        const todayDate = new Date(todayString);

        // 1. Check Daily Study Target
        const { data: dailySummary } = await supabase
            .from('daily_study_summary')
            .select('total_minutes')
            .eq('user_id', userId)
            .eq('study_date', todayString)
            .single();

        const totalMinutes = dailySummary?.total_minutes || 0;
        if (totalMinutes < 30) {
            suggestions.push({
                id: crypto.randomUUID(),
                suggestion_type: "short_study",
                title: "Quick Study Session",
                description: `You studied only ${totalMinutes} minutes today.`,
                action_type: "/library",
                action_label: "Start Study"
            });
        }

        // 2. Check Weak Topics
        const { data: exercises } = await supabase
            .from('exercises')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'Completed')
            .not('score', 'is', null);

        if (exercises && exercises.length > 0) {
            // Sort to find the lowest scoring exercises first
            exercises.sort((a: any, b: any) => (a.score ?? 100) - (b.score ?? 100));

            const weakExercises = exercises.filter((ex: any) => (ex.score ?? 100) < 60);

            if (weakExercises.length > 0) {
                const multiple_actions = weakExercises.slice(0, 3).map((ex: any) => ({
                    action_type: `/preparation?tab=exercise&id=${ex.id}`,
                    action_label: ex.title || "Practice"
                }));

                suggestions.push({
                    id: crypto.randomUUID(),
                    suggestion_type: "weak_topic",
                    title: "Weak Topics Detected",
                    description: `You have ${weakExercises.length} exercise(s) with an accuracy below 60%. Retrying them will help your understanding.`,
                    related_subject: "Exercise",
                    related_topic: "Multiple",
                    action_type: multiple_actions[0].action_type,
                    action_label: multiple_actions[0].action_label,
                    multiple_actions: multiple_actions
                });
            }
        }

        // 3. Check Revision Schedule
        const { data: schedules } = await supabase
            .from('revision_schedule')
            .select('*')
            .eq('user_id', userId);

        if (schedules && schedules.length > 0) {
            schedules.forEach((s: any) => {
                if (!s.next_revision_date) return;
                const nextDate = new Date(s.next_revision_date);
                const studiedDate = new Date(s.last_studied_date);
                const diffTime = Math.abs(todayDate.getTime() - studiedDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (s.next_revision_date === todayString) {
                    suggestions.push({
                        id: crypto.randomUUID(),
                        suggestion_type: "spaced_revision",
                        title: "Revision Recommended",
                        description: `You studied ${s.topic} ${diffDays} days ago.`,
                        related_subject: s.subject,
                        related_topic: s.topic,
                        action_type: "/preparation",
                        action_label: "Start Revision"
                    });
                } else if (nextDate < todayDate) {
                    suggestions.push({
                        id: crypto.randomUUID(),
                        suggestion_type: "missed_revision",
                        title: "Missed Revision",
                        description: `You skipped your ${s.topic} revision yesterday.`,
                        related_subject: s.subject,
                        related_topic: s.topic,
                        action_type: "/preparation",
                        action_label: "Resume Revision"
                    });
                }
            });
        }

        // Prioritize and limit
        const priorityOrder: Record<string, number> = {
            "missed_revision": 1,
            "spaced_revision": 2,
            "weak_topic": 3,
            "short_study": 4
        };

        suggestions.sort((a, b) => priorityOrder[a.suggestion_type] - priorityOrder[b.suggestion_type]);
        const topSuggestions = suggestions.slice(0, 4);

        // Optionally persist to ai_suggestions table
        await supabase.from('ai_suggestions').delete().eq('user_id', userId);
        if (topSuggestions.length > 0) {
            const insertData = topSuggestions.map((s) => ({
                id: s.id,
                user_id: userId,
                suggestion_type: s.suggestion_type,
                title: s.title,
                description: s.description,
                related_subject: s.related_subject,
                related_topic: s.related_topic,
                action_type: s.action_type
            }));
            await supabase.from('ai_suggestions').insert(insertData);
        }

        return NextResponse.json({ suggestions: topSuggestions });
    } catch (error) {
        console.error("GET /api/suggestions error:", error);
        return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
    }
}
