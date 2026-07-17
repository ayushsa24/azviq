"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface SettingsContextType {
  isOpen: boolean;
  initialTab: string;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("general");

  const openSettings = React.useCallback((tab?: string) => {
    if (tab) setInitialTab(tab);
    setIsOpen(true);
  }, []);
  const closeSettings = React.useCallback(() => {
    setIsOpen(false);
    setInitialTab("general");
  }, []);

  return (
    <SettingsContext.Provider value={{ isOpen, initialTab, openSettings, closeSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
