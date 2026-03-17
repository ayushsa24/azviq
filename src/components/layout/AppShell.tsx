"use client";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import NotificationPanel from "./NotificationPanel";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { useState } from "react";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const isNoteEditor = pathname.includes("/library/note/");
  const isPrepSubView = pathname === "/preparation" && !!searchParams.get("id") && (searchParams.get("tab") === "exercise" || searchParams.get("tab") === "revision");
  const isFullPageLayer = isPdfEditor || isNoteEditor || isPrepSubView;

  return (
    <div className={`h-[100dvh] overflow-hidden flex flex-col transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#252525]'}`}>

      {/* Header: mobile only on Dashboard, hidden on desktop */}
      {isDashboard && (
        <div className="md:hidden">
          <Header open={open} onMenuClick={toggle} />
        </div>
      )}

      {!isFullPageLayer ? (
        <Sidebar
          open={open}
          isHovered={isSidebarHovered}
          onMouseLeave={() => setIsSidebarHovered(false)}
        />
      ) : (
        <div className="hidden md:contents">
          <Sidebar
            open={open}
            isHovered={isSidebarHovered}
            onMouseLeave={() => setIsSidebarHovered(false)}
          />
        </div>
      )}

      {/* Global Notification Panel */}
      <NotificationPanel />

      {!open && (
        <div
          className={`fixed left-0 top-0 w-3 h-full z-[55] ${isFullPageLayer ? 'hidden' : 'flex'} md:flex items-center group`}
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
          ? 'pt-[calc(3.25rem+env(safe-area-inset-top,0px))] md:pt-0'
          : isFullPageLayer ? 'pt-[env(safe-area-inset-top,0px)]' : 'pt-[env(safe-area-inset-top,0px)] md:pt-0'}
        flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${open ? 'md:pl-56' : 'md:pl-0'}
        ${isKeyboardOpen || isFullPageLayer ? 'pb-0' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0'} flex-1 min-h-0
        ${theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-[#F5F3EF]'}
      `}>
        {children}
      </main>

      {!isFullPageLayer && <BottomNav />}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LibraryProvider>
        <Suspense fallback={null}>
          <AppShellInner>{children}</AppShellInner>
        </Suspense>
      </LibraryProvider>
    </SidebarProvider>
  );
}
