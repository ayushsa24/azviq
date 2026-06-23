import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email || email !== session.user.email) {
      return NextResponse.json({ error: "Email mismatch. Access denied." }, { status: 400 });
    }

    // 1. Get the user ID from Supabase
    const { data: dbUser, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (fetchError || !dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Delete all related child data first to prevent Foreign Key constraint errors
    // Fetch IDs for nested deletions
    const [{ data: userChats }, { data: userNotes }] = await Promise.all([
      supabase.from("chats").select("id").eq("user_id", dbUser.id),
      supabase.from("notes").select("id").eq("user_id", dbUser.id)
    ]);

    const chatIds = userChats?.map((c) => c.id) || [];
    const noteIds = userNotes?.map((n) => n.id) || [];

    // Delete nested items that rely on chat_id or note_id
    if (chatIds.length > 0) {
      await supabase.from("messages").delete().in("chat_id", chatIds);
      await supabase.from("shared_chats").delete().in("chat_id", chatIds);
    }
    if (noteIds.length > 0) {
      await supabase.from("shared_notes").delete().in("note_id", noteIds);
    }

    // Delete all other tables that contain user_id
    const tablesToWipe = [
      "trash",
      "recent_activity",
      "notifications",
      "revisions",
      "exercises",
      "study_sessions",
      "personal_ai_sessions",
      "chats",
      "pdfs",
      "notes",
      "todos",
      "tasks",
      "projects",
      "workspaces"
    ];

    for (const table of tablesToWipe) {
      // Ignore errors for individual tables just in case a table is empty or missing
      await supabase.from(table).delete().eq("user_id", dbUser.id);
    }

    // 3. Delete the user from the public.users table
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", dbUser.id);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 });
    }

    // Attempt to delete from Auth if using Service Role Key
    try {
      await supabase.auth.admin.deleteUser(dbUser.id);
    } catch (e) {
      // Non-blocking if it fails (e.g. if we don't have service role)
    }

    // 3. Optional: Delete from Supabase Auth if using admin client
    // Since we are using the standard supabase client which is usually the anon key, 
    // we cannot delete from auth.users here without the service_role key.
    // However, deleting from public.users is the main requirement for the app.

    return NextResponse.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
