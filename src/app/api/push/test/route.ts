import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/**
 * TEST ONLY ROUTE — bypasses Upstash and directly fires a push notification.
 * Call this to verify your Service Worker + VAPID setup is working.
 * DELETE this file before going to production.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", session.user.email)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      error: "No push subscriptions found. Enable notifications in Settings → Notifications first.",
    }, { status: 400 });
  }

  const payload = JSON.stringify({
    title: "⏰ Azviq Test Reminder",
    body: "✅ Push notifications are working! This is a test from your Todo system.",
    icon: "/icons/icon-192x192.png",
    data: { url: "/dashboard", todoId: "test" },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    message: `Test notification sent to ${succeeded} device(s). ${failed} failed.`,
    subscriptions: subscriptions.length,
  });
}
