"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPostHog } from "@/analytics/posthog";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const consent = localStorage.getItem("azviq-cookie-consent");
    if (!consent) {
      // Delay showing the banner slightly for a premium, deliberate entrance
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (consent === "declined") {
      // Ensure PostHog is opted out if they previously declined
      getPostHog().opt_out_capturing();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("azviq-cookie-consent", "accepted");
    getPostHog().opt_in_capturing();
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("azviq-cookie-consent", "declined");
    getPostHog().opt_out_capturing();
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-5 transform transition-all duration-500 ease-out animate-slide-up">
      <div className="flex flex-col gap-4">
        {/* Header / Icon */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#C2A27A]/10 text-[#C2A27A] dark:bg-[#C2A27A]/20 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Cookie Preferences</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              We use cookies to personalize your study experience, analyze traffic, and ensure site security. Read our{" "}
              <Link href="/privacy" className="underline hover:text-[#C2A27A] transition-colors">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleDecline}
            className="px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-[#C2A27A] hover:bg-[#b08f65] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98]"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
