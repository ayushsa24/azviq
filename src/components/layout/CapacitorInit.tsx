"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

export default function CapacitorInit() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  // 1. Hide Splash Screen & Setup Back Button Listener
  useEffect(() => {
    // We dynamically check and import Capacitor so it doesn't run during SSR/Build
    let activeListener: { remove: () => void } | null = null;

    const initCapacitor = async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      // Hide native splash screen
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch (e) {
        console.warn("Capacitor: Splashscreen hide failed", e);
      }

      // Add back button listener for Android
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          // If we are on one of the main dashboard tabs or landing pages, or cannot go back
          const isMainPage = 
            pathname === "/" || 
            pathname === "/dashboard" || 
            pathname === "/login" || 
            pathname === "/signup" || 
            pathname === "/preparation" ||
            pathname === "/library";

          if (!canGoBack || isMainPage) {
            App.exitApp();
          } else {
            router.back();
          }
        });
        activeListener = listener;
      } catch (e) {
        console.warn("Capacitor: Back button registration failed", e);
      }
    };

    initCapacitor();

    return () => {
      if (activeListener) {
        activeListener.remove();
      }
    };
  }, [pathname, router]);

  // 2. Track theme & path changes to update the native StatusBar background color dynamically
  useEffect(() => {
    const updateStatusBar = async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const isDark = document.documentElement.classList.contains("dark") || theme === "dark";

        const isForcedLightPage =
          pathname === "/" ||
          pathname?.startsWith("/privacy") ||
          pathname?.startsWith("/terms") ||
          pathname?.startsWith("/help") ||
          pathname?.startsWith("/about") ||
          pathname?.startsWith("/contact") ||
          pathname?.startsWith("/feedback");

        const isWhiteHeader =
          pathname?.includes("/library/note/") ||
          pathname?.includes("/library/pdf/") ||
          pathname?.includes("/preparation/exercise/") ||
          pathname?.includes("/preparation/revision/") ||
          pathname?.includes("/preparation/personal-ai/") ||
          pathname === "/ai" ||
          pathname?.startsWith("/ai/");

        const targetDark = isForcedLightPage ? false : isDark;
        const color = targetDark
          ? "#1A1A1A"
          : isForcedLightPage
          ? "#F4F4F6"
          : isWhiteHeader
          ? "#FFFFFF"
          : "#F5F3EF";

        await StatusBar.setBackgroundColor({ color });
        await StatusBar.setStyle({
          style: targetDark ? Style.Dark : Style.Light,
        });

        // Style the Android system navigation bar dynamically to match the theme color
        try {
          const { NavigationBar, Style } = await import("@capawesome/capacitor-navigation-bar");
          await NavigationBar.setColor({ color });
          await NavigationBar.setStyle({
            style: targetDark ? Style.Dark : Style.Light,
          });
        } catch (nbError) {
          console.warn("Capacitor: NavigationBar update failed", nbError);
        }
      } catch (e) {
        console.warn("Capacitor: StatusBar update failed", e);
      }
    };

    updateStatusBar();
  }, [theme, pathname]);

  // 3. Global Haptic Feedback for native app click events
  useEffect(() => {
    let active = true;
    let Haptics: any = null;
    let ImpactStyle: any = null;

    const initHaptics = async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      try {
        const module = await import("@capacitor/haptics");
        Haptics = module.Haptics;
        ImpactStyle = module.ImpactStyle;
      } catch (e) {
        console.warn("Capacitor: Haptics load failed", e);
      }
    };

    initHaptics();

    const handleGlobalClick = async (e: MouseEvent) => {
      if (!active || !Haptics || !ImpactStyle) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Detect common interactive elements or Tailwind pointer elements
      const isInteractive = target.closest(
        'button, a, [role="button"], input[type="submit"], input[type="checkbox"], input[type="radio"], [class*="cursor-pointer"]'
      );

      if (isInteractive) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch (err) {
          // Fail silently
        }
      }
    };

    window.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      active = false;
      window.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  return null;
}
