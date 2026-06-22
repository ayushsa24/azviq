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

export async function sendWelcomeEmail(email: string) {
  const subject = "Welcome to Azviq - Your AI-Powered Study Workspace";

  await resend.emails.send({
    from: "Azviq <onboarding@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f0f0f; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Welcome to Azviq! 🎉</h1>
          <p style="color: #888; font-size: 15px; margin-top: 12px; line-height: 1.5;">We're thrilled to have you here. Azviq is designed to elevate your learning journey using the power of AI.</p>
        </div>
        
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 700; margin: 0 0 16px; color: #fff;">Getting Started</h2>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #fff; font-size: 14px;">1. Create a Workspace</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888; line-height: 1.4;">Organize your subjects into dedicated workspaces for a cleaner study environment.</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #fff; font-size: 14px;">2. Upload Resources</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888; line-height: 1.4;">Add your PDFs and notes. Our AI will automatically analyze them to help you study smarter.</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #fff; font-size: 14px;">3. Generate Exercises</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888; line-height: 1.4;">Test your knowledge instantly with AI-generated mock tests and flashcards.</p>
          </div>
          
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #fff; font-size: 14px;">4. Revise Intelligently</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888; line-height: 1.4;">Create structured revision plans summarizing your notes and extracting key concepts automatically.</p>
          </div>
          
          <div>
            <p style="margin: 0; font-weight: 600; color: #fff; font-size: 14px;">5. Chat with the AI Teacher</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #888; line-height: 1.4;">Discuss your notes directly with our AI Teacher. Ask questions and get real-time explanations.</p>
          </div>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">If you have any questions or need help, just reply to this email.</p>
      </div>
    `,
  });
}



export async function sendUpgradeEmail(email: string, plan: string, expiry: Date) {
  const subject = `Your Azviq ${plan === "lite" ? "Lite" : "Premium"} Plan is Active!`;

  await resend.emails.send({
    from: "Azviq <billing@resend.dev>",
    to: email,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0f0f0f; color: #ffffff; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Upgrade Successful! 🚀</h1>
          <p style="color: #888; font-size: 15px; margin-top: 12px; line-height: 1.5;">Thank you for upgrading. Your account has been upgraded to the <strong>${plan === "lite" ? "Lite" : "Premium"}</strong> plan.</p>
        </div>
        
        <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h2 style="font-size: 14px; font-weight: 700; margin: 0 0 8px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Plan Details</h2>
          <p style="margin: 0; font-size: 24px; font-weight: 900; color: #fff;">${plan === "lite" ? "Lite" : "Premium"}</p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #888;">Valid until: <strong style="color: #fff;">${expiry.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></p>
        </div>
        
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 16px; color: #fff;">Enjoy Your New Features:</h3>
          <ul style="color: #888; font-size: 14px; line-height: 1.6; padding-left: 20px;">
            <li>Increased AI Chat & Note Editor requests</li>
            <li>Higher PDF upload limits</li>
            <li>Advanced exercise generations</li>
            ${plan === "premium" ? "<li>Priority customer support</li><li>Early access to new features</li>" : ""}
          </ul>
        </div>
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">If you have any questions about your billing or plan, reply to this email.</p>
      </div>
    `,
  });
}

