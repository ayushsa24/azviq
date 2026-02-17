"use client";

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PasswordInput({ placeholder, value, onChange, className = "" }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 transition-all duration-200 ${className} ${
          theme === 'dark' 
            ? 'bg-[#545454]/50 border-[#7D7D7D] text-white placeholder-[#CFCFCF] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#545454]/70' 
            : 'bg-white border-[#7D7D7D] text-[#252525] placeholder-[#545454] focus:ring-[#7D7D7D]/50 focus:border-[#7D7D7D]/50 hover:bg-[#CFCFCF]/50'
        }`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg transition-all duration-200 hover:scale-110 ${
          theme === 'dark'
            ? 'text-[#CFCFCF] hover:text-white hover:bg-[#545454]/50'
            : 'text-[#545454] hover:text-white hover:bg-[#7D7D7D]/50'
        }`}
        title={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5" />
        ) : (
          <Eye className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
