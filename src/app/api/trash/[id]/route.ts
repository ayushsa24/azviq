import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "No trash item ID provided" }, { status: 400 });
    }

    // Delete single item from trash
    const { error } = await supabase
      .from("trash")
      .delete()
      .eq("id", id);
      
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE single trash item error:", error);
    return NextResponse.json({ error: "Failed to delete item permanently" }, { status: 500 });
  }
}
