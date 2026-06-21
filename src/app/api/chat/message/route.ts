import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";

const MessageSchema = z.object({
    chatId: z.string().min(1, "chatId is required"),
    userId: z.string().uuid("userId must be a valid UUID"),
    role: z.enum(["user", "model", "system", "assistant"]),
    content: z.string().max(20000, "content too long").default(""),
    image: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        // 1. Auth check
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        // 2. Parse and validate
        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return apiError("Invalid JSON body", 400, "INVALID_JSON");
        }

        const validation = MessageSchema.partial({ userId: true }).safeParse(body);
        if (!validation.success) {
            return apiError("Invalid request data", 400, "VALIDATION_ERROR", validation.error.flatten());
        }

        const { chatId, role, content, image } = validation.data;

        // 3. Verify ownership & get userId
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        if (!dbUser) {
            return apiError("User not found", 404, "NOT_FOUND");
        }
        const userId = dbUser.id;

        // 4. Save message (skip for temporary chats)
        if (chatId !== "temp-chat" && (content.trim().length > 0 || image)) {
            const contentToSave = image
                ? JSON.stringify({ text: content, image })
                : content;

            const { error } = await supabase.from("messages").insert({
                chat_id: chatId,
                user_id: userId,
                role,
                content: contentToSave,
                email: session.user.email,
            });
            if (error) throw error;
        }

        return apiSuccess({ success: true });
    } catch (error: unknown) {
        console.error("Save message error:", error);
        return apiError("Failed to save message", 500, "INTERNAL_SERVER_ERROR");
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return apiError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get("chatId");
        const after = searchParams.get("after");
        const messageId = searchParams.get("messageId");

        if (!chatId || (!after && !messageId)) {
            return apiError("Missing required parameters", 400, "MISSING_PARAMS");
        }

        // Verify ownership
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", session.user.email)
            .single();

        const { data: chatData } = await supabase
            .from("chats")
            .select("user_id")
            .eq("id", chatId)
            .single();

        if (!chatData || !dbUser || chatData.user_id !== dbUser.id) {
            return apiError("Forbidden", 403, "FORBIDDEN");
        }

        let deleteFromTimestamp = after;

        // If messageId is provided, get its timestamp first
        if (messageId) {
            const { data: targetMsg } = await supabase
                .from("messages")
                .select("created_at")
                .eq("id", messageId)
                .single();
            
            if (targetMsg?.created_at) {
                deleteFromTimestamp = targetMsg.created_at;
            }
        }

        if (!deleteFromTimestamp) {
            return apiError("Target message not found or missing timestamp", 404, "NOT_FOUND");
        }

        // Delete messages from the specified timestamp onwards
        const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .eq("chat_id", chatId)
            .gte("created_at", deleteFromTimestamp);

        if (deleteError) throw deleteError;

        return apiSuccess({ success: true });
    } catch (error: any) {
        console.error("Delete messages error:", error);
        return apiError("Failed to clear history", 500, "INTERNAL_SERVER_ERROR");
    }
}
