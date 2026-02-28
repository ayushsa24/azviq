"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ZoomContextType = {
    zoomLevel: number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
};

// Default is 16px which corresponds to 100% zoom
const MIN_ZOOM = 12;
const MAX_ZOOM = 24;
const DEFAULT_ZOOM = 16;

const ZoomContext = createContext<ZoomContextType | undefined>(undefined);

export function ZoomProvider({ children }: { children: React.ReactNode }) {
    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);

    // Load saved zoom from localStorage on mount
    useEffect(() => {
        const savedZoom = localStorage.getItem("appZoomLevel");
        if (savedZoom) {
            setZoomLevel(parseInt(savedZoom, 10));
        }
    }, []);

    // Update HTML font-size whenever zoom changes
    useEffect(() => {
        document.documentElement.style.fontSize = `${zoomLevel}px`;
        localStorage.setItem("appZoomLevel", zoomLevel.toString());
    }, [zoomLevel]);

    const zoomIn = () => {
        setZoomLevel((prev) => Math.min(prev + 2, MAX_ZOOM));
    };

    const zoomOut = () => {
        setZoomLevel((prev) => Math.max(prev - 2, MIN_ZOOM));
    };

    const resetZoom = () => {
        setZoomLevel(DEFAULT_ZOOM);
    };

    return (
        <ZoomContext.Provider value={{ zoomLevel, zoomIn, zoomOut, resetZoom }}>
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
