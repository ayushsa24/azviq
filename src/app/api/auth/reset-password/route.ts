import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Allow 3 password resets per 30 minutes
const ratelimit = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(3, "30 m"),
});

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(`pw_reset_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many password reset attempts. Please try again later." }, { status: 429 });
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // 1. Hash the incoming token to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("user_id, expires_at")
      .eq("token_hash", hashedToken)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    // 3. Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: "Token has expired" }, { status: 400 });
    }

    // 4. Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Update user and delete token (transaction-like)
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", tokenData.user_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    // 6. Cleanup the token
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("token_hash", hashedToken);

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
