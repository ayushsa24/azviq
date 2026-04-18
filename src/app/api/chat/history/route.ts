import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!dbUser) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const userId = dbUser.id;
    const { searchParams } = new URL(req.url);
    const archivedOnly = searchParams.get("archived") === "true";
    const allChats = searchParams.get("all") === "true";
    const importedOnly = searchParams.get("imported") === "true";

    // Fetch chats for the user (only metadata, messages loaded on-demand)
    const { data: chats, error } = await supabase
      .from("chats")
      .select(`
        *,
        original_shared_chat:shared_chats!original_shared_chat_id(
          id,
          user_id,
          users:users!user_id(name, email)
        ),
        share_links:shared_chats!chat_id(id),
        messages:messages(count)
      `)
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter based on search parameters and message count
    const filteredChats = chats.filter((chat: any) => {
      // 1. Filter out chats with 0 messages (unless pinned OR just created)
      const messageCount = chat.messages?.[0]?.count || 0;
      const isVeryNew = new Date().getTime() - new Date(chat.created_at).getTime() < 60000; // 60s grace period
      const hasContent = messageCount > 0 || chat.is_pinned || isVeryNew;
      if (!hasContent) return false;

      // 2. Filter based on archived/imported status
      if (importedOnly) {
        return !!chat.original_shared_chat_id;
      }
      
      if (allChats) {
        return true;
      }

      if (archivedOnly) {
        return !!chat.is_archived;
      }

      // Default: only non-archived chats
      return !chat.is_archived;
    });

    return Response.json({ chats: filteredChats });
  } catch (error) {
    console.error("History API Error:", error);
    return Response.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Use POST to create a new chat session explicitly
  try {
    const { title, original_shared_chat_id } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: authDbUser } = await supabase
      .from("users")
      .select("id, username")
      .eq("email", session.user.email)
      .single();

    if (!authDbUser) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = authDbUser.id;

    const { data, error } = await supabase
      .from("chats")
      .insert({
        user_id: userId,
        title: title || "New Chat",
        username: authDbUser.username || null,
        original_shared_chat_id: original_shared_chat_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ chat: data });
  } catch (error) {
    console.error("Create Chat Error:", error);
    return Response.json({ error: "Failed to create chat" }, { status: 500 });
  }
}
