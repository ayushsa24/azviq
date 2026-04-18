/**
 * Subscription Guard — Server-side plan tier enforcement.
 *
 * This is the SINGLE SOURCE OF TRUTH for all subscription checks.
 * Every protected API route calls `getSubscriptionStatus()` before processing.
 *
 * Security: All checks are server-side only. No client-side trust.
 * A user cannot bypass limits by modifying localStorage, headers, or DevTools.
 */

import { supabase } from "@/lib/supabase";
import { AIModel, LITE_MODELS, PREMIUM_MODELS } from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PLAN_TIER = {
  FREE: 0,
  LITE: 1,
  PREMIUM: 2,
} as const;

export type PlanTier = (typeof PLAN_TIER)[keyof typeof PLAN_TIER];

// Models imported from types.ts — single source of truth
// LITE_MODELS and PREMIUM_MODELS are defined in @/lib/ai/types

/** Daily limits per tier — tracked independently per type in Redis */
export const DAILY_LIMITS = {
  chat: { [PLAN_TIER.FREE]: 40, [PLAN_TIER.LITE]: 200, [PLAN_TIER.PREMIUM]: Infinity },
  vision: { [PLAN_TIER.FREE]: 15, [PLAN_TIER.LITE]: 50, [PLAN_TIER.PREMIUM]: Infinity },
  exercise: { [PLAN_TIER.FREE]: 10, [PLAN_TIER.LITE]: 50, [PLAN_TIER.PREMIUM]: Infinity },
  personal_ai: { [PLAN_TIER.FREE]: 30, [PLAN_TIER.LITE]: 100, [PLAN_TIER.PREMIUM]: Infinity },
  note_ai: { [PLAN_TIER.FREE]: 30, [PLAN_TIER.LITE]: 100, [PLAN_TIER.PREMIUM]: Infinity },
} as const;

/** PDF upload size limits per tier (in bytes) */
export const PDF_SIZE_LIMITS = {
  [PLAN_TIER.FREE]: 4 * 1024 * 1024,   // 4 MB
  [PLAN_TIER.LITE]: 10 * 1024 * 1024,  // 10 MB
  [PLAN_TIER.PREMIUM]: 50 * 1024 * 1024, // 50 MB
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionStatus {
  /** Current plan tier (0=Free, 1=Lite, 2=Premium) */
  tier: PlanTier;
  /** When the plan expires. null = Free forever */
  planExpiry: Date | null;
  /** Whether the plan is currently active (not expired) */
  isActive: boolean;
}

export interface TierCheckResult {
  allowed: boolean;
  error?: string;
  tier: PlanTier;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Fetches subscription status for a user by their email.
 * Automatically treats expired plans as Free tier.
 */
export async function getSubscriptionStatus(
  userEmail: string
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from("users")
    .select("plan_tier, plan_expiry")
    .eq("email", userEmail)
    .single();

  // Default to Free if DB error or user not found
  if (error || !data) {
    return { tier: PLAN_TIER.FREE, planExpiry: null, isActive: true };
  }

  const tier = (data.plan_tier ?? PLAN_TIER.FREE) as PlanTier;
  const planExpiry = data.plan_expiry ? new Date(data.plan_expiry) : null;

  // Auto-downgrade: if plan has expired, treat as Free
  const isActive = planExpiry ? planExpiry > new Date() : true;
  const effectiveTier: PlanTier = isActive ? tier : PLAN_TIER.FREE;

  return {
    tier: effectiveTier,
    planExpiry,
    isActive,
  };
}

/**
 * Checks if a user's tier allows them to use a specific AI model.
 * Call this before routing to any AI provider.
 */
export function checkModelAccess(
  model: AIModel,
  tier: PlanTier
): TierCheckResult {
  if (PREMIUM_MODELS.includes(model) && tier < PLAN_TIER.PREMIUM) {
    return {
      allowed: false,
      tier,
      error: "This model requires the Premium plan. Please upgrade to access GPT-4o and Claude 3.5.",
    };
  }

  if (LITE_MODELS.includes(model) && tier < PLAN_TIER.LITE) {
    return {
      allowed: false,
      tier,
      error: "This model requires the Lite (Academic) plan. Please upgrade to access GPT-4o Mini.",
    };
  }

  return { allowed: true, tier };
}

/**
 * Checks if a user's tier allows a given PDF file size.
 */
export function checkPdfSizeAccess(
  fileSizeBytes: number,
  tier: PlanTier
): TierCheckResult {
  const limit = PDF_SIZE_LIMITS[tier];
  if (fileSizeBytes > limit) {
    const limitMB = limit / (1024 * 1024);
    return {
      allowed: false,
      tier,
      error: `Your plan only supports PDF files up to ${limitMB}MB. Please upgrade to upload larger files.`,
    };
  }
  return { allowed: true, tier };
}
