"use client";

import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PanelLeft, PanelLeftClose } from "lucide-react";

export default function SidebarToggleButton() {
    const { open, toggle } = useSidebar();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    if (open) return null;

    return (
        <button
            onClick={toggle}
            title={open ? "Close sidebar" : "Open sidebar"}
            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 shrink-0
                ${isDark
                    ? "bg-[#252525] border-[#545454] text-[#BABABA] hover:bg-white hover:text-[#252525] hover:border-white"
                    : "bg-white border-[#E8E5E0] text-[#545454] hover:bg-[#252525] hover:text-white hover:border-[#252525]"
                }`}
        >
            {open
                ? <PanelLeftClose className="w-4 h-4" />
                : <PanelLeft className="w-4 h-4" />
            }
        </button>
    );
}
