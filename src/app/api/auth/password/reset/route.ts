import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Redis } from "@upstash/redis";

import { Ratelimit } from "@upstash/ratelimit";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Allow 3 password resets per 30 minutes
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "30 m"),
});

const Schema = z.object({
  resetToken: z.string().uuid(),
  newPassword: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await ratelimit.limit(`pw_reset_redis_${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many password reset attempts. Please try again later." }, { status: 429 });
    }

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input. Password must be at least 8 characters." }, { status: 400 });
    }

    const { resetToken, newPassword } = parsed.data;

    // 1. Look up the reset session token in Redis
    const redisKey = `azviq:reset_session:${resetToken}`;
    const email = await redis.get<string>(redisKey);

    if (!email) {
      return NextResponse.json({ error: "Invalid or expired session. Please restart the password reset." }, { status: 401 });
    }

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update password in Supabase
    // We also set is_verified to true just in case, though they must be verified to reach here
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: passwordHash, is_verified: true })
      .eq("email", email);

    if (updateError) {
      console.error("[Password Reset] Update error:", updateError);
      return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
    }

    // 4. Invalidate the reset token immediately after use
    await redis.del(redisKey);

    return NextResponse.json({ message: "Password updated successfully. You can now log in." });
  } catch (err) {
    console.error("[Password Reset] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
