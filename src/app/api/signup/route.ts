import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";
import { sendOtpInternal } from "@/lib/auth-utils";

// --- Zod Schema: Strict signup validation ---
const SignupSchema = z.object({
  email: z.string()
    .email("A valid email address is required")
    .max(255, "Email is too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_JSON");
    }

    const validation = SignupSchema.safeParse(body);
    if (!validation.success) {
      return apiError("Invalid signup data", 400, "VALIDATION_ERROR", validation.error.flatten());
    }

    const email = validation.data.email.toLowerCase();
    const { password } = validation.data;

    // 2. Check existing user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, is_verified")
      .eq("email", email)
      .maybeSingle();

    const hashedPassword = await bcrypt.hash(password, 10);
    let userId = "";

    if (existingUser) {
      if (existingUser.is_verified) {
        return apiError("An account with this email already exists.", 400, "USER_ALREADY_EXISTS");
      }
      
      // If unverified, update their password so they can continue where they left off
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: hashedPassword })
        .eq("id", existingUser.id);

      if (updateError) {
        return apiError("Failed to update unverified account.", 500, "DB_UPDATE_ERROR");
      }
      userId = existingUser.id;
    } else {
      // 4. Insert user with is_verified: false (requires OTP verification before login)
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            id: randomUUID(),
            email,
            password_hash: hashedPassword,
            is_onboarded: false,
            is_verified: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("User insert error:", error);
        return apiError("Failed to create account. Please try again.", 500, "DB_INSERT_ERROR");
      }
      userId = data.id;
    }

    // 5. Auto-trigger OTP email for email verification using internal utility
    try {
      await sendOtpInternal(email, "SIGNUP");
    } catch (otpErr) {
      console.error("OTP send failed (non-critical):", otpErr);
      // Do not block signup if OTP email fails; user can resend
    }

    // Return step:'verify' so the frontend shows the OTP screen
    return apiSuccess({
      message: "Account created! Please check your email for the verification code.",
      step: "verify",
      email: email,
    }, 201);

  } catch (error: unknown) {
    console.error("Signup error:", error);
    return apiError("Server error. Please try again.", 500, "INTERNAL_SERVER_ERROR");
  }
}
