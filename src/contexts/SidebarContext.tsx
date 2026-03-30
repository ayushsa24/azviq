"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
    open: boolean;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(true);

    const toggle = () => setOpen(o => !o);

    return (
        <SidebarContext.Provider value={{ open, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within SidebarProvider");
    }
    return context;
}
