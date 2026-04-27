"use client";

import React from "react";
import { X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl p-4 transition-all animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl transition-all scale-100 ${isDark ? "bg-[#1A1A1A] md:bg-[#1F1F1F] border border-[#333]" : "bg-white"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-[#CFCFCF]' : 'text-[#252525]'}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isDark
                ? 'text-[#7D7D7D] hover:bg-[#545454] hover:text-white'
                : 'text-[#9E9E9E] hover:bg-[#F0EDE8] hover:text-[#252525]'
              }`}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
