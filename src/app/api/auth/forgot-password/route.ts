import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();

    // Security: Returning specific error as per user request for better UX
    if (!user || userError) {
      return NextResponse.json({ error: "Account not found. Please sign up first." }, { status: 404 });
    }

    // 2. Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // 3. Insert token
    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: hashedToken,
        expires_at: expiresAt,
      });

    if (tokenError) {
      console.error("Token error:", tokenError);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }

    // 4. Send Email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
    
    await resend.emails.send({
      from: "Azviq <onboarding@resend.dev>", // Default Resend test email
      to: email,
      subject: "Reset your Azviq password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hi ${user.name || 'there'},</p>
          <p>You requested to reset your password. Click the button below to secure your account:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Reset Password</a>
          <p style="margin-top: 25px; font-size: 12px; color: #777;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
        </div>
      `,
    });

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
