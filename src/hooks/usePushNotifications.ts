"use client";

import { useEffect, useCallback } from "react";

/**
 * Converts a VAPID public key string to a Uint8Array
 * (required format for pushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  // Register the service worker on mount
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("[SW] Registered:", reg.scope))
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, [isSupported]);

  /**
   * Request notification permission, subscribe, and save to DB.
   * Returns 'granted' | 'denied' | 'unsupported'
   */
  const subscribe = useCallback(async (): Promise<"granted" | "denied" | "unsupported"> => {
    if (!isSupported) return "unsupported";

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidKey) {
      console.error("[Push] VAPID public key not set.");
      return "denied";
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
    });

    // Save to our DB
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON()),
    });

    return "granted";
  }, [isSupported]);

  /**
   * Unsubscribe from push notifications and remove from DB.
   */
  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
  }, [isSupported]);

  /**
   * Check current permission status without prompting.
   */
  const getPermissionStatus = useCallback(async (): Promise<NotificationPermission | "unsupported"> => {
    if (!isSupported || typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  }, [isSupported]);

  return { subscribe, unsubscribe, getPermissionStatus, isSupported };
}
