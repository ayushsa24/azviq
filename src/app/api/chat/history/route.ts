import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "Missing userId" }, { status: 400 });
  }

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

    if (!dbUser || dbUser.id !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all chats for the user, ordered by pinned first, then newest first
    const { data: chats, error } = await supabase
      .from("chats")
      .select("*, messages(*)")
      .eq("user_id", userId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Ensure messages are strictly ordered chronologically
    const sortedChats = chats.map((chat) => ({
      ...chat,
      messages: chat.messages
        ? chat.messages.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
        : [],
    }));

    // Sort by latest message manually to handle history updates without a database column change
    sortedChats.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;

      const aLatest =
        a.messages.length > 0
          ? new Date(a.messages[a.messages.length - 1].created_at).getTime()
          : new Date(a.created_at).getTime();

      const bLatest =
        b.messages.length > 0
          ? new Date(b.messages[b.messages.length - 1].created_at).getTime()
          : new Date(b.created_at).getTime();

      return bLatest - aLatest;
    });

    return Response.json({ chats: sortedChats });
  } catch (error) {
    console.error("History API Error:", error);
    return Response.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Use POST to create a new chat session explicitly
  try {
    const { userId, title } = await req.json();

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: authDbUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!authDbUser || authDbUser.id !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: userRecord } = await supabase
      .from("users")
      .select("username")
      .eq("id", userId)
      .single();

    const { data, error } = await supabase
      .from("chats")
      .insert({
        user_id: userId,
        title: title || "New Chat",
        username: userRecord?.username || null,
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
