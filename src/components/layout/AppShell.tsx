"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import NotificationPanel from "./NotificationPanel";
import { useState } from "react";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, toggle } = useSidebar();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const { theme } = useTheme();

  const isDashboard = pathname === "/dashboard";
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
    const handleFocusOut = () => setIsKeyboardOpen(false);

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const isPdfEditor = pathname.includes("/library/pdf/");

  return (
    <div className={`h-[100dvh] overflow-hidden flex flex-col transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#252525]'}`}>

      {/* Header: mobile only on Dashboard, hidden on desktop */}
      {isDashboard && (
        <div className="md:hidden">
          <Header open={open} onMenuClick={toggle} />
        </div>
      )}

      {!isPdfEditor && (
        <Sidebar
          open={open}
          isHovered={isSidebarHovered}
          onMouseLeave={() => setIsSidebarHovered(false)}
        />
      )}

      {/* Global Notification Panel */}
      <NotificationPanel />

      {!open && !isPdfEditor && (
        <div
          className="fixed left-0 top-0 w-3 h-full z-[55] hidden md:flex items-center group"
          onMouseEnter={() => setIsSidebarHovered(true)}
        >
          {/* Thin visual indicator — slides right on hover */}
          <div className={`w-0.5 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ml-0.5
            ${theme === 'dark' ? 'bg-[#545454]' : 'bg-[#E8E5E0]'}`}
          />
        </div>
      )}

      <main className={`
        ${isDashboard
          ? 'pt-[calc(5rem+env(safe-area-inset-top,0px))] md:pt-0'
          : isPdfEditor ? 'pt-[env(safe-area-inset-top,0px)]' : 'pt-[calc(env(safe-area-inset-top,0px)+28px)] md:pt-0'}
        flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${open && !isPdfEditor ? 'md:pl-56' : 'md:pl-0'}
        ${isKeyboardOpen || isPdfEditor ? 'pb-0' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom,1rem))] md:pb-0'} flex-1 min-h-0
        ${theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-[#F5F3EF]'}
      `}>
        {children}
      </main>

      {!isPdfEditor && <BottomNav />}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
