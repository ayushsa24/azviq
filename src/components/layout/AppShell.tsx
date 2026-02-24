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
  const { theme } = useTheme();

  // Automatically close sidebar ONLY on the API page. Open it otherwise.
  useEffect(() => {
    if (pathname === "/ai") {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [pathname]);

  const isAiRoute = pathname === "/ai";

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ease-in-out ${theme === 'dark' ? 'bg-[#252525] text-white' : 'bg-white text-gray-900'}`}>

      <Header onMenuClick={() => setOpen(!open)} />

      <Sidebar open={open} />

      <main className={`pt-16 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${open ? 'md:pl-56' : 'md:pl-0'
        } pb-16 md:pb-0 h-screen ${theme === 'dark' ? 'bg-[#161514]' : 'bg-gray-50'
        }`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
