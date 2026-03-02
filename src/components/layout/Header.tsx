"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useZoom } from "@/contexts/ZoomContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Menu, Bell, Bot, User, Sun, Moon, LogOut, ChevronDown, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { signOut } from "next-auth/react";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { zoomLevel, zoomIn, zoomOut, resetZoom } = useZoom();
  const { unreadCount } = useNotifications();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      fetch(`/api/profile`, {
        headers: { "x-user-id": userId }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          }
        })
        .catch(() => {
          // Silently fail if can't fetch avatar
        });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem('userId');
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <header className={`h-[calc(5rem+env(safe-area-inset-top,0px))] md:h-16 pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pt-0 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ease-in-out shadow-sm fixed top-0 left-0 right-0 z-50 ${theme === 'dark'
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
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#252525]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`p-1 rounded-xl transition-all duration-200 hover:scale-105 overflow-hidden flex items-center gap-1 cursor-pointer
              ${theme === 'dark'
                ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
              }`}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''
              }`} />
          </button>

          {/* DROPDOWN MENU */}
          {dropdownOpen && (
            <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border transition-all duration-200 z-50 ${theme === 'dark'
              ? 'bg-[#252525] border-[#545454]'
              : 'bg-white border-[#7D7D7D]'
              }`}>
              <Link href="/profile">
                <button
                  onClick={() => setDropdownOpen(false)}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-t-xl cursor-pointer ${theme === 'dark'
                    ? 'text-[#CFCFCF] hover:bg-[#545454]'
                    : 'text-[#545454] hover:bg-[#CFCFCF]'
                    }`}>
                  <User className="w-4 h-4" />
                  My Profile
                </button>
              </Link>

              <button
                onClick={() => {
                  toggleTheme();
                  setDropdownOpen(false);
                }}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${theme === 'dark'
                  ? 'text-[#CFCFCF] hover:bg-[#545454]'
                  : 'text-[#545454] hover:bg-[#CFCFCF]'
                  }`}>
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    Dark Mode
                  </>
                )}
              </button>

              <div className={`px-4 py-2 border-t border-b flex items-center justify-between ${theme === 'dark' ? 'border-[#545454] text-[#CFCFCF]' : 'border-[#7D7D7D] text-[#545454]'}`}>
                <span className="text-sm font-medium">Zoom</span>
                <div className="flex items-center gap-2">
                  <button onClick={zoomOut} className={`p-1 rounded hover:bg-[#7D7D7D] hover:text-white transition-colors`}>
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={resetZoom} className={`p-1 rounded hover:bg-[#7D7D7D] hover:text-white transition-colors`} title="Reset Zoom">
                    <span className="text-xs font-bold leading-none">{Math.round((zoomLevel / 16) * 100)}%</span>
                  </button>
                  <button onClick={zoomIn} className={`p-1 rounded hover:bg-[#7D7D7D] hover:text-white transition-colors`}>
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-b-xl cursor-pointer ${theme === 'dark'
                  ? 'text-red-400 hover:bg-[#545454]'
                  : 'text-red-600 hover:bg-[#CFCFCF]'
                  }`}>
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
