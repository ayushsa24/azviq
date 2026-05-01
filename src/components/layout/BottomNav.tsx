"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Home, Library, MessageCircle, CheckSquare, Sparkles } from "lucide-react";

export default function BottomNav({ isFullPageLayer = false }: { isFullPageLayer?: boolean }) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ── Detect if dynamic modal is open (via body lock) ── */
  useEffect(() => {
    const checkModal = () => {
      // Modals in this app usually set body overflow to hidden
      setIsModalOpen(document.body.style.overflow === "hidden");
    };

    // Use a MutationObserver to watch for body style changes
    const observer = new MutationObserver(checkModal);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    // Also check on mount
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

  const hidden = isKeyboardOpen || isModalOpen || isFullPageLayer || searchParams.get("fullscreen") === "true";

  const navItems = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/library", label: "Library", icon: Library },
    { href: "/ai", label: "AI", icon: MessageCircle },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/preparation", label: "Prep", icon: Sparkles },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-[100] border-t transition-all duration-300 ease-in-out shadow-2xl md:hidden pb-[env(safe-area-inset-bottom,4px)] pt-1
      ${hidden ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}
      ${theme === 'dark' ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white/80 backdrop-blur-xl border-[#E8E5E0]'}`}>
      <div className="mx-auto flex max-w-md justify-between px-6 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative group flex flex-col items-center justify-center p-1.5 rounded-2xl transition-all duration-300 active:scale-90
                ${theme === 'dark'
                  ? isActive ? 'text-white' : 'text-[#7D7D7D] hover:text-[#BABABA]'
                  : isActive ? 'text-[#252525]' : 'text-[#7D7D7D] hover:text-[#545454]'
                }`}
            >
              <Icon 
                strokeWidth={isActive ? 2.5 : 2}
                className={`w-6 h-6 -translate-y-[5px] transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} 
              />
              
              {/* Instagram style bottom dot indicator */}
              {isActive && (
                <span className={`absolute -bottom-1 w-1 h-1 rounded-full animate-in zoom-in duration-300 ${
                  theme === 'dark' ? 'bg-white' : 'bg-[#252525]'
                }`} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
