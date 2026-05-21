import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Fetch today's timer state
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studyDate = searchParams.get("date");
    if (!studyDate) {
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: summary } = await supabase
      .from("daily_study_summary")
      .select("activities_summary")
      .eq("user_id", user.id)
      .eq("study_date", studyDate)
      .maybeSingle();

    const timerState = summary?.activities_summary?.["__timer_state"] || null;
    return NextResponse.json({ timerState });
  } catch (error: any) {
    console.error("GET /api/study/timer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Sync timer state
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date: studyDate, timerState } = await req.json();
    if (!studyDate || !timerState) {
      return NextResponse.json({ error: "Missing date or timerState" }, { status: 400 });
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

    // Fetch existing daily study summary to preserve other activities
    const { data: existingSummary } = await supabase
      .from("daily_study_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("study_date", studyDate)
      .maybeSingle();

    const currentActivities = existingSummary?.activities_summary || {};
    
    // Add or update the __timer_state key
    const newActivities = {
      ...currentActivities,
      "__timer_state": {
        ...timerState,
        lastUpdated: new Date().toISOString()
      }
    };

    const { error: upsertError } = await supabase
      .from("daily_study_summary")
      .upsert({
        user_id: userId,
        study_date: studyDate,
        total_minutes: existingSummary?.total_minutes || 0,
        activity_count: existingSummary?.activity_count || 0,
        activities_summary: newActivities
      }, {
        onConflict: "user_id,study_date"
      });

    if (upsertError) {
      console.error("Error upserting timer state:", upsertError);
      return NextResponse.json({ error: "Failed to save timer state" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/study/timer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
