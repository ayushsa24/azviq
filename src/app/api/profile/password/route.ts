import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Allow 5 password change attempts per 10 minutes
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limit Check
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(`pw_change_${userId}_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many password change attempts. Please try again later." }, { status: 429 });
    }

    const { data: authDbUser } = await supabase
      .from("users")
      .select("id, password_hash")
      .eq("email", session.user.email)
      .single();

    if (!authDbUser || authDbUser.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Google users don't have a real password (hash might be 'OAUTH_USER' or null)
    if (!authDbUser.password_hash || authDbUser.password_hash === "OAUTH_USER") {
      return NextResponse.json({ error: "Cannot change password for OAuth accounts." }, { status: 400 });
    }

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ error: "New password must contain at least one uppercase letter" }, { status: 400 });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return NextResponse.json({ error: "New password must contain at least one symbol" }, { status: 400 });
    }

    const match = await bcrypt.compare(oldPassword, authDbUser.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Incorrect old password." }, { status: 400 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update password:", updateError);
      return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Update password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
