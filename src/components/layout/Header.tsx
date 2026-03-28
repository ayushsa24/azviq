"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useZoom } from "@/contexts/ZoomContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useUser } from "@/contexts/UserContext";
import { Menu, Bell, Bot, User, Sun, Moon, LogOut, ChevronDown, ZoomIn, ZoomOut, RotateCcw, PanelLeft, PanelLeftClose, Settings, Trash2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useSettings } from "@/contexts/SettingsContext";

export default function Header({ onMenuClick, open, onTrashClick, onProfileClick }: { onMenuClick: () => void; open: boolean; onTrashClick?: () => void; onProfileClick?: () => void }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { zoomLevel, zoomIn, zoomOut, resetZoom } = useZoom();
  const { unreadCount, panelOpen, setPanelOpen } = useNotifications();
  const { user } = useUser();
  const { openSettings } = useSettings();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


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
    <header className={`h-[calc(3.25rem+env(safe-area-inset-top,0px))] md:h-16 pt-[calc(env(safe-area-inset-top,0px)+8px)] md:pt-0 flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ease-in-out fixed z-50 ${theme === 'dark'
      ? 'bg-[#1A1A1A] border-[#545454]'
      : 'bg-[#F5F3EF] border-[#E8E5E0]'
      } ${open
        ? 'top-0 left-0 right-0 border-b shadow-sm'
        : 'md:top-0 md:left-[8px] md:right-[8px] md:rounded-b-2xl md:shadow-[0_4px_20px_rgba(0,0,0,0.08)] md:border md:border-t-0 top-0 left-0 right-0 border-b shadow-sm'
      }`}>

      {/* LEFT */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* LOGO BUTTON */}
          <div
            onClick={onMenuClick}
            className={`cursor-pointer group flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm transition-all duration-200 relative overflow-hidden hover:shadow-[0_0_15px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.15)]
              ${theme === 'dark' ? 'bg-[#7D7D7D] text-white' : 'bg-[#252525] text-white'}`}
          >
            <img 
              src={theme === 'dark' ? "/lavyx_logo.png" : "/davyx_logo.png"} 
              alt="Avyx Logo" 
              className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-0" 
            />

            {open ? (
              <PanelLeftClose className="w-5 h-5 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            ) : (
              <PanelLeft className="w-5 h-5 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            )}
          </div>

          {/* TITLE */}
          <span className={`font-bold text-2xl tracking-tighter transition-colors pl-1 cursor-default font-[var(--font-lexend)]
            ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
            Avyx
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <button
          data-notification-bell
          onClick={() => setPanelOpen(!panelOpen)}
          className={`md:hidden p-2 rounded-xl transition-all duration-200 hover:scale-105 relative
          ${theme === 'dark'
            ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
            : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
          } ${panelOpen ? (theme === 'dark' ? 'bg-[#545454] text-white' : 'bg-[#7D7D7D] text-white') : ''}`}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#C2A27A] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#252525]">
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
                : 'text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'
              }`}>
            {user?.avatar_url || session?.user?.image ? (
              <img
                src={user?.avatar_url || session?.user?.image || ""}
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
              : 'bg-white border-[#E8E5E0]'
              }`}>
                <button
                  onClick={() => { setDropdownOpen(false); onProfileClick?.(); }}
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-t-xl cursor-pointer ${theme === 'dark'
                    ? 'text-[#CFCFCF] hover:bg-[#545454]'
                    : 'text-[#545454] hover:bg-[#F0EDE8]'
                    }`}>
                  <User className="w-4 h-4" />
                  My Profile
                </button>
              <button
                onClick={() => { setDropdownOpen(false); onTrashClick?.(); }}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${theme === 'dark'
                  ? 'text-[#CFCFCF] hover:bg-[#545454]'
                  : 'text-[#545454] hover:bg-[#F0EDE8]'
                  }`}>
                <Trash2 className="w-4 h-4" />
                Trash Bin
              </button>
              <button
                onClick={() => { setDropdownOpen(false); openSettings(); }}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors cursor-pointer ${theme === 'dark'
                  ? 'text-[#CFCFCF] hover:bg-[#545454]'
                  : 'text-[#545454] hover:bg-[#F0EDE8]'
                  }`}>
                <Settings className="w-4 h-4" />
                Settings
              </button>



              <button
                onClick={handleLogout}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors rounded-b-xl cursor-pointer ${theme === 'dark'
                  ? 'text-red-400 hover:bg-[#545454]'
                  : 'text-red-600 hover:bg-[#F0EDE8]'
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
