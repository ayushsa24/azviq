"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useUser } from "@/contexts/UserContext";
import { signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
  Home, Library, CheckSquare, TrendingUp,
  MessageCircle, Settings, LogOut, Sparkles, User, ChevronRight,
  Sun, Moon, ChevronsLeft, Clock, FileText, File as FileIcon, ClipboardCheck, BookOpen, Bell, HelpCircle, Trash2, Crown, Inbox
} from "lucide-react";
import ProfileModal from "./ProfileModal";
import NotificationPanel from "./NotificationPanel";
import { useSettings } from "@/contexts/SettingsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import useSWR from "swr";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type RecentItem = {
  id: string;
  item_id: string;
  title: string;
  item_type: "note" | "pdf" | "exercise" | "revision";
  opened_at: string;
  href: string;
};

const TYPE_CONFIG: Record<string, { icon: any }> = {
  note: { icon: FileText },
  pdf: { icon: FileIcon },
  exercise: { icon: ClipboardCheck },
  revision: { icon: BookOpen },
};

export default function Sidebar({
  open,
  isHovered = false,
  onMouseLeave,
  onTrashClick,
  onUpgradeClick
}: {
  open: boolean;
  isHovered?: boolean;
  onMouseLeave?: () => void;
  onTrashClick?: () => void;
  onUpgradeClick?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { openSettings } = useSettings();
  const { toggle } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDark = theme === "dark";
  const { unreadCount, panelOpen, setPanelOpen } = useNotifications();
  const { user: profile } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isProfileOpen, openProfile, closeProfile } = useProfile();
  const { data: recentData, mutate: mutateRecent, isLoading: isRecentLoading } = useSWR("/api/recent-activity", fetcher, {
    revalidateOnFocus: true,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const topNavContainerRef = useRef<HTMLDivElement>(null);
  const recentHeaderRef = useRef<HTMLDivElement>(null);
  const [visibleRecentCount, setVisibleRecentCount] = useState<number>(5);

  useEffect(() => {
    if (!navRef.current || !topNavContainerRef.current || !recentHeaderRef.current) return;
    
    const calculateVisibleItems = () => {
      if (!navRef.current || !topNavContainerRef.current || !recentHeaderRef.current) return;
      const navHeight = navRef.current.clientHeight;
      const topNavHeight = topNavContainerRef.current.clientHeight;
      const recentHeaderHeight = recentHeaderRef.current.clientHeight;
      
      // nav has py-3 (24px), recent section has mt-4 (16px)
      // Reduced padding deductions to be more aggressive
      const availableSpace = navHeight - topNavHeight - recentHeaderHeight - 12;
      
      // Assume a smaller item height to force the count up
      const itemHeight = 32;
      const count = Math.max(0, Math.floor(availableSpace / itemHeight)) + 1;
      setVisibleRecentCount(count);
    };

    const observer = new ResizeObserver(() => calculateVisibleItems());
    observer.observe(navRef.current);
    
    // Initial calculation
    calculateVisibleItems();
    
    return () => observer.disconnect();
  }, []);

  const recentItems: RecentItem[] = (recentData?.items || []).slice(0, visibleRecentCount);

  useEffect(() => {
    const handleUpdate = () => mutateRecent();
    window.addEventListener("recentActivityUpdated", handleUpdate);
    return () => window.removeEventListener("recentActivityUpdated", handleUpdate);
  }, [mutateRecent]);

  // Close menu on outside click
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
    { href: "/dashboard", label: translations[language].dashboard, icon: Home },
    { href: "/library", label: translations[language].library, icon: Library },
    { href: "/ai", label: translations[language].ai_chat, icon: MessageCircle },
    { href: "/tasks", label: translations[language].tasks, icon: CheckSquare },
    { href: "/preparation", label: translations[language].preparation, icon: Sparkles },
  ];

  const visible = open || isHovered;

  return (
    <>
      <aside
        onMouseLeave={onMouseLeave}
        className={`fixed flex flex-col z-[100] transition-all duration-300 ease-in-out hidden md:flex antialiased tracking-tight
          ${isDark ? "bg-[#1A1A1A]" : "bg-white"}
          ${open
            /* Pinned open: flush full height, no radius */
            ? "left-0 top-0 bottom-0 w-64 border-r rounded-none shadow-none translate-x-0"
            /* Hover peek: flush left, 20px gap top/bottom, right corners only */
            : `left-0 top-[20px] bottom-[20px] w-64 rounded-r-2xl border border-l-0 shadow-xl
               ${isHovered ? "translate-x-0" : "-translate-x-full"}`
          }
          ${isDark ? "border-[#2E2E2E]" : "border-[#7D7D7D]/40"}
        `}
      >
        {/* ── TOP BRAND HEADER ── */}
        <div className={`flex items-center gap-3 px-4 h-14 shrink-0 border-b ${isDark ? "border-[#2E2E2E]" : "border-[#7D7D7D]/40"}`}>
          <img
            src="/azviq_logo.png"
            alt="Azviq Logo"
            className="w-11 h-11 rounded-lg object-contain shrink-0 dark:invert"
          />
          <span className={`font-bold text-lg tracking-tighter flex-1 font-[var(--font-lexend)] ${isDark ? "text-white" : "text-[#252525]"}`}>
            Azviq
          </span>
          <button
            data-notification-bell
            onClick={() => setPanelOpen(!panelOpen)}
            className={`p-1.5 rounded-xl transition-all duration-300 hover:scale-110 relative cursor-pointer shrink-0
            ${isDark
                ? 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                : 'text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'
              } ${panelOpen ? (isDark ? 'bg-[#545454] text-white' : 'bg-[#E8E5E0] text-[#252525]') : ''}`}>
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-[#C2A27A] text-white text-[8px] font-bold flex items-center justify-center rounded-full border border-white dark:border-[#252525]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <button
              onClick={toggle}
              title="Close sidebar"
              className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0
                      ${isDark
                  ? "bg-[#252525] border border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]"
                  : "bg-white border border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#F0EDE8]"
                }`}
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── NAV ITEMS ── */}
        <nav ref={navRef} className="flex-1 flex flex-col overflow-hidden py-3 px-2">
          <div ref={topNavContainerRef} className="space-y-1.5 shrink-0">
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
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13.5px] font-[500]
                  ${isActive
                    ? isDark ? "bg-[#2E2E2E] text-white shadow-sm" : "bg-[#E8E5E0] text-[#252525] shadow-sm"
                    : isDark ? "text-[#BABABA] hover:bg-[#252525] hover:text-white" : "text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]"
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
              </Link>
            );
            })}
          </div>
          
          <div className="mt-4 flex flex-col shrink-0">
            <div ref={recentHeaderRef} className={`px-4 mb-2 text-[11px] font-[600] uppercase tracking-wider flex items-center gap-1.5 opacity-50 shrink-0 ${isDark ? "text-white" : "text-[#252525]"}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Recent</span>
            </div>
            {isRecentLoading ? (
              <div className="space-y-2 px-3 mt-2 shrink-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-8 w-full rounded-xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
                ))}
              </div>
            ) : recentItems.length > 0 ? (
              <div className="space-y-0.5 shrink-0">
                {recentItems.map((item) => {
                  const ItemIcon = TYPE_CONFIG[item.item_type]?.icon || FileText;
                  
                  // Construct the current full URL string for comparison
                  const searchParamsString = searchParams.toString();
                  const currentFullComparePath = pathname + (searchParamsString ? `?${searchParamsString}` : "");
                  
                  // Check if this recent item matches the current view
                  const isActive = currentFullComparePath === item.href || 
                                  (item.href !== "/" && pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 text-[13px] font-[500] shrink-0
                        ${isActive
                          ? isDark ? "bg-[#2E2E2E] text-white" : "bg-[#E8E5E0] text-[#252525]"
                          : isDark ? "text-[#BABABA] hover:bg-[#252525] hover:text-white" : "text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]"
                        }`}
                      title={item.title}
                    >
                      <ItemIcon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`} />
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="truncate">
                          {item.item_type === "exercise" && "Exercise: "}
                          {item.item_type === "revision" && "Revision: "}
                          {item.title.replace(/^\[\w+\]\s*/, "")}
                        </span>
                        {(() => {
                          const iconMatch = item.title.match(/^\[(\w+)\]/);
                          if (iconMatch && ICON_MAP[iconMatch[1]]) {
                            const IconComp = ICON_MAP[iconMatch[1]];
                            return <IconComp size={12} className="opacity-40 shrink-0" strokeWidth={1.5} />;
                          }
                          return null;
                        })()}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className={`px-4 py-3 mx-2 rounded-xl border border-dashed flex flex-col items-center text-center gap-2 opacity-60 animate-in fade-in duration-500 shrink-0 ${isDark ? 'border-[#3A3A3A]' : 'border-[#D1D1D1]'}`}>
                <Inbox className="w-5 h-5 text-[#7D7D7D] mb-0.5" />
                <span className="text-[11px] leading-tight">Currently do not have any recent activity</span>
                <div className="flex flex-col gap-2 mt-1 w-full">
                  <button onClick={() => router.push('/library?action=new-note')} className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white' : 'bg-[#E8E5E0] hover:bg-[#D1D1D1] text-[#252525]'}`}>
                    <FileText className="w-3.5 h-3.5" /> New Note
                  </button>
                  <button onClick={() => router.push('/library?action=upload-pdf')} className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-[#3A3A3A] hover:bg-[#4A4A4A] text-white' : 'bg-[#E8E5E0] hover:bg-[#D1D1D1] text-[#252525]'}`}>
                    <FileIcon className="w-3.5 h-3.5" /> Upload PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ── BOTTOM PROFILE + POPUP ── */}
        <div
          ref={menuRef}
          className={`shrink-0 border-t px-3 py-2 relative ${isDark ? "border-[#2E2E2E]" : "border-[#7D7D7D]/40"}`}
        >
          {/* Popup — opens upward */}
          {menuOpen && (
            <div className={`absolute bottom-[calc(100%+4px)] left-2 right-2 rounded-2xl border shadow-2xl overflow-hidden z-20
              ${isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-white border-[#7D7D7D]/40"}`}>

              {/* Profile header — click to open profile page */}
              <button
                onClick={() => { 
                  setMenuOpen(false); 
                  const currentFullUrl = window.location.pathname + window.location.search;
                  const newUrl = `/profile?from=${encodeURIComponent(currentFullUrl)}`;
                  window.history.pushState(null, '', newUrl);
                  openProfile(); 
                }}
                className={`w-full text-left px-4 py-3 border-b transition-colors
                  ${isDark ? "border-[#3A3A3A] hover:bg-[#2E2E2E]" : "border-[#F0EDE8] hover:bg-[#CFCFCF]"}`}
              >
                <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-[#252525]"}`}>
                  {profile?.name || "My Account"}
                </p>
                {profile?.email && <p className="text-xs text-[#BABABA] truncate mt-0.5">{profile.email}</p>}
              </button>

              {/* Settings */}
              <button
                onClick={() => { 
                  setMenuOpen(false); 
                  const currentFullUrl = window.location.pathname + window.location.search;
                  const newUrl = `/settings?from=${encodeURIComponent(currentFullUrl)}`;
                  window.history.pushState(null, '', newUrl);
                  openSettings(); 
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-white hover:bg-[#333]" : "text-[#252525] hover:bg-[#CFCFCF]"}`}
              >
                <Settings className="w-4 h-4" /> {translations[language].settings}
              </button>

              {/* Trash */}
              <button
                onClick={() => { 
                  setMenuOpen(false); 
                  const currentFullUrl = window.location.pathname + window.location.search;
                  const newUrl = `/trash?from=${encodeURIComponent(currentFullUrl)}`;
                  window.history.pushState(null, '', newUrl);
                  onTrashClick?.(); 
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-white hover:bg-[#333]" : "text-[#252525] hover:bg-[#CFCFCF]"}`}
              >
                <Trash2 className="w-4 h-4" /> Trash
              </button>

              {/* ✨ Upgrade Plan */}
              <button
                onClick={() => { setMenuOpen(false); onUpgradeClick?.(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all
                  ${isDark
                    ? "text-[#C2A27A] hover:bg-[#C2A27A]/10"
                    : "text-[#8B6F4E] hover:bg-[#C2A27A]/10"
                  }`}
              >
                <Crown className="w-4 h-4" />
                Upgrade Plan
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${isDark ? "bg-[#C2A27A]/20 text-[#C2A27A]" : "bg-[#C2A27A]/15 text-[#8B6F4E]"}`}>
                  PRO
                </span>
              </button>


              {/* Help & Support */}
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-white hover:bg-[#333]" : "text-[#252525] hover:bg-[#CFCFCF]"}`}
              >
                <HelpCircle className="w-4 h-4" /> Help & Support
              </button>

              <div className={`border-t ${isDark ? "border-[#3A3A3A]" : "border-[#F0EDE8]"}`} />

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors
                  ${isDark ? "text-red-400 hover:bg-[#333]" : "text-red-600 hover:bg-red-50"}`}
              >
                <LogOut className="w-4 h-4" /> {translations[language].logout}
              </button>
            </div>
          )}

          {/* Profile trigger button */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 text-left
              ${menuOpen
                ? isDark ? "bg-[#2E2E2E]" : "bg-[#E8E5E0]"
                : isDark ? "hover:bg-[#252525]" : "hover:bg-[#F0EDE8]"
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

      {/* Profile modal is now managed globally by AppShell */}
    </>
  );
}
