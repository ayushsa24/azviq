import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { buildDailyReportEmail } from "@/lib/emailTemplates";
import { format } from "date-fns";

export async function GET(req: Request) {
    // Validate API keys
    const resendKey = process.env.RESEND_API_KEY;
    const cronSecret = process.env.CRON_SECRET;

    if (!resendKey) {
        console.error("Missing RESEND_API_KEY in environment variables.");
        return NextResponse.json({ error: "Server Configuration Error: Missing Resend API Key" }, { status: 500 });
    }

    const resend = new Resend(resendKey);

    // Validate cron secret
    const authHeader = req.headers.get("authorization");
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const dateLabel = format(today, "EEEE, MMMM d, yyyy");

    // Get current hour in IST (HH format)
    const istHourOnly = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false
    }).format(today);

    // Get all users who have parent_control entries with control_enabled = true
    // AND whose report_time matches the current IST hour
    const { searchParams } = new URL(req.url);
    const isTest = searchParams.get("test") === "true";

    let query = supabase
        .from("parent_control")
        .select("user_id, family_email, daily_target_hours, report_time")
        .eq("control_enabled", true);

    // Only filter by hour if it's NOT a manual test call
    if (!isTest) {
        // Use ILIKE to match the hour (e.g., '20:%') to support any minutes
        query = query.ilike("report_time", `${istHourOnly}:%`);
    }

    const { data: controlEntries, error: controlError } = await query;

    if (controlError || !controlEntries || controlEntries.length === 0) {
        console.log("No enabled parent control entries found.");
        return NextResponse.json({ message: "No entries to process", count: 0 });
    }

    // Group by user_id
    const userMap = new Map<string, { emails: string[]; targetHours: number | null }>();
    for (const entry of controlEntries) {
        if (!userMap.has(entry.user_id)) {
            userMap.set(entry.user_id, { emails: [], targetHours: entry.daily_target_hours });
        }
        userMap.get(entry.user_id)!.emails.push(entry.family_email);
    }

    const results: { userId: string; sent: number; error?: string }[] = [];

    for (const [userId, { emails, targetHours }] of userMap.entries()) {
        try {
            // Fetch user info
            const { data: userRow } = await supabase
                .from("users")
                .select("name, email")
                .eq("id", userId)
                .single();

            // Fetch today's study summary
            const { data: studySummary } = await supabase
                .from("daily_study_summary")
                .select("total_minutes, activities_summary")
                .eq("user_id", userId)
                .eq("study_date", todayStr)
                .single();

            // Fetch tasks completed today
            const { count: tasksCompleted } = await supabase
                .from("tasks")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("status", "done")
                .gte("updated_at", `${todayStr}T00:00:00`)
                .lte("updated_at", `${todayStr}T23:59:59`);

            // Fetch todos completed today
            const { count: todosCompleted } = await supabase
                .from("todos")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("done", true)
                .gte("updated_at", `${todayStr}T00:00:00`)
                .lte("updated_at", `${todayStr}T23:59:59`);

            // Fetch notes created today
            const { count: notesCreated } = await supabase
                .from("notes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("created_at", `${todayStr}T00:00:00`)
                .lte("created_at", `${todayStr}T23:59:59`);

            // Fetch notes revised today (updated today but created before today)
            const { count: notesRevised } = await supabase
                .from("notes")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .lt("created_at", `${todayStr}T00:00:00`)
                .gte("updated_at", `${todayStr}T00:00:00`)
                .lte("updated_at", `${todayStr}T23:59:59`);

            // Fetch AI Suggestions completed today (Weak Topics & Revisions)
            const { data: suggestionItems } = await supabase
                .from("ai_suggestion_items")
                .select("suggestion_id")
                .eq("user_id", userId)
                .eq("status", "completed")
                .gte("updated_at", `${todayStr}T00:00:00`)
                .lte("updated_at", `${todayStr}T23:59:59`);

            const weakTopicsCompleted = (suggestionItems || []).filter(item => item.suggestion_id.includes("weak-topics")).length;
            const revisionsCompleted = (suggestionItems || []).filter(item => item.suggestion_id.includes("spaced-revision")).length;

            const htmlContent = buildDailyReportEmail({
                childName: userRow?.name || "Student",
                childEmail: userRow?.email || "",
                date: dateLabel,
                totalMinutes: studySummary?.total_minutes || 0,
                targetHours: targetHours ?? null,
                activitiesSummary: studySummary?.activities_summary || {},
                tasksCompleted: tasksCompleted ?? 0,
                todosCompleted: todosCompleted ?? 0,
                notesCreated: notesCreated ?? 0,
                notesRevised: notesRevised ?? 0,
                weakTopicsCompleted,
                revisionsCompleted,
            });

            // Send to all family emails
            let sentCount = 0;
            for (const email of emails) {
                const { error: sendError } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: email,
                    subject: `Daily Study Report — ${userRow?.name || "Student"} · ${dateLabel}`,
                    html: htmlContent,
                });

                if (!sendError) sentCount++;
                else console.error(`Failed to send to ${email}:`, sendError);
            }

            results.push({ userId, sent: sentCount });
        } catch (err) {
            console.error(`Error processing user ${userId}:`, err);
            results.push({ userId, sent: 0, error: String(err) });
        }
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    console.log(`Daily reports sent: ${totalSent} emails to ${results.length} users' families`);
    return NextResponse.json({ message: "Reports sent", totalEmails: totalSent, results });
}
