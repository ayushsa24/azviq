"use client";

import { useRef, useState, useEffect, ClipboardEvent, KeyboardEvent } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
}

export default function OtpInput({
  length = 6,
  onComplete,
  error = false,
  success = false,
  disabled = false,
}: OtpInputProps) {
  const { theme } = useTheme();
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Shake animation when error prop turns true
  useEffect(() => {
    if (error) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    // Move to next if digit entered
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    // Trigger onComplete when all filled
    const fullCode = newValues.join("");
    if (fullCode.length === length && !newValues.includes("")) {
      onComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValues = [...values];
      if (newValues[index]) {
        // Clear current
        newValues[index] = "";
        setValues(newValues);
      } else {
        // Move to previous and clear it
        if (index > 0) {
          newValues[index - 1] = "";
          setValues(newValues);
          focusInput(index - 1);
        }
      }
    } else if (e.key === "ArrowLeft") {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight") {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const newValues = [...values];
    pasted.split("").forEach((char, i) => {
      newValues[i] = char;
    });
    setValues(newValues);
    focusInput(Math.min(pasted.length, length - 1));

    if (pasted.length === length) {
      onComplete(pasted);
    }
  };

  return (
    <div
      className={`flex gap-3 justify-center transition-all duration-150 ${
        shaking ? "animate-[shake_0.5s_ease-in-out]" : ""
      }`}
      style={
        shaking
          ? {
              animation: "shake 0.5s ease-in-out",
            }
          : {}
      }
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>

      {values.map((val, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`
            w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200
            focus:outline-none focus:scale-105
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${success
              ? "border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_16px_rgba(34,197,94,0.3)]"
              : error
              ? "border-red-500 bg-red-500/10 text-red-500"
              : val
              ? theme === "dark"
                ? "border-white/50 bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                : "border-[#252525]/50 bg-[#252525]/5 text-[#252525]"
              : theme === "dark"
              ? "border-[#444] bg-[#1A1A1A]/50 text-white focus:border-white/40"
              : "border-[#DDD] bg-white text-[#252525] focus:border-[#999]"
            }
          `}
        />
      ))}
    </div>
  );
}
