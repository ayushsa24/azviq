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

  const isForcedLightPage = 
    pathname === "/" ||
    pathname?.startsWith("/privacy") ||
    pathname?.startsWith("/terms") ||
    pathname?.startsWith("/help") ||
    pathname?.startsWith("/about") ||
    pathname?.startsWith("/contact") ||
    pathname?.startsWith("/feedback");

  // Force light mode on landing page and public legal/help pages
  const targetTheme = isForcedLightPage ? "light" : theme;

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

  if (targetTheme === "dark") {
    root.classList.add("dark");
    root.style.backgroundColor = "#1A1A1A";
    // Update all theme-color tags (including media-query ones) for Brave
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', '#1A1A1A'));
  } else {
    root.classList.remove("dark");

    const isWhiteHeader = 
      pathname?.includes("/library/note/") || 
      pathname?.includes("/library/pdf/") ||
      pathname?.includes("/preparation/exercise/") ||
      pathname?.includes("/preparation/revision/") ||
      pathname?.includes("/preparation/personal-ai/") ||
      pathname === "/ai" || 
      pathname?.startsWith("/ai/");
    
    // Public landing/policy pages use #F4F4F6, white editors/chats use #FFFFFF, standard app layouts use #F5F3EF
    const lightColor = isForcedLightPage ? "#F4F4F6" : (isWhiteHeader ? "#FFFFFF" : "#F5F3EF");
    root.style.backgroundColor = lightColor;
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

  // Save the user's real preference (not the forced override) so navigating
  // away from a forced-light page restores the correct theme.
  // We deliberately do NOT save "light" when the page forced it — that would
  // lose the user's actual dark preference.
  if (!isForcedLightPage) {
    localStorage.setItem("theme", theme);
  }
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
    // Only persist if not on a forced-light page, so the user's real
    // preference (e.g. dark) is never overwritten by the landing page.
    const forcedLightPaths = ["/", "/privacy", "/terms", "/help", "/about", "/contact", "/feedback"];
    const currentPath = window.location.pathname;
    const isForcedLight = forcedLightPaths.some(p => currentPath === p || currentPath.startsWith(p + "/"));
    if (!isForcedLight) {
      localStorage.setItem("theme", resolved);
    }
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
