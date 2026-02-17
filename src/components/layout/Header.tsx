"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Menu, Bell, Bot, User, Sun, Moon } from "lucide-react";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <header className={`h-16 flex items-center justify-between px-6 transition-all duration-300 shadow-sm
      ${theme === 'dark' 
        ? 'bg-[#252525] border-b border-[#545454]' 
        : 'bg-[#CFCFCF] border-b border-[#7D7D7D]'
      }`}>
      
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick} 
          className={`hidden md:block p-2 rounded-xl transition-all duration-200 hover:scale-105 cursor-pointer
            ${theme === 'dark' 
              ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white' 
              : 'text-[#252525] hover:bg-[#7D7D7D] hover:text-white'
            }`}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-200
            ${theme === 'dark' ? 'bg-[#7D7D7D] text-white' : 'bg-[#545454] text-white'}`}>
            A
          </div>
          <span className={`font-semibold text-xl transition-colors
            ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
            Ascend
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <button className={`p-2 rounded-xl transition-all duration-200 hover:scale-105
          ${theme === 'dark' 
            ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white' 
            : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
          }`}>
          <Bot className="w-5 h-5" />
        </button>
        
        <button className={`p-2 rounded-xl transition-all duration-200 hover:scale-105 relative
          ${theme === 'dark' 
            ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white' 
            : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
          }`}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#7D7D7D] rounded-full"></span>
        </button>
        
        <button className={`p-2 rounded-xl transition-all duration-200 hover:scale-105
          ${theme === 'dark' 
            ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white' 
            : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
          }`}>
          <User className="w-5 h-5" />
        </button>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl transition-all duration-200 hover:scale-105
            ${theme === 'dark' 
              ? 'text-yellow-400 hover:bg-[#545454]' 
              : 'text-[#545454] hover:bg-[#7D7D7D]'
            }`}
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>
      </div>
    </header>
  );
}

// "use client";

// export default function Header({ title }: { title?: string }) {
//   return (
//     <header className="flex items-center justify-between border-b p-4">
//       <h1 className="text-xl font-semibold">{title ?? "Ascend AI"}</h1>
//     </header>
//   );
// }
