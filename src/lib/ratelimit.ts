/**
 * Rate Limiter — Server-side daily usage counter using Upstash Redis.
 *
 * Each request type (chat, vision, exercise) is tracked separately per user.
 * Limits reset every 24 hours (sliding window).
 *
 * Security: Redis runs on Upstash servers. No user can modify their counter
 * from their browser, DevTools, or laptop. The 429 error is enforced here.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { DAILY_LIMITS, PlanTier } from "@/lib/subscription";

// ---------------------------------------------------------------------------
// Redis Client
// ---------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Redis not configured yet — rate limiting is disabled. Log a warning.
    console.warn("[RateLimit] Upstash Redis not configured. Rate limiting is DISABLED.");
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RequestType = "chat" | "vision" | "exercise" | "personal_ai" | "note_ai";

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests for today */
  remaining: number;
  /** Reset time as Unix timestamp (ms) */
  reset: number;
  error?: string;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the current date string in IST (Asia/Kolkata) timezone.
 * Format: YYYY-MM-DD
 */
function getISTDateKey(): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now);
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Calculate the absolute Unix timestamp (ms) for the next 12:00 AM IST.
 */
function getNextISTMidnight(): number {
  try {
    const now = new Date();
    // Get current time in IST string
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istNow = new Date(istString);
    
    // Create "Tomorrow 00:00:00" in IST context
    const tomorrowIST = new Date(istNow);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);
    tomorrowIST.setHours(0, 0, 0, 0);
    
    // Calculate the difference between the local-context date and the real 'now'
    // to get the absolute UTC timestamp for that IST moment.
    const diffToMidnight = tomorrowIST.getTime() - istNow.getTime();
    return now.getTime() + diffToMidnight;
  } catch (e) {
    // Fallback: 24h from now
    return Date.now() + (24 * 60 * 60 * 1000);
  }
}

// ---------------------------------------------------------------------------
// Core Function
// ---------------------------------------------------------------------------

/**
 * Check if a user has exceeded their daily request limit for a given type.
 * Uses Upstash Redis with a fixed daily window synchronized to IST midnight.
 */
export async function checkRateLimit(
  type: RequestType,
  userId: string,
  tier: PlanTier
): Promise<RateLimitResult> {
  const limit = DAILY_LIMITS[type][tier];
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, reset: 0 };
  }

  const client = getRedis();
  if (!client) {
    return { allowed: true, remaining: limit, reset: 0 };
  }

  const istDate = getISTDateKey();
  
  // Each day gets a unique key, effectively resetting at 12 AM IST.
  // We use a 24h window for internal Upstash counting, but the key rotation 
  // is what provides the hard reset at midnight.
  const ratelimiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.fixedWindow(limit, "24 h"),
    prefix: `azviq:rl:${type}:${istDate}`,
  });

  const { success, remaining } = await ratelimiter.limit(userId);
  const reset = getNextISTMidnight();

  if (!success) {
    return {
      allowed: false,
      remaining: 0,
      reset,
      error: `Daily limit reached for ${type}. This quota resets at 12 AM IST. Please wait until tomorrow or upgrade your plan.`,
    };
  }

  return { allowed: true, remaining, reset };
}

/**
 * Get current usage without incrementing the counter.
 */
export async function getUsage(
  type: RequestType,
  userId: string,
  tier: PlanTier
): Promise<{ remaining: number; limit: number; reset: number }> {
  const limit = DAILY_LIMITS[type][tier];
  if (limit === Infinity) {
    return { remaining: Infinity, limit: Infinity, reset: 0 };
  }

  const client = getRedis();
  if (!client) {
    return { remaining: limit, limit: limit, reset: 0 };
  }

  try {
    const istDate = getISTDateKey();
    const ratelimiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.fixedWindow(limit, "24 h"),
      prefix: `azviq:rl:${type}:${istDate}`,
    });

    const { remaining } = await ratelimiter.getRemaining(userId);
    const reset = getNextISTMidnight();

    return { remaining: Math.max(0, remaining), limit, reset };
  } catch (e) {
    console.error("[getUsage]", e);
    return { remaining: limit, limit: limit, reset: 0 };
  }
}
