"use client";

import React, { useEffect, memo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ToastProps {
  message: string;
  type?: "info" | "success" | "error" | "warning";
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  duration?: number;
  onDismiss: () => void;
}

function Toast({ message, type = "info", action, duration = 5000, onDismiss }: ToastProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!duration || duration === 0) return;
    
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleAction = async () => {
    if (action) {
      try {
        await action.onClick();
      } catch (err) {
        console.error("Toast action failed:", err);
      } finally {
        onDismiss();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      layout
      className={`pointer-events-auto relative flex items-center gap-4 pl-5 pr-3 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md transition-all mx-auto w-fit overflow-hidden ${
        isDark 
          ? "bg-[#1A1A1A]/90 border-white/10 text-white/90" 
          : "bg-white/90 border-black/5 text-[#252525]/90"
      }`}
    >
      <span className="text-[13px] font-medium tracking-tight whitespace-nowrap leading-none">
        {message}
      </span>

      <div className="flex items-center gap-3 border-l border-current/10 pl-3">
        {action && (
          <button
            onClick={handleAction}
            className="text-[11px] font-bold uppercase tracking-widest text-[#C2A27A] hover:text-[#B08F67] transition-colors active:scale-95 whitespace-nowrap"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className={`p-1 rounded-full transition-all hover:scale-110 active:scale-90 ${
            isDark ? "hover:bg-white/5 text-white/20" : "hover:bg-black/5 text-black/20"
          }`}
        >
          <X size={12} />
        </button>
      </div>

      {/* Subtle Progress Line */}
      {duration !== 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden opacity-60">
          <motion.div
            className="h-full bg-[#C2A27A]"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: (duration || 5000) / 1000, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default memo(Toast);
