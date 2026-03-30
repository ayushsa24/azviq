"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}) {
  const baseStyles = "px-6 py-2.5 rounded-xl font-semibold transition-all shadow-sm flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#1A1A1A] text-white hover:bg-[#252525] hover:shadow-lg border border-[#333]",
    secondary: "bg-[#F1F1F1] text-[#1A1A1A] hover:bg-[#EAEAEA] border border-[#E0E0E0]",
    outline: "bg-transparent text-[#1A1A1A] border border-[#E0E0E0] hover:bg-[#F9F9F9] dark:text-[#CFCFCF] dark:border-[#333] dark:hover:bg-[#1E1E1E]",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
