"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { X, Crown, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
}

interface SubscriptionStatus {
  plan_tier: 0 | 1 | 2;
  plan_name: string;
  plan_expiry: string | null;
  is_active: boolean;
  days_remaining: number | null;
}

// ---------------------------------------------------------------------------
// Plan Data
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: "free",
    name: "Free",
    subtitle: "Starter",
    price: "₹0",
    period: "Always free",
    tier: 0,
    features: [
      "40 AI chats / day",
      "30 AI Teacher messages / day",
      "30 Note Editor AI requests / day",
      "15 vision / image requests / day",
      "10 exercise generations / day",
      "Gemini 2.5 Flash (Fast)",
      "PDF upload up to 4 MB",
      "Standard response speed",
      "No ads",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "lite",
    name: "Lite",
    subtitle: "Academic Essential",
    price: "₹149",
    period: "/ month",
    tier: 1,
    badge: "Most Popular",
    features: [
      "200 AI chats / day",
      "100 AI Teacher messages / day",
      "100 Note Editor AI requests / day",
      "50 vision / image requests / day",
      "50 exercise generations / day",
      "GPT-4o Mini (High Quality)",
      "PDF upload up to 10 MB",
      "High priority response speed",
      "No ads",
    ],
    cta: "Upgrade to Lite",
    highlight: false,
  },
  {
    id: "premium",
    name: "Premium",
    subtitle: "Pro Researcher",
    price: "₹399",
    period: "/ month",
    tier: 2,
    badge: "Best Value",
    features: [
      "Unlimited AI chats",
      "Unlimited AI Teacher & Note AI",
      "Unlimited vision / image requests",
      "Unlimited exercise generations",
      "GPT-4o + Claude 3.5 Sonnet (The Best)",
      "PDF upload up to 50 MB",
      "Turbo response speed",
      "No ads + Beta features",
    ],
    cta: "Upgrade to Premium",
    highlight: true,
  },
];

// ---------------------------------------------------------------------------
// Razorpay Helper
// ---------------------------------------------------------------------------

declare global {
  interface Window { Razorpay: any; }
}

async function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PricingModal({ open, onClose }: PricingModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      fetch("/api/user/subscription")
        .then((r) => r.json())
        .then(setSubscription)
        .catch(console.error);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleUpgrade = async (planId: "lite" | "premium") => {
    setLoadingPlan(planId);
    setPaymentError(null);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError("Could not load payment gateway. Please check your internet connection.");
        setLoadingPlan(null);
        return;
      }

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setPaymentError(orderData.error || "Failed to create order.");
        setLoadingPlan(null);
        return;
      }

      const { orderId, amount, currency, planName, keyId } = orderData;

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Azviq",
        description: planName,
        image: "/azviq_logo.png",
        theme: { color: "#C2A27A" },
        handler: async (response: any) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setPaymentSuccess(verifyData.message || "Your plan is now active!");
            const newStatus = await fetch("/api/user/subscription").then((r) => r.json());
            setSubscription(newStatus);
          } else {
            setPaymentError(verifyData.error || "Payment verification failed. Contact support.");
          }
          setLoadingPlan(null);
        },
        modal: { ondismiss: () => setLoadingPlan(null) },
      });
      rzp.open();
    } catch {
      setPaymentError("Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  };

  const currentTier = subscription?.plan_tier ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Modal / Sheet Container */}
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(_, info) => {
              if (isMobile && (info.offset.y > 150 || info.velocity.y > 600)) {
                onClose();
              }
            }}
            className={`relative w-full ${isMobile ? 'h-[92dvh] pt-2' : 'max-w-5xl max-h-[90vh]'} overflow-hidden rounded-t-[20px] sm:rounded-2xl border shadow-2xl flex flex-col
              ${isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-white border-[#E8E5E0]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            {isMobile && (
              <div className="w-full flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between px-6 pt-2 sm:pt-5 pb-4 border-b flex-shrink-0 backdrop-blur-[2px]
              ${isDark ? "bg-[#1A1A1A]/90 border-[#2E2E2E]" : "bg-white/90 border-[#E8E5E0]"}`}
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (!isMobile) return;
                const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                if (deltaY > 60) {
                  onClose();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center
                  ${isDark ? "bg-[#2E2E2E]" : "bg-[#F0EDE8]"}`}>
                  <Crown className="w-4 h-4 text-[#C2A27A]" />
                </div>
                <div>
                  <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>
                    Upgrade Your Plan
                  </h2>
                  <p className={`text-xs ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
                    Unlock more AI power with UPI / NetBanking
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-all hover:scale-110 cursor-pointer
                  ${isDark ? "hover:bg-[#2E2E2E] text-[#BABABA]" : "hover:bg-[#F0EDE8] text-[#7D7D7D]"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain"
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (!isMobile) return;
                const el = scrollContainerRef.current;
                if (!el) return;
                const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                if (deltaY > 60 && el.scrollTop <= 0) {
                  onClose();
                }
              }}
            >
              {/* Active plan info */}
              {subscription && (
                <div className={`mx-5 mt-4 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2
                  ${isDark ? "bg-[#252525] text-[#BABABA]" : "bg-[#F0EDE8] text-[#545454]"}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C2A27A] shrink-0" />
                  Current plan: <strong className={isDark ? "text-white" : "text-[#252525]"}>{subscription.plan_name}</strong>
                  {subscription.days_remaining !== null && (
                    <span className="opacity-60 ml-1">· {subscription.days_remaining} days left</span>
                  )}
                </div>
              )}

              {/* Success */}
              {paymentSuccess && (
                <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 border
                  ${isDark ? "bg-[#C2A27A]/10 border-[#C2A27A]/20 text-[#C2A27A]" : "bg-[#C2A27A]/10 border-[#C2A27A]/20 text-[#8B6F4E]"}`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  {paymentSuccess}
                </div>
              )}

              {/* Error */}
              {paymentError && (
                <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-xs border
                  ${isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
                >
                  {paymentError}
                </div>
              )}

              {/* Plan Cards - Horizontal Scroll on Mobile */}
              <div className={`flex sm:grid sm:grid-cols-3 gap-4 p-5 overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory scrollbar-hide
                ${isMobile ? "pb-8" : ""}`}>
                {PLANS.map((plan) => {
                  const isCurrentPlan = plan.tier === currentTier;
                  const isLower = plan.tier < currentTier;
                  const isLoading = loadingPlan === plan.id;
                  const isHighlighted = plan.highlight && !isCurrentPlan && !isLower;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 snap-center
                        min-w-[66vw] sm:min-w-0
                        ${isHighlighted
                          ? isDark
                            ? "bg-[#C2A27A]/5 border-[#C2A27A]/40"
                            : "bg-[#C2A27A]/5 border-[#C2A27A]/30"
                          : isDark
                            ? "bg-[#252525] border-[#2E2E2E]"
                            : "bg-[#FAFAF8] border-[#E8E5E0]"
                        }`}
                    >
                      {/* Badge */}
                      {plan.badge && !isCurrentPlan && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[0.625rem] font-bold bg-[#C2A27A] text-white whitespace-nowrap shadow-lg">
                          {plan.badge}
                        </div>
                      )}

                      {/* Plan Name */}
                      <div className="mb-4">
                        <p className={`font-bold text-base ${isDark ? "text-white" : "text-[#252525]"}`}>
                          {plan.name}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
                          {plan.subtitle}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="mb-5">
                        <span className={`text-3xl font-extrabold
                          ${isHighlighted ? "text-[#C2A27A]" : isDark ? "text-white" : "text-[#252525]"}`}>
                          {plan.price}
                        </span>
                        <span className={`text-sm ml-1 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
                          {plan.period}
                        </span>
                      </div>

                      {/* Features */}
                      <ul className="flex-1 space-y-2.5 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-xs">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#C2A27A]" />
                            <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <button
                        disabled={isCurrentPlan || isLower || isLoading}
                        onClick={() => {
                          if (!isCurrentPlan && !isLower && plan.id !== "free") {
                            handleUpgrade(plan.id as "lite" | "premium");
                          }
                        }}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                          ${isCurrentPlan
                            ? isDark ? "bg-[#2E2E2E] text-[#BABABA] cursor-default" : "bg-[#E8E5E0] text-[#7D7D7D] cursor-default"
                            : isLower
                              ? isDark ? "bg-[#1A1A1A] text-[#444] cursor-not-allowed" : "bg-[#F5F3F0] text-[#CFCFCF] cursor-not-allowed"
                              : "bg-[#C2A27A] hover:bg-[#B08F67] text-white active:scale-95 cursor-pointer shadow-lg active:shadow-none"
                          }`}
                      >
                        {isLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                          : isCurrentPlan
                            ? <><Check className="w-4 h-4" /> {plan.cta}</>
                            : plan.cta
                        }
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <p className={`text-center text-[0.625rem] pb-6 px-10 ${isDark ? "text-[#555]" : "text-[#BABABA]"}`}>
                All prices inclusive of taxes · Payments via UPI, NetBanking & Cards · Powered by Razorpay
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
