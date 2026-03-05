"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { useState } from "react";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, toggle } = useSidebar();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const { theme } = useTheme();

  const isDashboard = pathname === "/dashboard";

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F3EF] text-[#252525]'}`}>

      {/* Header: mobile only on Dashboard, hidden on desktop */}
      {isDashboard && (
        <div className="md:hidden">
          <Header open={open} onMenuClick={toggle} />
        </div>
      )}

      <Sidebar
        open={open}
        isHovered={isSidebarHovered}
        onMouseLeave={() => setIsSidebarHovered(false)}
      />

      {!open && (
        <div
          className="fixed left-0 top-0 w-3 h-full z-[55] hidden md:flex items-center group"
          onMouseEnter={() => setIsSidebarHovered(true)}
        >
          {/* Thin visual indicator — slides right on hover */}
          <div className={`w-0.5 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ml-0.5
            ${theme === 'dark' ? 'bg-[#545454]' : 'bg-[#CFCFCF]'}`}
          />
        </div>
      )}

      <main className={`
        ${isDashboard
          ? 'pt-[calc(5rem+env(safe-area-inset-top,0px))] md:pt-0'
          : 'pt-[calc(env(safe-area-inset-top,0px)+28px)] md:pt-0'}
        flex flex-col overflow-hidden transition-all duration-300 ease-in-out
        ${open ? 'md:pl-56' : 'md:pl-0'}
        pb-[calc(3.5rem+env(safe-area-inset-bottom,1rem))] md:pb-0 h-screen
        ${theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-[#F5F3EF]'}
      `}>
        {children}
      </main>

      <BottomNav />
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
