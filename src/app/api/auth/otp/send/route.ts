import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { supabase } from "@/lib/supabase";
import { sendOtpInternal } from "@/lib/auth-utils";

// ---------------------------------------------------------------------------
// Upstash Redis Rate Limiter (Production-grade)
// ---------------------------------------------------------------------------
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Limit: 5 requests per 15 minutes per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "azviq:otp_limit",
});

const Schema = z.object({
  email: z.string().email(),
  type: z.enum(["SIGNUP", "PASSWORD_RESET"]),
});

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait before trying again.",
          limit,
          remaining,
          reset 
        },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          }
        }
      );
    }

    // 2. Validate input
    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or type" }, { status: 400 });
    }

    const { email, type } = parsed.data;

    // 3. Type-specific checks
    if (type === "PASSWORD_RESET") {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (!user) {
        // ENUMERATION PROTECTION: Return success even if account doesn't exist
        return NextResponse.json({ 
          message: "If an account exists, a verification code has been sent.",
          stealth: true 
        });
      }
    }

    if (type === "SIGNUP") {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, is_verified")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingUser?.is_verified) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please log in.", code: "ALREADY_EXISTS" },
          { status: 409 }
        );
      }
    }

    // 4. Send OTP using internal utility (handles hashing, DB insert, and email)
    await sendOtpInternal(email, type);

    return NextResponse.json({ message: "Verification code sent successfully." });
  } catch (err) {
    console.error("[OTP Send] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
