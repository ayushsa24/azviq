/**
 * GET /api/user/subscription
 *
 * Returns the authenticated user's current subscription status.
 * Used by SettingsModal and PricingModal to show plan info.
 *
 * Returns:
 * - plan_tier: 0 | 1 | 2
 * - plan_expiry: ISO string or null
 * - is_active: boolean
 * - days_remaining: number or null
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSubscriptionStatus, PLAN_TIER } from "@/lib/subscription";
import { getUsage } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

const PLAN_NAMES = {
  [PLAN_TIER.FREE]: "Free (Starter)",
  [PLAN_TIER.LITE]: "Lite (Academic Essential)",
  [PLAN_TIER.PREMIUM]: "Premium (Pro Researcher)",
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const status = await getSubscriptionStatus(session.user.email);
    
    // Get user ID from session (set by auth.ts jwt callback — no DB round-trip needed)
    const userId = (session.user as { id: string }).id;

    let usage = null;
    if (userId) {
      const [chatUsage, visionUsage, exerciseUsage, personalAiUsage, noteAiUsage] = await Promise.all([
        getUsage("chat", userId, status.tier),
        getUsage("vision", userId, status.tier),
        getUsage("exercise", userId, status.tier),
        getUsage("personal_ai", userId, status.tier),
        getUsage("note_ai", userId, status.tier),
      ]);
      usage = {
        chat: chatUsage,
        vision: visionUsage,
        exercise: exerciseUsage,
        personal_ai: personalAiUsage,
        note_ai: noteAiUsage,
      };
    }

    let daysRemaining: number | null = null;
    if (status.planExpiry && status.isActive) {
      const diff = status.planExpiry.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      plan_tier: status.tier,
      plan_name: PLAN_NAMES[status.tier],
      plan_expiry: status.planExpiry?.toISOString() ?? null,
      is_active: status.isActive,
      days_remaining: daysRemaining,
      usage,
    });
  } catch (err) {
    console.error("[user/subscription GET]", err);
    return NextResponse.json({ error: "Failed to fetch subscription." }, { status: 500 });
  }
}
