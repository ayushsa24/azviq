import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Types for our suggestion system
interface Suggestion {
    id: string;
    suggestion_type: string;
    title: string;
    description: string;
    action_type: string;
    action_label: string;
    related_subject?: string;
    related_topic?: string;
    multiple_actions?: { id: string; action_type: string; action_label: string }[];
}

interface ExerciseRow {
    id: string;
    title: string | null;
    score: number | null;
}

interface NoteRow {
    id: string;
    title: string;
    file_url: string | null;
}

export async function GET() {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        // 2. Get the authenticated user's ID
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (userError || !user) {
            return apiError("User not found", 404, "USER_NOT_FOUND");
        }

        const userId = user.id as string;
        const suggestions: Suggestion[] = [];
        const todayString = new Date().toISOString().split("T")[0];

        // 3. Check Daily Study Target
        const { data: dailySummary } = await supabase
            .from("daily_study_summary")
            .select("total_minutes")
            .eq("user_id", userId)
            .eq("study_date", todayString)
            .single();

        const totalMinutes = (dailySummary as { total_minutes?: number } | null)?.total_minutes || 0;
        if (totalMinutes < 60) {
            suggestions.push({
                id: `short-study-${todayString}`,
                suggestion_type: "short_study",
                title: "Quick Study Session",
                description: `You studied only ${totalMinutes} minutes today.`,
                action_type: "/library",
                action_label: "Start Study",
            });
        }

        // 4. Check Weak Topics from Exercises
        const { data: exercises } = await supabase
            .from("exercises")
            .select("id, title, score")
            .eq("user_id", userId)
            .eq("status", "Completed")
            .not("score", "is", null);

        if (exercises && exercises.length > 0) {
            const typedExercises = exercises as ExerciseRow[];
            typedExercises.sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
            const weakExercises = typedExercises.filter((ex) => (ex.score ?? 100) < 60);

            if (weakExercises.length > 0) {
                const multiple_actions = weakExercises.slice(0, 3).map((ex) => ({
                    id: ex.id,
                    action_type: `/preparation?tab=exercise&id=${ex.id}`,
                    action_label: ex.title || "Practice",
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
                    multiple_actions,
                });
            }
        }

        // 5. Spaced Revision Recommendation (Notes older than 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: notes } = await supabase
            .from("notes")
            .select("id, title, file_url")
            .eq("user_id", userId)
            .lt("created_at", sevenDaysAgo.toISOString())
            .order("created_at", { ascending: true })
            .limit(2);

        if (notes && notes.length > 0) {
            const typedNotes = notes as NoteRow[];
            const multiple_actions = typedNotes.slice(0, 3).map((note) => ({
                id: note.id,
                action_type: `/library/${note.file_url ? "pdf" : "note"}/${note.id}`,
                action_label: note.title,
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
                multiple_actions,
            });
        }

        const topSuggestions = suggestions.slice(0, 4);

        // 6. Persist to ai_suggestions table
        await supabase.from("ai_suggestions").delete().eq("user_id", userId);
        if (topSuggestions.length > 0) {
            const insertData = topSuggestions.map((s) => ({
                id: s.id,
                user_id: userId,
                suggestion_type: s.suggestion_type,
                title: s.title,
                description: s.description,
                related_subject: s.related_subject,
                related_topic: s.related_topic,
                action_type: s.action_type,
            }));
            await supabase.from("ai_suggestions").insert(insertData);
        }

        return NextResponse.json({ suggestions: topSuggestions });
    } catch (error: unknown) {
        console.error("GET /api/suggestions error:", error);
        return apiError("Failed to generate suggestions", 500, "INTERNAL_SERVER_ERROR");
    }
}
