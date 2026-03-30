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
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch user error:", fetchError);
      return NextResponse.json({ error: "Failed to verify account" }, { status: 500 });
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Delete the user from Supabase Auth (clears the identity)
    const { error: authError } = await supabase.auth.admin.deleteUser(dbUser.id);
    if (authError) {
      console.error("Auth delete error:", authError);
      // We still proceed if auth deletion fails temporarily, but we log the issue
    }

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

    return NextResponse.json({ success: true, message: "Account deleted successfully. Please sign out." });
  } catch (error) {
    console.error("Delete account API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
