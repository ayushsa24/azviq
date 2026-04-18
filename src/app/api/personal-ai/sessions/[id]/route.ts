import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError("Unauthorized", 401);

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

    const { data: aiSession, error } = await supabase
      .from("personal_ai_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;

    return apiSuccess({ session: aiSession });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[Sessions GET ${id} Error]`, error);
    return apiError(error.message, 500);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { messages, title } = body;

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

    const updates: any = { updated_at: new Date().toISOString() };
    if (messages) updates.messages = messages;
    if (title) updates.title = title;

    const { data, error } = await supabase
      .from("personal_ai_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess({ session: data });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[Sessions PATCH ${id} Error]`, error);
    return apiError(error.message, 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return apiError("Unauthorized", 401);

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

    const { error } = await supabase
      .from("personal_ai_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return apiSuccess({ message: "Session deleted" });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[Sessions DELETE ${id} Error]`, error);
    return apiError(error.message, 500);
  }
}
