import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";

const MessageSchema = z.object({
    chatId: z.string().min(1, "chatId is required"),
    userId: z.string().uuid("userId must be a valid UUID"),
    role: z.enum(["user", "model", "system", "assistant"]),
    content: z.string().min(1, "content cannot be empty").max(20000, "content too long"),
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

        const { chatId, role, content } = validation.data;

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
        if (chatId !== "temp-chat" && content.trim().length > 0) {
            const { error } = await supabase.from("messages").insert({
                chat_id: chatId,
                user_id: userId,
                role,
                content,
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
