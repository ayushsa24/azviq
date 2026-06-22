/**
 * POST /api/payments/verify
 *
 * Verifies Razorpay payment signature after the user completes UPI payment.
 * This is the MOST CRITICAL security step — prevents fake payment notifications.
 *
 * How it works:
 * 1. Razorpay sends razorpay_order_id + razorpay_payment_id + razorpay_signature
 * 2. We compute our own HMAC-SHA256 signature using our SECRET KEY
 * 3. If signatures match → Payment is genuine → Update user plan in Supabase
 * 4. If signatures don't match → Reject immediately (could be a hack attempt)
 *
 * Security: A user CANNOT fake a successful payment because they don't have
 * your RAZORPAY_KEY_SECRET. Only Razorpay's servers can generate the correct signature.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import { sendUpgradeEmail } from "@/lib/auth-utils";

// ---------------------------------------------------------------------------
// Plan Configuration
// ---------------------------------------------------------------------------

const PLAN_DURATIONS_DAYS: Record<string, number> = {
  lite: 30,
  premium: 30,
};

const PLAN_TIERS: Record<string, number> = {
  lite: 1,
  premium: 2,
};

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 2. Parse payment data from Razorpay checkout
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json(
        { error: "Missing payment verification data." },
        { status: 400 }
      );
    }

    if (!PLAN_TIERS[plan]) {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    // 3. ✅ SECURITY: Verify HMAC-SHA256 signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay key secret not configured.");
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // ❌ SIGNATURE MISMATCH — This is a potential hack attempt. Reject it.
      console.error("[payments/verify] Signature mismatch! Possible fraud attempt.", {
        userEmail: session.user.email,
        razorpay_order_id,
      });
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // 4. ✅ Payment is genuine — find the user in Supabase
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 5. Calculate plan expiry (30 days from now)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + PLAN_DURATIONS_DAYS[plan]);

    // 6. Update user's subscription in Supabase
    const { error: updateError } = await supabase
      .from("users")
      .update({
        plan_tier: PLAN_TIERS[plan],
        plan_expiry: expiry.toISOString(),
        razorpay_payment_id,
        razorpay_order_id,
      })
      .eq("id", dbUser.id);

    if (updateError) {
      console.error("[payments/verify] Failed to update user plan:", updateError);
      return NextResponse.json(
        { error: "Payment verified but plan update failed. Contact support." },
        { status: 500 }
      );
    }

    // Send upgrade email in background
    try {
      await sendUpgradeEmail(session.user.email, plan, expiry);
    } catch (emailErr) {
      console.error("[payments/verify] Failed to send upgrade email:", emailErr);
    }

    console.log(`[payments/verify] ✅ Plan '${plan}' activated for ${session.user.email} until ${expiry.toISOString()}`);

    return NextResponse.json({
      success: true,
      plan,
      planExpiry: expiry.toISOString(),
      message: `Your ${plan === "lite" ? "Lite" : "Premium"} plan is now active until ${expiry.toLocaleDateString("en-IN")}.`,
    });
  } catch (err: any) {
    console.error("[payments/verify]", err);
    return NextResponse.json(
      { error: "Payment verification failed. Please contact support." },
      { status: 500 }
    );
  }
}
