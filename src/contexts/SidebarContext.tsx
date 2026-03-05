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
    const [open, setOpen] = useState(pathname !== "/ai");

    useEffect(() => {
        if (pathname === "/ai") setOpen(false);
    }, [pathname]);

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
