import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export type OTPType = "SIGNUP" | "PASSWORD_RESET";

/**
 * Shared utility to generate, store, and send an OTP code.
 * This can be called from API routes directly to avoid internal fetch() calls.
 */
export async function sendOtpInternal(email: string, type: OTPType) {
  // 1. Cleanup old codes for this user+type
  await supabase
    .from("email_verifications")
    .delete()
    .eq("email", email.toLowerCase())
    .eq("type", type);

  // 2. Generate 6-digit OTP
  const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // 3. Store hashed OTP
  const { error: insertError } = await supabase
    .from("email_verifications")
    .insert({ 
      email: email.toLowerCase(), 
      code_hash: codeHash, 
      type, 
      expires_at: expiresAt, 
      attempts: 0 
    });

  if (insertError) {
    throw new Error(`Failed to store OTP: ${insertError.message}`);
  }

  // 4. Content configuration
  const subject = type === "SIGNUP"
    ? "Verify your Azviq account"
    : "Reset your Azviq password";

  const heading = type === "SIGNUP"
    ? "Email Verification Code"
    : "Password Reset Code";

  const description = type === "SIGNUP"
    ? "Use the code below to verify your email and complete your account setup."
    : "Use the code below to reset your password.";

  // 5. Send via Resend
  await resend.emails.send({
    from: "Azviq <onboarding@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f0f0f; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${heading}</h1>
          <p style="color: #888; font-size: 14px; margin-top: 8px;">${description}</p>
        </div>
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: #666; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 16px;">Your verification code</p>
          <span style="font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #ffffff; font-variant-numeric: tabular-nums;">${rawCode}</span>
        </div>
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">This code expires in <strong style="color: #999;">10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { success: true };
}
