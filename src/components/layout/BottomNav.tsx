"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, Library, MessageCircle, CheckSquare, Settings } from "lucide-react";

export default function BottomNav() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

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

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/ai", label: "AI", icon: MessageCircle },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 border-t transition-all duration-300 ease-in-out shadow-lg md:hidden pb-[env(safe-area-inset-bottom,0px)]
      ${isKeyboardOpen ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
      ${theme === 'dark' ? 'bg-[#252525] border-[#545454]' : 'bg-[#CFCFCF] border-[#7D7D7D]'}`}>
      <div className="mx-auto flex max-w-xl justify-around p-2 pt-3 pb-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0
                ${theme === 'dark'
                  ? isActive
                    ? 'bg-[#545454] text-white'
                    : 'text-[#CFCFCF] hover:bg-[#545454] hover:text-white'
                  : isActive
                    ? 'bg-[#7D7D7D] text-white shadow-sm'
                    : 'text-[#545454] hover:bg-[#7D7D7D] hover:text-white'
                }`}
            >
              <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
