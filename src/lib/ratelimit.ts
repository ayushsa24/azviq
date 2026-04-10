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

export type RequestType = "chat" | "vision" | "exercise" | "personal_ai";

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests for today */
  remaining: number;
  /** Reset time as Unix timestamp (ms) */
  reset: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core Function
// ---------------------------------------------------------------------------

/**
 * Check if a user has exceeded their daily request limit for a given type.
 * Uses Upstash Redis with a 24-hour sliding window.
 *
 * @param type - The type of request: "chat" | "vision" | "exercise"
 * @param userId - Unique user ID from Supabase
 * @param tier - User's current plan tier (0=Free, 1=Lite, 2=Premium)
 */
export async function checkRateLimit(
  type: RequestType,
  userId: string,
  tier: PlanTier
): Promise<RateLimitResult> {
  // Premium users are unlimited — skip Redis entirely
  const limit = DAILY_LIMITS[type][tier];
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, reset: 0 };
  }

  const client = getRedis();

  // If Redis is not configured, allow all requests (fail open during dev)
  if (!client) {
    return { allowed: true, remaining: limit, reset: 0 };
  }

  // Create a rate limiter for this specific type + limit combo
  const ratelimiter = new Ratelimit({
    redis: client,
    // Fixed window: `limit` requests per 24 hours
    limiter: Ratelimit.fixedWindow(limit, "24 h"),
    // Each user+type gets its own key
    prefix: `avyx:rl:${type}`,
  });

  const { success, remaining, reset } = await ratelimiter.limit(userId);

  if (!success) {
    const resetDate = new Date(reset);
    const hoursUntilReset = Math.ceil((reset - Date.now()) / 1000 / 60 / 60);
    return {
      allowed: false,
      remaining: 0,
      reset,
      error: `Daily ${type} limit reached. You have used all ${limit} requests for today. Resets in ~${hoursUntilReset}h (at ${resetDate.toLocaleTimeString()}).`,
    };
  }

  return { allowed: true, remaining, reset };
}

/**
 * Get current usage without incrementing the counter.
 * Uses the official Upstash Ratelimit getRemaining() API.
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
    // Redis not configured — return full quota so UI shows correctly in dev
    return { remaining: limit, limit: limit, reset: 0 };
  }

  try {
    const ratelimiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.fixedWindow(limit, "24 h"),
      prefix: `avyx:rl:${type}`,
    });

    // getRemaining() reads current state WITHOUT incrementing the counter
    const { remaining, reset } = await ratelimiter.getRemaining(userId);

    // Calculate the next window reset time (ms)
    const windowDuration = 24 * 60 * 60 * 1000;
    const windowId = Math.floor(Date.now() / windowDuration);
    const resetMs = reset > 0 ? reset : (windowId + 1) * windowDuration;

    return { remaining: Math.max(0, remaining), limit, reset: resetMs };
  } catch (e) {
    console.error("[getUsage]", e);
    return { remaining: limit, limit: limit, reset: 0 };
  }
}
