import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Verify ownership
    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!dbUser) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: chat } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (!chat || chat.user_id !== dbUser.id) {
      return Response.json({ error: "Chat not found or access denied" }, { status: 404 });
    }

    // Fetch messages for the specific chat
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return Response.json({ messages });
  } catch (error) {
    console.error("Fetch messages API Error:", error);
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
