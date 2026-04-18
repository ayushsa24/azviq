"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface SidebarContextType {
    open: boolean;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    open: true,
    toggle: () => { },
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initial load
    useEffect(() => {
        const saved = localStorage.getItem("sidebar_open");
        if (saved !== null) {
            setOpen(saved === "true");
        }
        setIsInitialized(true);
    }, []);

    // Save on change
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("sidebar_open", open.toString());
        }
    }, [open, isInitialized]);

    const toggle = () => setOpen(o => !o);

    return (
        <SidebarContext.Provider value={{ open, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    return useContext(SidebarContext);
}
