"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(pathname !== "/ai");
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const { theme } = useTheme();

  // Automatically close sidebar ONLY on the API page. Maintain user preference otherwise.
  useEffect(() => {
    if (pathname === "/ai") {
      setOpen(false);
    }
  }, [pathname]);

  const isAiRoute = pathname === "/ai";

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#252525] text-white' : 'bg-white text-gray-900'}`}>

      <Header open={open} onMenuClick={() => setOpen(!open)} />

      <Sidebar
        open={open}
        isHovered={isSidebarHovered}
        onMouseLeave={() => setIsSidebarHovered(false)}
      />

      {!open && (
        <div
          className="fixed left-0 top-0 w-6 h-full z-[55] hidden md:block"
          onMouseEnter={() => setIsSidebarHovered(true)}
        />
      )}

      <main className={`pt-[calc(5rem+env(safe-area-inset-top,0px))] md:pt-16 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${open ? 'md:pl-56' : 'md:pl-0'
        } pb-[calc(3.5rem+env(safe-area-inset-bottom,1rem))] md:pb-0 h-screen ${theme === 'dark' ? 'bg-[#161514]' : 'bg-gray-50'
        }`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
