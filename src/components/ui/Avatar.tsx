"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeMap = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative flex items-center justify-center overflow-hidden rounded-full border border-[#E0E0E0] bg-[#F1F1F1] font-bold text-[#1A1A1A] dark:border-[#333] dark:bg-[#252525] dark:text-[#CFCFCF] ${sizeMap[size]} ${className}`}
    >
      {src ? (
        <img src={src} alt={name || "Avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </motion.div>
  );
}
