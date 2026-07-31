"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, Library, MessageCircle, CheckSquare, Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function BottomNav({ isFullPageLayer = false }: { isFullPageLayer?: boolean }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNative, setIsNative] = useState(false);

  /* ── Check if we are running in native Capacitor app ── */
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  /* ── Detect if dynamic modal is open (via body lock) ── */
  useEffect(() => {
    const checkModal = () => {
      setIsModalOpen(document.body.style.overflow === "hidden");
    };

    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    checkModal();

    return () => observer.disconnect();
  }, []);

  /* ── Hide when mobile keyboard is visible ── */
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = () => setIsKeyboardOpen(false);

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  useEffect(() => {
    setIsKeyboardOpen(false);
  }, [pathname]);

  const hidden = isKeyboardOpen || isModalOpen || isFullPageLayer || searchParams.get("fullscreen") === "true";

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/ai", label: "AI", icon: MessageCircle },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/preparation", label: "Prep", icon: Sparkles },
  ];

  // Render floating island bottom navigation bar for native app, and standard bar for web
  const navClass = isNative
    ? `fixed bottom-4 left-4 right-4 z-[100] border transition-all duration-300 ease-in-out shadow-2xl rounded-2xl mx-auto max-w-sm py-1.5 md:hidden
       ${hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
       ${theme === 'dark' ? 'bg-[#1A1A1A]/95 backdrop-blur-xl border-[#2E2E2E]' : 'bg-white/95 backdrop-blur-xl border-[#E8E5E0]'}`
    : `fixed bottom-0 left-0 right-0 z-[100] border-t transition-all duration-300 ease-in-out shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,4px)] pt-1
       ${hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
       ${theme === 'dark' ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white/80 backdrop-blur-xl border-[#E8E5E0]'}`;

  return (
    <nav className={navClass}>
      <div className={`mx-auto flex justify-between items-center ${isNative ? 'px-4 py-0.5' : 'max-w-md px-6 py-1'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative group flex flex-col items-center justify-center transition-all duration-300 active:scale-90
                ${isNative ? 'p-2.5 rounded-xl' : 'p-1.5 rounded-2xl'}
                ${theme === 'dark'
                  ? isActive ? 'text-white' : 'text-[#7D7D7D] hover:text-[#BABABA]'
                  : isActive ? 'text-[#252525]' : 'text-[#7D7D7D] hover:text-[#545454]'
                }`}
            >
              <Icon 
                strokeWidth={isActive ? 2.5 : 2}
                className={`w-6 h-6 transition-all duration-300 
                  ${isNative ? "" : "-translate-y-[5px]"} 
                  ${isActive ? "scale-110" : "group-hover:scale-110"}`} 
              />
              
              {/* Sleek active indicator dot */}
              {isActive && (
                <span className={`absolute rounded-full animate-in zoom-in duration-300 
                  ${isNative ? "bottom-1 w-1.5 h-1.5" : "-bottom-1 w-1 h-1"} 
                  ${theme === 'dark' ? 'bg-white' : 'bg-[#252525]'}`} 
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
