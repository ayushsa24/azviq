import { NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";

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

    const { email, password } = validation.data;

    // 2. Check existing user
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return apiError("An account with this email already exists.", 400, "USER_ALREADY_EXISTS");
    }

    // 3. Hash password and create Supabase Auth user
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL}/onboarding`,
      }
    });

    if (authError) {
      return apiError(authError.message, 400, "AUTH_SIGNUP_ERROR");
    }

    // 4. Insert into public.users
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id: authData.user?.id || randomUUID(),
          email,
          password_hash: hashedPassword,
          is_onboarded: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("User insert error:", error);
      return apiError("Failed to create account. Please try again.", 500, "DB_INSERT_ERROR");
    }

    return apiSuccess({
      message: "Check your email for a confirmation link!",
      user: { id: data.id, email: data.email },
    }, 201);

  } catch (error: unknown) {
    console.error("Signup error:", error);
    return apiError("Server error. Please try again.", 500, "INTERNAL_SERVER_ERROR");
  }
}
