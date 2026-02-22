"use client";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#252525] text-white' : 'bg-white text-gray-900'}`}>
      <Header onMenuClick={() => setOpen(!open)} />
      <Sidebar open={open} />

      <main className={`pt-19 transition-all duration-200 ${open ? 'md:pl-64 md:border-l-2' : 'md:pl-0'} pb-16 md:pb-0 overflow-hidden h-screen border-t-2 ${
        theme === 'dark' ? 'bg-[#161514] border-[#545454]' : 'bg-gray-50 border-gray-200'
      }`}>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
