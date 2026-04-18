import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const Schema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
  type: z.enum(["SIGNUP", "PASSWORD_RESET"]),
});

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { email, code, type } = parsed.data;

    // 1. Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_verifications")
      .select("id, code_hash, attempts, expires_at")
      .eq("email", email.toLowerCase())
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: "Verification code not found. Please request a new one." }, { status: 404 });
    }

    // 2. Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("email_verifications").delete().eq("id", otpRecord.id);
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 410 });
    }

    // 3. Check attempt limit (max 5)
    const newAttempts = otpRecord.attempts + 1;
    if (newAttempts > 5) {
      await supabase.from("email_verifications").delete().eq("id", otpRecord.id);
      return NextResponse.json({
        error: "Too many incorrect attempts. Please request a new code.",
        code: "MAX_ATTEMPTS",
      }, { status: 429 });
    }

    // 4. Verify the code
    const inputHash = crypto.createHash("sha256").update(code).digest("hex");
    if (inputHash !== otpRecord.code_hash) {
      // Increment attempts
      await supabase
        .from("email_verifications")
        .update({ attempts: newAttempts })
        .eq("id", otpRecord.id);

      const remaining = 5 - newAttempts;
      return NextResponse.json({
        error: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        code: "INVALID_CODE",
        attemptsRemaining: remaining,
      }, { status: 400 });
    }

    // 5. Code is CORRECT — delete it (one-time use)
    await supabase.from("email_verifications").delete().eq("id", otpRecord.id);

    // 6. Type-specific success actions
    if (type === "SIGNUP") {
      const { error: updateError } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("email", email.toLowerCase());

      if (updateError) {
        console.error("[OTP Verify] Failed to verify user:", updateError);
        return NextResponse.json({ error: "Failed to verify account. Please try again." }, { status: 500 });
      }

      return NextResponse.json({ message: "Email verified successfully.", verified: true });
    }

    if (type === "PASSWORD_RESET") {
      // Generate a short-lived reset session token
      const resetToken = randomUUID();
      
      // Store in Redis with 5-minute expiry (300 seconds)
      // Key: email_reset_session:<token>, Value: email
      await redis.set(`azviq:reset_session:${resetToken}`, email.toLowerCase(), { ex: 300 });

      return NextResponse.json({
        message: "Code verified. Proceed to reset your password.",
        resetToken,
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[OTP Verify] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
