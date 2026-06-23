/**
 * POST /api/webhook/razorpay
 *
 * Razorpay Webhook listener — a BACKUP payment confirmation layer.
 *
 * Why we need this:
 * - If the user's browser crashes after payment but before the /verify API is called,
 *   the plan would never be activated.
 * - Razorpay automatically sends a POST request to this webhook URL on payment success.
 * - This ensures EVERY successful payment activates the user's plan, even if the
 *   browser closed mid-flow.
 *
 * Security:
 * - Verifies Razorpay-Signature header using HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET.
 * - Rejects any request without a valid signature.
 *
 * Setup in Razorpay Dashboard:
 * 1. Go to Settings → Webhooks → Add New Webhook
 * 2. URL: https://your-domain.com/api/webhook/razorpay
 * 3. Secret: Same as RAZORPAY_WEBHOOK_SECRET in .env.local
 * 4. Events: Check "payment.captured"
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Plan Tier Mapping from amount (in paise)
// ---------------------------------------------------------------------------

const AMOUNT_TO_PLAN: Record<number, { tier: number; name: string }> = {
  14900: { tier: 1, name: "lite" },    // ₹149
  39900: { tier: 2, name: "premium" }, // ₹399
};

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. ✅ SECURITY: Verify webhook signature
    if (!webhookSecret || !signature) {
      console.error("[webhook/razorpay] Missing webhook secret or signature.");
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[webhook/razorpay] Invalid webhook signature — possible fake webhook.");
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    // 2. Parse the webhook payload
    const event = JSON.parse(rawBody);

    // 3. Only handle "payment.captured" events
    if (event.event !== "payment.captured") {
      // Acknowledge other events without processing
      return NextResponse.json({ received: true });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { id: paymentId, order_id: orderId, amount, notes } = payment;
    const userEmail = notes?.user_email;
    const plan = notes?.plan;

    if (!userEmail || !plan) {
      console.error("[webhook/razorpay] Missing user_email or plan in notes:", notes);
      return NextResponse.json({ error: "Missing user data in notes." }, { status: 400 });
    }

    // 4. Map amount to plan tier
    const planConfig = AMOUNT_TO_PLAN[amount];
    if (!planConfig) {
      console.error("[webhook/razorpay] Unknown amount:", amount);
      return NextResponse.json({ error: "Unknown plan amount." }, { status: 400 });
    }

    // 5. Fetch the user from Supabase
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, plan_tier, razorpay_payment_id")
      .eq("email", userEmail)
      .single();

    if (!dbUser) {
      console.error("[webhook/razorpay] User not found:", userEmail);
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 5b. Prevent Replay Attacks (Idempotency)
    if (dbUser.razorpay_payment_id === paymentId) {
      console.log(`[webhook/razorpay] ♻️ Payment ${paymentId} already processed for ${userEmail}. Ignoring replay.`);
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    // 6. Calculate expiry (30 days from now)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    // 7. Update user's plan in Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        plan_tier: planConfig.tier,
        plan_expiry: expiry.toISOString(),
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
      })
      .eq("id", dbUser.id);

    if (updateError) {
      console.error("[webhook/razorpay] Failed to update user plan:", updateError);
      return NextResponse.json({ error: "Plan update failed." }, { status: 500 });
    }

    console.log(`[webhook/razorpay] ✅ Plan '${planConfig.name}' activated for ${userEmail}`);

    // 8. Return 200 — Razorpay will stop retrying
    return NextResponse.json({ received: true, plan: planConfig.name });
  } catch (err: any) {
    console.error("[webhook/razorpay]", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
