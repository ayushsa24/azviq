"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ZoomContextType = {
    zoomLevel: number;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoom: (value: number) => void;
    resetZoom: () => void;
};

// Zoom level is now a percentage (100 = 100%)
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export function ZoomProvider({ children }: { children: React.ReactNode }) {
    const [zoomLevel, setZoomLevel] = useState(100);

    // Load saved zoom from localStorage on mount
    useEffect(() => {
        const savedZoom = localStorage.getItem("appZoomLevelPercent");
        if (savedZoom) {
            setZoomLevel(parseFloat(savedZoom));
        }
    }, []);

    // Update HTML font-size whenever zoom changes or window resizes
    useEffect(() => {
        const updateFontSize = () => {
            // Mobile base: 15.2px (95% of original 16px) makes it slightly more compact by default
            // Desktop base: 14.4px
            const baseSize = window.innerWidth >= 1024 ? 14.4 : 15.2;
            const newFontSize = baseSize * (zoomLevel / 100);
            document.documentElement.style.fontSize = `${newFontSize}px`;
        };

        updateFontSize();
        localStorage.setItem("appZoomLevelPercent", zoomLevel.toString());

        window.addEventListener("resize", updateFontSize);
        return () => window.removeEventListener("resize", updateFontSize);
    }, [zoomLevel]);

    const zoomIn = () => {
        setZoomLevel((prev) => Math.min(prev + 10, MAX_ZOOM));
    };

    const zoomOut = () => {
        setZoomLevel((prev) => Math.max(prev - 10, MIN_ZOOM));
    };

    const setZoom = (value: number) => {
        setZoomLevel(Math.min(Math.max(value, MIN_ZOOM), MAX_ZOOM));
    };

    const resetZoom = () => {
        setZoomLevel(100);
    };

    return (
        <ZoomContext.Provider value={{ zoomLevel, zoomIn, zoomOut, setZoom, resetZoom }}>
            {children}
        </ZoomContext.Provider>
    );
}

export function useZoom() {
    const context = useContext(ZoomContext);
    if (context === undefined) {
        throw new Error("useZoom must be used within a ZoomProvider");
    }
    return context;
}
