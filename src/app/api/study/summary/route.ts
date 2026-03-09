import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const yearStr = searchParams.get('year');
        const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

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

        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data: summaries, error } = await supabase
            .from("daily_study_summary")
            .select("*")
            .eq("user_id", userId)
            .gte("study_date", startDate)
            .lte("study_date", endDate)
            .order("study_date", { ascending: true });

        if (error) {
            console.error("Error fetching daily summaries:", error);
            return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
        }

        return NextResponse.json({ summaries: summaries || [] });
    } catch (error) {
        console.error("Error in study summary API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
