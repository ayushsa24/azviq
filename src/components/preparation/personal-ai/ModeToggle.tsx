"use client";

import React from "react";
import { MessageSquare, Mic } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export type Mode = "chat" | "voice";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const MODES: Array<{ id: Mode; icon: React.ElementType; label: string }> = [
  { id: "chat", icon: MessageSquare, label: "Text" },
  { id: "voice", icon: Mic, label: "Voice" },
];

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`flex p-1 rounded-full border shrink-0 transition-colors
        ${isDark ? "bg-[#252525] border-[#545454]" : "bg-[#F0EDE8] border-[#7D7D7D]/40"}`}
    >
      {MODES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95
            ${mode === id
              ? isDark
                ? "bg-white text-[#252525] shadow-sm"
                : "bg-[#252525] text-white shadow-sm"
              : isDark
                ? "text-[#BABABA] hover:text-white"
                : "text-[#545454] hover:text-[#252525]"
            }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
