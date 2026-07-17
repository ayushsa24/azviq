/**
 * POST /api/payments/create-order
 *
 * Creates a Razorpay Order when the user clicks "Pay Now".
 * Returns the order_id and amount to the frontend to open the checkout popup.
 *
 * Security:
 * - User must be authenticated (NextAuth session).
 * - Plan type is validated server-side.
 * - Amount is NEVER trusted from the client — it comes from our constants here.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Razorpay from "razorpay";

// ---------------------------------------------------------------------------
// Plan Pricing — NEVER receive amount from client
// ---------------------------------------------------------------------------

const PLAN_PRICES: Record<string, number> = {
  lite: 9900,       // ₹99 in paise (Razorpay uses smallest currency unit)
  premium: 24900,   // ₹249 in paise
};

const PLAN_NAMES: Record<string, string> = {
  lite: "Azviq Lite — Academic Essential (1 Month)",
  premium: "Azviq Premium — Pro Researcher (1 Month)",
};

// ---------------------------------------------------------------------------
// Razorpay Client
// ---------------------------------------------------------------------------

function getRazorpay(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys not configured in environment variables.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // 1. Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Parse and validate the plan from request body
    const body = await req.json();
    const plan = body?.plan as string;

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json(
        { error: "Invalid plan. Choose 'lite' or 'premium'." },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[plan];

    // 3. Create Razorpay Order on the server
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `azviq_${plan}_${Date.now()}`,
      notes: {
        user_email: session.user.email,
        plan,
      },
    });

    // 4. Return order details to the frontend (safe to expose)
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: PLAN_NAMES[plan],
      keyId: process.env.RAZORPAY_KEY_ID, // Public key is safe to expose
    });
  } catch (err: any) {
    console.error("[payments/create-order]", err);
    return NextResponse.json(
      { error: "Failed to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
