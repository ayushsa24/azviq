import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// If variables are missing, we mock the ratelimit so the app doesn't crash locally
const isUpstashConfigured = 
    process.env.UPSTASH_REDIS_REST_URL && 
    process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = isUpstashConfigured 
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })
    : null;

// AI Daily Quota: 200 requests per 24 hours per user
export const aiDailyRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(200, "24h"),
        analytics: true,
        // Optional prefix for keys in Redis
        prefix: "@upstash/ratelimit/ai-daily-user-quota",
      })
    : null;

/**
 * Checks if the user has exceeded their daily AI quota.
 * @param userId - The ID of the authenticated user
 * @returns An object containing { success, remaining }
 */
export async function checkAiDailyQuota(userId: string) {
    if (!aiDailyRateLimit) {
        // Fail-Closed: Protect billing if Redis is not configured
        console.error("AI Daily Rate Limit is not configured.");
        return { success: false, remaining: 0 };
    }

    try {
        const result = await aiDailyRateLimit.limit(`ai_usage:${userId}`);
        return { success: result.success, remaining: result.remaining };
    } catch (error) {
        console.error("AI Daily Quota Check Failed (Redis Error):", error);
        // Fail-Closed: Protect billing if Redis crashes temporarily
        return { success: false, remaining: 0 };
    }
}
