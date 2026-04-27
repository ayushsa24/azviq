import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis only if env vars are present (prevents crashes before setup)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

// Tier 1: AI & Expensive (Increased for better user flow)
const aiRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(180, "1 m"),
    analytics: true,
}) : null;

// Tier 2: Auth & Sensitive (Relaxed to avoid lockout)
const authRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
}) : null;

// Tier 3: Standard APIs (Moderate)
const standardRateLimit = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(150, "1 m"),
    analytics: true,
}) : null;

// The original next-auth middleware
const authMiddleware = withAuth({
    pages: {
        signIn: "/login",
    },
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
    const path = req.nextUrl.pathname;

    // --- 1. Edge Rate Limiting for APIs ---
    if (path.startsWith("/api")) {
        // If Redis is not configured yet, bypass rate limiting to prevent crashes
        if (!redis) return NextResponse.next();

        // Get Client IP (Vercel provides x-forwarded-for, local provides req.ip)
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1";
        let limitResult;

        try {
            if ((path.startsWith("/api/ai") || path.startsWith("/api/chat") || path.startsWith("/api/summarize")) && !path.startsWith("/api/chat/history")) {
                limitResult = await aiRateLimit?.limit(ip);
            } else if (path.startsWith("/api/signup") || path.startsWith("/api/profile") || path.includes("/api/auth/callback") || path.includes("/api/auth/signin")) {
                limitResult = await authRateLimit?.limit(ip);
            } else {
                limitResult = await standardRateLimit?.limit(ip);
            }

            if (limitResult && !limitResult.success) {
                // Return a clean JSON 429 response
                return NextResponse.json(
                    {
                        success: false,
                        error: {
                            message: "Too many requests. Please try again later.",
                            code: "RATE_LIMIT_EXCEEDED"
                        }
                    },
                    { status: 429 }
                );
            }
        } catch (error) {
            console.error("[Middleware] Rate limit error:", error);
            // Fail open: if Redis is momentarily down, do not block users from using the app
        }

        // Return next() so API routes can handle their own execution
        return NextResponse.next();
    }

    // --- 2. Auth Protection for Pages ---
    // Defer to next-auth for standard page routes
    return (authMiddleware as import("next/server").NextMiddleware)(req, event);
}

export const config = {
    matcher: [
        "/",
        "/dashboard",
        "/dashboard/:path*",
        "/library/:path*",
        "/ai/:path*",
        "/tasks/:path*",
        "/settings/:path*",
        "/onboarding/:path*",
        "/api/:path*", // Added standard APIs to the middleware matcher so they get rate limited
        // Share pages are public — they must NOT be in the auth matcher
        // so they are intentionally excluded here
    ],
};
