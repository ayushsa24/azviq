import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("note_id");

    const supabase = createClient(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, ""),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, "")
    );

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) return apiError("User not found", 404);

    let query = supabase
      .from("personal_ai_sessions")
      .select("id, title, note_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (noteId) {
      query = query.eq("note_id", noteId);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;

    return apiSuccess({ sessions });
  } catch (error: any) {
    console.error("[Sessions GET Error]", error);
    return apiError(error.message, 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { noteId, title, messages } = body;

    const supabase = createClient(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, ""),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, "")
    );

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!user) return apiError("User not found", 404);

    const { data, error } = await supabase
      .from("personal_ai_sessions")
      .insert({
        user_id: user.id,
        note_id: noteId || null,
        title: title || "Study Session",
        messages: messages || [],
      })
      .select()
      .single();

    if (error) throw error;

    return apiSuccess({ session: data });
  } catch (error: any) {
    console.error("[Sessions POST Error]", error);
    return apiError(error.message, 500);
  }
}
