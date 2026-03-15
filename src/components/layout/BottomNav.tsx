"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, Library, MessageCircle, CheckSquare, Sparkles } from "lucide-react";

export default function BottomNav() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

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

  const hidden = isKeyboardOpen;

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/ai", label: "AI", icon: MessageCircle },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/preparation", label: "Prep", icon: Sparkles },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[100] border-t transition-all duration-300 ease-in-out shadow-lg md:hidden pb-[env(safe-area-inset-bottom,0px)]
      ${hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
      ${theme === 'dark' ? 'bg-[#252525] border-[#545454]' : 'bg-[#F5F3EF]/95 backdrop-blur-md border-[#E8E5E0]'}`}>
      <div className="mx-auto flex max-w-xl justify-around px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center justify-center gap-[3px] px-2.5 py-1.5 min-w-[64px] rounded-xl transition-all duration-200
                ${theme === 'dark'
                  ? isActive
                    ? 'bg-[#545454] text-white'
                    : 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                  : isActive
                    ? 'bg-[#252525] text-white shadow-md'
                    : 'text-[#7D7D7D] hover:bg-[#252525]/10 hover:text-[#252525]'
                }`}
            >
              <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-[11px] font-semibold leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
