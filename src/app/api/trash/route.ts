import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
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

    // Proactive Cleanup: Delete items older than 7 days automatically whenever user checks trash
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from("trash")
      .delete()
      .lt("deleted_at", sevenDaysAgo.toISOString())
      .eq("user_id", user.id);

    // Fetch the remaining trash items
    const { data: trashItems, error } = await supabase
      .from("trash")
      .select("*")
      .eq("user_id", user.id)
      .order("deleted_at", { ascending: false });

    if (error) throw error;

    // Filter out child items whose parent is also in the trash
    // This prevents "double listing" when an entire workspace or project is deleted
    const trashSet = new Set(trashItems?.map(item => item.item_id) || []);
    
    const filteredTrashItems = trashItems?.filter(item => {
      // If it's a note or pdf, hide it if its workspace is in the trash
      if (item.item_type === "note" || item.item_type === "pdf") {
        if (item.data?.workspace_id && trashSet.has(item.data.workspace_id)) {
          return false;
        }
      }
      // If it's an exercise or revision, hide it if its note is in the trash
      if (item.item_type === "exercise" || item.item_type === "revision") {
        if (item.data?.note_id && trashSet.has(item.data.note_id)) {
          return false;
        }
      }
      // If it's a task, hide it if its project is in the trash
      if (item.item_type === "task" || item.item_type === "todo") {
        if (item.data?.project_id && trashSet.has(item.data.project_id)) {
          return false;
        }
      }
      return true;
    }) || [];

    return NextResponse.json({ trashItems: filteredTrashItems });
  } catch (error) {
    console.error("GET trash error:", error);
    return NextResponse.json({ error: "Failed to fetch trash bin" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = supabase.from("trash").delete().eq("user_id", user.id);

    // If a specific category type is requested, only delete those
    if (type && type !== "all") {
       if (type === "library") query = query.in("item_type", ["note", "pdf", "workspace", "project"]);
       else if (type === "task") query = query.in("item_type", ["task", "todo"]);
       else if (type === "revision") query = query.in("item_type", ["revision", "exercise"]);
       else if (type === "chat") query = query.in("item_type", ["chat", "personal_ai_session"]);
       else query = query.eq("item_type", type);
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE trash error:", error);
    return NextResponse.json({ error: "Failed to empty trash bin" }, { status: 500 });
  }
}
