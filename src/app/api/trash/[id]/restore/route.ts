import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "No trash item ID provided" }, { status: 400 });
    }

    // 1. Fetch Trash Item
    const { data: trashItem, error: fetchError } = await supabase
      .from("trash")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !trashItem) {
      return NextResponse.json({ error: "Trash item not found" }, { status: 404 });
    }

    // Determine target table and cleanup relation IDs if necessary
    let tableName = "";
    let dataToRestore = { ...trashItem.data };

    switch (trashItem.item_type) {
      case "note":
      case "pdf":
        tableName = "notes";
        break;
      case "workspace":
        tableName = "workspaces";
        break;
      case "task":
        tableName = "tasks";
        break;
      case "todo":
        tableName = "todos";
        break;
      case "project":
        tableName = "projects";
        break;
      case "exercise":
        tableName = "exercises";
        break;
      case "revision":
        tableName = "revisions";
        break;
      default:
        return NextResponse.json({ error: "Unknown item type" }, { status: 400 });
    }

    // 2. Re-insert the data into the original table
    const { error: restoreError } = await supabase
      .from(tableName)
      .insert(dataToRestore);

    if (restoreError) {
      console.error(`Restore into ${tableName} error:`, restoreError);
      
      // Handle the case where the parent (like a workspace or project) was permanently deleted
      // by setting the foreign key to null and retrying
      if (restoreError.code === "23503" || restoreError.message.includes("foreign key")) {
         if (tableName === "notes" && dataToRestore.workspace_id) {
            dataToRestore.workspace_id = null;
         } else if (tableName === "tasks" && dataToRestore.project_id) {
            dataToRestore.project_id = null;
         } else if (tableName === "todos" && dataToRestore.item_id) {
            dataToRestore.item_id = null;
         } else {
             throw restoreError;
         }

         const { error: retryError } = await supabase
          .from(tableName)
          .insert(dataToRestore);
         
         if (retryError) throw retryError;
      } else {
          throw restoreError;
      }
    }

    // 3. Delete from trash bin since it is restored
    const { error: deleteError } = await supabase
      .from("trash")
      .delete()
      .eq("id", id);
      
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST restore trash item error:", error);
    return NextResponse.json({ error: "Failed to restore item" }, { status: 500 });
  }
}
