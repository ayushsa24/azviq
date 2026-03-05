"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  Home, Library, CheckSquare, TrendingUp,
  MessageCircle, Settings, LogOut, Sparkles, User, ChevronRight,
  Sun, Moon, PanelLeftClose
} from "lucide-react";
import ProfileModal from "./ProfileModal";

export default function Sidebar({
  open,
  isHovered = false,
  onMouseLeave
}: {
  open: boolean;
  isHovered?: boolean;
  onMouseLeave?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { toggle } = useSidebar();
  const pathname = usePathname();
  const isDark = theme === "dark";

  const [profile, setProfile] = useState<{ name?: string; email?: string; avatar_url?: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    fetch(`/api/profile`, { headers: { "x-user-id": userId } })
      .then(r => r.json())
      .then(d => { if (d) setProfile(d); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("userId");
    await signOut({ callbackUrl: "/login" });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/progress", label: "Progress", icon: TrendingUp },
    { href: "/ai", label: "AI Chat", icon: MessageCircle },
    { href: "/preparation", label: "Preparation", icon: Sparkles },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const visible = open || isHovered;

  return (
    <>
      <aside
        onMouseLeave={onMouseLeave}
        className={`fixed flex flex-col z-[60] transition-all duration-300 ease-in-out hidden md:flex
          ${isDark ? "bg-[#1A1A1A]" : "bg-white"}
          ${open
            /* Pinned open: flush full height, no radius */
            ? "left-0 top-0 bottom-0 w-56 border-r rounded-none shadow-none translate-x-0"
            /* Hover peek: flush left, 15px gap top/bottom, right corners only */
            : `left-0 top-[45px] bottom-[45px] w-56 rounded-r-2xl border border-l-0 shadow-xl
               ${isHovered ? "translate-x-0" : "-translate-x-full"}`
          }
          ${isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}
        `}
      >
        {/* ── TOP BRAND HEADER ── */}
        <div className={`flex items-center gap-3 px-4 h-14 shrink-0 border-b ${isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
            ${isDark ? "bg-white text-[#252525]" : "bg-[#252525] text-white"}`}>
            A
          </div>
          <span className={`font-bold text-base tracking-tight flex-1 ${isDark ? "text-white" : "text-[#252525]"}`}>
            Ascend
          </span>
          {open && (
            <button
              onClick={toggle}
              title="Close sidebar"
              className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0
                      ${isDark
                  ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-white hover:text-[#252525] hover:border-white"
                  : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#252525] hover:text-white hover:border-[#252525]"
                }`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── NAV ITEMS ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
              (item.href === "/library" && pathname.startsWith("/library"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium
                  ${isActive
                    ? isDark ? "bg-[#2E2E2E] text-white" : "bg-[#F0EDE8] text-[#252525]"
                    : isDark ? "text-[#BABABA] hover:bg-[#252525] hover:text-white" : "text-[#545454] hover:bg-[#F5F3EF] hover:text-[#252525]"
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
              </Link>
            );
          })}
        </nav>

        {/* ── BOTTOM PROFILE + POPUP ── */}
        <div
          ref={menuRef}
          className={`shrink-0 border-t px-3 py-3 relative ${isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}
        >
          {/* Popup — opens upward */}
          {menuOpen && (
            <div className={`absolute bottom-[calc(100%+4px)] left-2 right-2 rounded-2xl border shadow-2xl overflow-hidden z-20
              ${isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-white border-[#E8E5E0]"}`}>

              {/* Profile header — click to open profile modal */}
              <button
                onClick={() => { setMenuOpen(false); setProfileModalOpen(true); }}
                className={`w-full text-left px-4 py-3 border-b transition-colors
                  ${isDark ? "border-[#3A3A3A] hover:bg-[#2E2E2E]" : "border-[#F0EDE8] hover:bg-[#F5F3EF]"}`}
              >
                <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-[#252525]"}`}>
                  {profile?.name || "My Account"}
                </p>
                {profile?.email && <p className="text-xs text-[#BABABA] truncate mt-0.5">{profile.email}</p>}
              </button>

              {/* Dark / Light mode */}
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-white hover:bg-[#333]" : "text-[#252525] hover:bg-[#F5F3EF]"}`}
              >
                {isDark ? <><Sun className="w-4 h-4" /> Light Mode</> : <><Moon className="w-4 h-4" /> Dark Mode</>}
              </button>

              <div className={`border-t ${isDark ? "border-[#3A3A3A]" : "border-[#F0EDE8]"}`} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-red-400 hover:bg-[#333]" : "text-red-600 hover:bg-red-50"}`}
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}

          {/* Profile trigger button */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left
              ${menuOpen
                ? isDark ? "bg-[#2E2E2E]" : "bg-[#F0EDE8]"
                : isDark ? "hover:bg-[#252525]" : "hover:bg-[#F5F3EF]"
              }`}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs
                ${isDark ? "bg-[#2E2E2E] text-white" : "bg-[#E8E5E0] text-[#545454]"}`}>
                {profile?.name ? profile.name[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate leading-tight ${isDark ? "text-white" : "text-[#252525]"}`}>
                {profile?.name || "My Account"}
              </p>
              {profile?.email && <p className="text-[10px] text-[#BABABA] truncate">{profile.email}</p>}
            </div>
          </button>
        </div>
      </aside>

      {/* Profile modal — rendered outside aside so it can center on screen */}
      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}
