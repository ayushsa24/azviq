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
 * Implementation: Adds 5.5 hours to UTC time to find the IST day.
 */
function getISTDateKey(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split("T")[0];
}

/**
 * Calculate the absolute Unix timestamp (ms) for the next 12:00 AM IST.
 */
function getNextISTMidnight(): number {
  const now = new Date();
  const istNow = new Date(now.getTime() + (5.5 * 3600000));
  
  const tomorrowIST = new Date(istNow);
  tomorrowIST.setUTCDate(tomorrowIST.getUTCDate() + 1);
  tomorrowIST.setUTCHours(0, 0, 0, 0);
  
  const diff = tomorrowIST.getTime() - istNow.getTime();
  return now.getTime() + diff;
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
  
  // Each day gets a unique key prefix, effectively resetting at 12 AM IST.
  const ratelimiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.fixedWindow(limit, "24 h"),
    prefix: `azviq:rl:${type}:${istDate}`,
  });

  const { success, remaining } = await ratelimiter.limit(userId);
  const reset = getNextISTMidnight();

  console.log(`[RateLimit] Checking ${type} for user ${userId.substring(0, 8)}... Date: ${istDate} | Remaining: ${remaining} | Allowed: ${success}`);

  if (!success) {
    return {
      allowed: false,
      remaining: 0,
      reset,
      error: "Daily AI quota reached. Please upgrade or try again tomorrow.",
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
