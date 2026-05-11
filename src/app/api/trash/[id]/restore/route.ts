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
      case "chat":
        tableName = "chats";
        break;
      case "personal_ai_session":
        tableName = "personal_ai_sessions";
        break;
      default:
        return NextResponse.json({ error: "Unknown item type" }, { status: 400 });
    }

    // Extract embedded messages if it's a chat
    let embeddedMessages: any[] | null = null;
    if (tableName === "chats" && dataToRestore.messages) {
      embeddedMessages = dataToRestore.messages;
      delete dataToRestore.messages;
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

    // Restore embedded messages if any
    if (embeddedMessages && embeddedMessages.length > 0) {
      const { error: msgError } = await supabase
        .from("messages")
        .insert(embeddedMessages);
      
      if (msgError) {
        console.error(`Restore chat_messages error:`, msgError);
      }
    }

    // 3. Recursive Restoration: Handle children if this is a parent (Workspace or Note)
    if (trashItem.item_type === "note" || trashItem.item_type === "pdf" || trashItem.item_type === "workspace" || trashItem.item_type === "project") {
      try {
        let childrenQuery = supabase.from("trash").select("*").eq("user_id", session.user.email ? (await supabase.from("users").select("id").eq("email", session.user.email).single()).data?.id : null);
        
        if (trashItem.item_type === "workspace") {
          childrenQuery = childrenQuery
            .in("item_type", ["note", "pdf"])
            .contains("data", { workspace_id: trashItem.item_id });
        } else if (trashItem.item_type === "project") {
          childrenQuery = childrenQuery
            .in("item_type", ["task", "todo"])
            .contains("data", { project_id: trashItem.item_id });
        } else {
          childrenQuery = childrenQuery
            .in("item_type", ["exercise", "revision"])
            .contains("data", { note_id: trashItem.item_id });
        }

        const { data: children } = await childrenQuery;

        if (children && children.length > 0) {
          for (const child of children) {
            let childTable = "";
            switch (child.item_type) {
              case "note": case "pdf": childTable = "notes"; break;
              case "exercise": childTable = "exercises"; break;
              case "revision": childTable = "revisions"; break;
              case "chat": childTable = "chats"; break;
              case "task": childTable = "tasks"; break;
              case "todo": childTable = "todos"; break;
            }

            if (childTable) {
              await supabase.from(childTable).insert(child.data);
              await supabase.from("trash").delete().eq("id", child.id);
            }
          }
        }
      } catch (err) {
        console.error("Recursive restore failed:", err);
      }

      // Reconnect any orphaned Personal AI sessions back to this restored note
      if (trashItem.item_type === "note" || trashItem.item_type === "pdf") {
        try {
          const { data: orphanedSessions } = await supabase
            .from("personal_ai_sessions")
            .select("id, title")
            .like("title", `%||ORIGINAL_NOTE_ID||${trashItem.item_id}`);

          if (orphanedSessions && orphanedSessions.length > 0) {
            for (const s of orphanedSessions) {
              const originalTitle = s.title.split("||ORIGINAL_NOTE_ID||")[0];
              await supabase
                .from("personal_ai_sessions")
                .update({ note_id: trashItem.item_id, title: originalTitle })
                .eq("id", s.id);
            }
          }
        } catch (e) {
          console.error("Failed to reconnect orphaned AI sessions:", e);
        }
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
