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

    // 2. Delete the user's trash items first
    // This ensures no orphaned data remains and avoids trigger conflicts
    await supabase
      .from("trash")
      .delete()
      .eq("user_id", dbUser.id);

    // 3. Delete the user from the public.users table
    // Note: If you have foreign keys with ON DELETE CASCADE, this will delete related data.
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", dbUser.id);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 });
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
