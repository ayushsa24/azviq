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
        if (totalMinutes < 60) {
            suggestions.push({
                id: `short-study-${todayString}`,
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
                    id: ex.id,
                    action_type: `/preparation?tab=exercise&id=${ex.id}`,
                    action_label: ex.title || "Practice"
                }));

                suggestions.push({
                    id: `weak-topics-${userId}`,
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

        // 3. Spaced Revision Recommendation (Notes/PDFs more than 7 days old)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: notes } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .lt('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true }) // Recommend oldest first
            .limit(2);

        if (notes && notes.length > 0) {
            const multiple_actions = notes.slice(0, 3).map((note: any) => ({
                id: note.id,
                action_type: `/library/${note.file_url ? "pdf" : "note"}/${note.id}`,
                action_label: note.title
            }));

            suggestions.push({
                id: `spaced-revision-${userId}`,
                suggestion_type: "spaced_revision",
                title: "Revision Recommended",
                description: `You have ${notes.length} material(s) older than 7 days. Quick revision will help you retain the concepts better.`,
                related_subject: "Library",
                related_topic: "Multiple",
                action_type: multiple_actions[0].action_type,
                action_label: multiple_actions[0].action_label,
                multiple_actions: multiple_actions
            });
        }

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
