"use client";

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

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
    <div className="relative mb-4">
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${className} ${
          theme === 'dark' 
            ? 'bg-slate-700/80 border-indigo-500/30 text-white placeholder-gray-400 hover:bg-slate-700 hover:border-indigo-500/50' 
            : 'bg-white border-indigo-200 text-gray-900 placeholder-gray-500 hover:bg-gray-50 hover:border-indigo-300'
        }`}
      />
      <div className="absolute right-3 top-0 h-full flex items-center">
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={`p-1 rounded transition-all duration-200 ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-gray-100 hover:bg-slate-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
        {showPassword ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
        </button>
      </div>
    </div>
  );
}
