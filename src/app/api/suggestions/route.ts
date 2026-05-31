import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Suggestion {
    id: string;
    suggestion_type: string;
    title: string;
    description: string;
    action_type: string;
    action_label: string;
    related_subject?: string;
    related_topic?: string;
    multiple_actions?: { id: string; action_type: string; action_label: string; status: string }[];
}

interface ExerciseRow {
    id: string;
    title: string | null;
    score: number | null;
    note_id: string | null;
}

interface NoteRow {
    id: string;
    title: string;
    file_url: string | null;
    workspace_id: string | null;
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const userId = (session.user as { id: string }).id;
        const suggestions: Suggestion[] = [];
        const todayString = new Date().toISOString().split("T")[0];

        // Run independent queries in parallel for speed
        const [dailyResult, exercisesResult, notesResult, trashResult, pcResult] = await Promise.all([
            supabase.from("daily_study_summary").select("total_minutes, activities_summary").eq("user_id", userId).eq("study_date", todayString).maybeSingle(),
            supabase.from("exercises").select("id, title, score, note_id").eq("user_id", userId).eq("status", "Completed").not("score", "is", null),
            supabase.from("notes").select("id, title, file_url, workspace_id").eq("user_id", userId).lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: true }),
            supabase.from("trash").select("item_id").eq("user_id", userId),
            supabase.from("parent_control").select("daily_target_hours").eq("user_id", userId).limit(1)
        ]);

        const dailySummary = dailyResult.data;
        const pcEntries = pcResult.data;
        const targetHours = pcEntries && pcEntries.length > 0 ? pcEntries[0].daily_target_hours : null;
        
        // Retrieve dynamic target override from today's synchronized timer state if active
        const dbTimerState = (dailySummary as any)?.activities_summary?.["__timer_state"];
        const customTargetMinutes = dbTimerState?.targetMinutes;
        
        const targetMinutes = customTargetMinutes !== undefined && customTargetMinutes !== null
            ? customTargetMinutes
            : (targetHours !== null && targetHours !== undefined ? targetHours * 60 : 60);

        const trashedIds = new Set(trashResult.data?.map(i => i.item_id) || []);
        
        // Filter out items that are in trash or belong to a trashed workspace/note
        const exercises = (exercisesResult.data || []).filter(ex => !trashedIds.has(ex.id) && !(ex.note_id && trashedIds.has(ex.note_id)));
        const notes = (notesResult.data || []).filter(n => !trashedIds.has(n.id) && !(n.workspace_id && trashedIds.has(n.workspace_id)));

        // 1. Daily Study Target
        const totalMinutes = (dailySummary as { total_minutes?: number } | null)?.total_minutes || 0;
        if (totalMinutes < targetMinutes) {
            suggestions.push({
                id: `short-study-${todayString}`,
                suggestion_type: "short_study",
                title: "Quick Study Session",
                description: `You studied only ${totalMinutes} minutes today. Continuing now will help you reach your daily target of ${targetMinutes} minutes!`,
                action_type: "/library",
                action_label: "Start Study",
            });
        }

        // 2. Check Weak Topics from Exercises
        if (exercises && exercises.length > 0) {
            const typedExercises = exercises as ExerciseRow[];
            const weakExercises = typedExercises.filter((ex) => (ex.score ?? 100) < 40);

            if (weakExercises.length > 0) {
                // Bulk check for existing items to avoid loop queries
                const { data: existingItems } = await supabase
                    .from("ai_suggestion_items")
                    .select("item_id")
                    .eq("user_id", userId)
                    .in("item_id", weakExercises.map(ex => ex.id));
                
                const existingIds = new Set(existingItems?.map(i => i.item_id) || []);
                const itemsToInsert = weakExercises
                    .filter(ex => !existingIds.has(ex.id))
                    .map(ex => ({
                        user_id: userId,
                        suggestion_id: `weak-topics-${userId}`,
                        item_id: ex.id,
                        item_type: 'exercise',
                        title: ex.title || "Practice",
                        status: 'active'
                    }));
                
                if (itemsToInsert.length > 0) {
                    await supabase.from("ai_suggestion_items").insert(itemsToInsert);
                }

                const { data: currentItems } = await supabase
                    .from("ai_suggestion_items")
                    .select("*")
                    .eq("user_id", userId)
                    .eq("suggestion_id", `weak-topics-${userId}`)
                    .in("item_id", weakExercises.map(ex => ex.id));

                if (currentItems && currentItems.length > 0) {
                    const multiple_actions = currentItems.map((item) => {
                        const realEx = weakExercises.find(ex => ex.id === item.item_id);
                        return {
                            id: item.item_id,
                            action_type: `/preparation/exercise/${item.item_id}`,
                            action_label: realEx?.title || item.title,
                            status: item.status
                        };
                    });

                    suggestions.push({
                        id: `weak-topics-${userId}`,
                        suggestion_type: "weak_topic",
                        title: "Weak Topics Detected",
                        description: `You have ${weakExercises.length} exercise(s) with an accuracy below 40%.`,
                        action_type: multiple_actions[0].action_type,
                        action_label: multiple_actions[0].action_label,
                        multiple_actions,
                    });
                }
            }
        }

        // 3. Spaced Revision Recommendation
        if (notes && notes.length > 0) {
            const typedNotes = notes as NoteRow[];
            
            const { data: existingItems } = await supabase
                .from("ai_suggestion_items")
                .select("item_id")
                .eq("user_id", userId)
                .in("item_id", typedNotes.map(n => n.id));
            
            const existingIds = new Set(existingItems?.map(i => i.item_id) || []);
            const itemsToInsert = typedNotes
                .filter(n => !existingIds.has(n.id))
                .map(note => ({
                    user_id: userId,
                    suggestion_id: `spaced-revision-${userId}`,
                    item_id: note.id,
                    item_type: 'note',
                    title: note.title,
                    status: 'active'
                }));
            
            if (itemsToInsert.length > 0) {
                await supabase.from("ai_suggestion_items").insert(itemsToInsert);
            }

            const { data: currentItems } = await supabase
                .from("ai_suggestion_items")
                .select("*")
                .eq("user_id", userId)
                .eq("suggestion_id", `spaced-revision-${userId}`)
                .in("item_id", typedNotes.map(n => n.id));

            if (currentItems && currentItems.length > 0) {
                const multiple_actions = currentItems.map((item) => {
                    const realNote = typedNotes.find(n => n.id === item.item_id);
                    return {
                        id: item.item_id,
                        action_type: `/library/${item.item_type === 'pdf' ? "pdf" : "note"}/${item.item_id}`,
                        action_label: realNote?.title || item.title,
                        status: item.status
                    };
                });

                suggestions.push({
                    id: `spaced-revision-${userId}`,
                    suggestion_type: "spaced_revision",
                    title: "Revision Recommended",
                    description: `You have ${notes.length} material(s) older than 7 days.`,
                    action_type: multiple_actions[0].action_type,
                    action_label: multiple_actions[0].action_label,
                    multiple_actions,
                });
            }
        }

        const topSuggestions = suggestions.slice(0, 4);

        // Persist the actual card IDs to ai_suggestions
        await supabase.from("ai_suggestions").delete().eq("user_id", userId);
        if (topSuggestions.length > 0) {
            const insertData = topSuggestions.map((s) => ({
                id: s.id,
                user_id: userId,
                suggestion_type: s.suggestion_type,
                title: s.title,
                description: s.description,
                action_type: s.action_type,
                related_subject: s.related_subject,
                related_topic: s.related_topic,
            }));
            await supabase.from("ai_suggestions").insert(insertData);
        }

        return NextResponse.json({ suggestions: topSuggestions });
    } catch (error: unknown) {
        console.error("GET /api/suggestions error:", error);
        return apiError("Failed to generate suggestions", 500, "INTERNAL_SERVER_ERROR");
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const userId = (session.user as { id: string }).id;

        const { itemId, status } = await req.json();

        const { error } = await supabase
            .from("ai_suggestion_items")
            .update({ status })
            .eq("user_id", userId)
            .eq("item_id", itemId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/suggestions error:", error);
        return apiError("Failed to update status", 500, "INTERNAL_SERVER_ERROR");
    }
}
