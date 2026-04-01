"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Instantly apply the .dark class without CSS transitions firing (prevents flash)
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Temporarily disable all transitions so the class-swap is instantaneous
  const style = document.createElement("style");
  style.id = "__theme-transition-disable";
  style.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.appendChild(style);

  if (theme === "dark") {
    root.classList.add("dark");
    root.style.backgroundColor = "#161514";
  } else {
    root.classList.remove("dark");
    root.style.backgroundColor = "#F5F3EF";
  }

  // Re-enable transitions after one paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById("__theme-transition-disable");
      if (el) el.remove();
    });
  });

  localStorage.setItem("theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // On mount: read saved preference and apply without any flash
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    let resolved: Theme = "light";

    if (savedTheme === "light" || savedTheme === "dark") {
      resolved = savedTheme;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      resolved = "dark";
    }

    setTheme(resolved);
    // The inline script in layout.tsx already set the class — no need to re-apply here
    // but we sync localStorage just in case
    localStorage.setItem("theme", resolved);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
