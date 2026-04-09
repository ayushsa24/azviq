import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^"|"$/g, '');
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().replace(/^"|"$/g, '');
        
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: user } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Verify ownership of the chat
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("user_id")
            .eq("id", id)
            .single();

        if (chatError || !chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        if (chat.user_id !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 2. Find all shared_chats records for this chat_id
        const { data: sharedChats, error: sharedError } = await supabase
            .from("shared_chats")
            .select("id")
            .eq("chat_id", id);
        
        if (sharedError) {
            console.error("[Chat Importers API] Shared chats fetch error:", sharedError);
        }

        let importers: any[] = [];
        if (sharedChats && sharedChats.length > 0) {
            const sharedIds = sharedChats.map(s => s.id);

            // 3. Find all chats that cloned these shared chats
            const { data: clonedChats, error: cloneError } = await supabase
                .from("chats")
                .select("user_id, created_at")
                .in("original_shared_chat_id", sharedIds)
                .neq("user_id", user.id); // Exclude the owner
            
            if (cloneError) {
                console.error("[Chat Importers API] Clone fetch error:", cloneError);
            }

            if (clonedChats && clonedChats.length > 0) {
                // 4. Map user IDs to their first import time
                const importTimeMap: Record<string, string> = {};
                clonedChats.forEach(c => {
                    if (!importTimeMap[c.user_id]) {
                        importTimeMap[c.user_id] = c.created_at;
                    }
                });

                const uniqueUserIds = Object.keys(importTimeMap);
                
                // 5. Fetch user profiles
                const { data: userProfiles, error: userError } = await supabase
                    .from("users")
                    .select("id, name, email, avatar_url")
                    .in("id", uniqueUserIds);
                    
                if (userError) {
                    console.error("[Chat Importers API] User profile fetch error:", userError);
                }

                importers = userProfiles?.map((profile: any) => ({
                    id: profile.id,
                    name: profile.name || profile.username || profile.email || "Anonymous User",
                    email: profile.email || "Private Email",
                    image: profile.avatar_url || null,
                    importedAt: importTimeMap[profile.id]
                })) || [];
            }
        }

        return NextResponse.json({ importers });
    } catch (error: unknown) {
        console.error("[Chat Importers API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
