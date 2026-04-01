"use client";

import { useSidebar } from "@/contexts/SidebarContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PanelLeft, ChevronsLeft } from "lucide-react";

export default function SidebarToggleButton() {
    const { open, toggle } = useSidebar();
    const { theme } = useTheme();
    const isDark = theme === "dark";

    if (open) return null;

    return (
        <button
            onClick={toggle}
            title={open ? "Close sidebar" : "Open sidebar"}
            className={`hidden md:flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0
                ${isDark
                    ? "bg-[#252525] border border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]"
                    : "bg-white border border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#F0EDE8]"
                }`}
        >
            {open
                ? <ChevronsLeft className="w-5 h-5" />
                : <PanelLeft className="w-5 h-5" />
            }
        </button>
    );
}
