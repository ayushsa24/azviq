import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { Receiver } from "@upstash/qstash";

/**
 * Simple one-shot handler called by QStash at the scheduled time.
 * No @upstash/workflow SDK — just a plain POST that fires and finishes.
 */
export async function POST(req: NextRequest) {
  // Configure web-push with VAPID keys
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
  });

  try {
    const signature = req.headers.get("Upstash-Signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    
    const rawBody = await req.text();
    const isValid = await receiver.verify({
      signature,
      body: rawBody,
    }).catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { todoId, userId, title, note } = body as {
      todoId: string;
      userId: string;
      title: string;
      note?: string;
    };

    if (!todoId || !userId) {
      return NextResponse.json({ error: "Missing todoId or userId" }, { status: 400 });
    }

    console.info(`[Reminder] Firing for Todo: ${todoId} (user: ${userId})`);

    // 1. Verify the todo still exists and is not done
    const { data: todo } = await supabase
      .from("todos")
      .select("id, done, title")
      .eq("id", todoId)
      .maybeSingle();

    if (!todo) {
      console.info(`[Reminder] Todo ${todoId} not found — skipping.`);
      return NextResponse.json({ skipped: "todo_not_found" });
    }

    if (todo.done) {
      console.info(`[Reminder] Todo ${todoId} already done — skipping.`);
      return NextResponse.json({ skipped: "already_done" });
    }

    // 2. Get all push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subscriptions || subscriptions.length === 0) {
      console.info(`[Reminder] No push subscriptions for user ${userId} — skipping.`);
      return NextResponse.json({ skipped: "no_subscriptions" });
    }

    // 3. Send push notifications to all user devices
    const payload = JSON.stringify({
      title: "⏰ Azviq Reminder",
      body: title,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: { url: "/dashboard", todoId, note: note || "" },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    // 4. Clean up expired/invalid subscriptions (410 Gone = device unsubscribed)
    const deadEndpoints: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          deadEndpoints.push(subscriptions[i].endpoint);
        }
      }
    });

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
      console.info(`[Reminder] Cleaned up ${deadEndpoints.length} expired subscription(s).`);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    console.info(`[Reminder] Sent ${sent}/${subscriptions.length} notification(s) for Todo: ${todoId}`);

    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (err) {
    console.error("[Reminder] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
