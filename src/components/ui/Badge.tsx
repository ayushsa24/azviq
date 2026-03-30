"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "error";
  className?: string;
}) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-all shadow-sm";
  
  const variants = {
    neutral: "bg-[#F1F1F1] text-[#1A1A1A] border border-[#E0E0E0] dark:bg-[#252525] dark:text-[#CFCFCF] dark:border-[#333]",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/40",
    warning: "bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/40",
    error: "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/10 dark:text-rose-400 dark:border-rose-900/40",
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.span>
  );
}
