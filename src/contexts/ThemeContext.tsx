"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Instantly apply the .dark class without CSS transitions firing (prevents flash)
function applyTheme(theme: Theme, pathname: string | null = null) {
  const root = document.documentElement;

  // Temporarily disable all transitions so the class-swap is instantaneous
  const style = document.createElement("style");
  style.id = "__theme-transition-disable";
  style.textContent = "*, *::before, *::after { transition: none !important; }";
  document.head.appendChild(style);

  let themeMeta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!themeMeta) {
    // Fallback: grab the ID'd one
    themeMeta = document.getElementById('theme-color-meta');
  }
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }

  if (theme === "dark") {
    root.classList.add("dark");
    root.style.backgroundColor = "#1A1A1A";
    // Update all theme-color tags (including media-query ones) for Brave
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', '#1A1A1A'));
  } else {
    root.classList.remove("dark");
    root.style.backgroundColor = "#F5F3EF";
    const isWhiteHeader = 
      pathname?.includes("/library/note/") || 
      pathname?.includes("/library/pdf/") ||
      pathname?.includes("/preparation/exercise/") ||
      pathname?.includes("/preparation/revision/") ||
      pathname?.includes("/preparation/personal-ai/") ||
      pathname === "/ai" || 
      pathname?.startsWith("/ai/");
    const lightColor = isWhiteHeader ? "#FFFFFF" : "#F5F3EF";
    // Update all theme-color tags for Brave + the media-query light one
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', lightColor));
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

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
    localStorage.setItem("theme", resolved);
    setMounted(true);
  }, []);

  // Update theme color meta tags when navigating between pages with different header colors
  useEffect(() => {
    if (mounted) {
      applyTheme(theme, pathname);
    }
  }, [pathname, theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next, pathname);
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
