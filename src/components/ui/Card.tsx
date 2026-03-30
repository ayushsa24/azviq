"use client";

import React from "react";
import { motion } from "framer-motion";

export default function Card({
  children,
  className = "",
  hoverEffect = true,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" } : {}}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white p-6 shadow-sm transition-colors dark:border-[#333] dark:bg-[#1A1A1A] ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-4 flex items-center justify-between ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-xl font-extrabold tracking-tight text-[#1A1A1A] dark:text-[#CFCFCF] ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>{children}</p>;
}
