"use client";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "@/contexts/ThemeContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import NotificationPanel from "./NotificationPanel";
import SettingsModal from "./SettingsModal";
import { useSettings } from "@/contexts/SettingsContext";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import TrashModal from "./TrashModal";
import ProfileModal from "./ProfileModal";
import PricingModal from "../PricingModal";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { open, toggle, isHovered, setIsHovered } = useSidebar();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // @ts-ignore
      if (session.user.is_onboarded === false) {
        router.push("/signup?onboarding=true");
      }
    }
  }, [status, session, router]);


  const isDashboard = pathname === "/dashboard";
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const { isProfileOpen, openProfile, closeProfile } = useProfile();
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const isAiPage = pathname.startsWith("/ai");

  useEffect(() => {
    const handleSidebarState = (e: any) => {
      setIsAiSidebarOpen(e.detail.isOpen);
    };
    window.addEventListener('ai-sidebar-state', handleSidebarState);
    return () => window.removeEventListener('ai-sidebar-state', handleSidebarState);
  }, []);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        setIsKeyboardOpen(true);
      }
    };
    const handleFocusOut = () => setIsKeyboardOpen(false);

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  // Global trigger for Pricing Modal
  useEffect(() => {
    const handleOpenPricing = () => setIsPricingOpen(true);
    window.addEventListener("open-pricing", handleOpenPricing);
    return () => window.removeEventListener("open-pricing", handleOpenPricing);
  }, []);

  // Global trigger for Trash Modal
  useEffect(() => {
    const handleOpenTrash = () => setIsTrashOpen(true);
    window.addEventListener("open-trash", handleOpenTrash);
    return () => window.removeEventListener("open-trash", handleOpenTrash);
  }, []);

  useEffect(() => {
    const tickTimer = () => {
      if (document.hidden) return; // Automatic pause when moving out
      if (localStorage.getItem('study_timer_active') !== 'true') return;

      const savedStudy = localStorage.getItem("dashboard_study_data");
      if (savedStudy) {
        try {
          const parsed = JSON.parse(savedStudy);
          // Helper to get local date string YYYY-MM-DD
          const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          
          if (parsed.date === today) {
            const nextElapsed = (parsed.elapsedSeconds || 0) + 1;
            let shouldStop = false;
            if (parsed.targetMinutes !== null && nextElapsed >= parsed.targetMinutes * 60) {
              shouldStop = true;
              localStorage.setItem('study_timer_active', 'false');
              window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: false } }));
            }
            const updated = { ...parsed, elapsedSeconds: nextElapsed };
            localStorage.setItem("dashboard_study_data", JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('study-timer-tick', { detail: { studyData: updated, isActive: !shouldStop } }));
          } else {
            const reset = { date: today, elapsedSeconds: 0, targetMinutes: null };
            localStorage.setItem("dashboard_study_data", JSON.stringify(reset));
            localStorage.setItem('study_timer_active', 'false');
            window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: false } }));
            window.dispatchEvent(new CustomEvent('study-timer-tick', { detail: { studyData: reset, isActive: false } }));
          }
        } catch (e) {}
      }
    };
    const interval = setInterval(tickTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const fromParam = searchParams.get("from");
  const { openSettings, isOpen } = useSettings();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle Settings Refresh Restoration
  useEffect(() => {
    if (isInitialLoad && pathname.startsWith("/settings") && fromParam && !isOpen) {
      setIsInitialLoad(false);
      // We are on a settings page that has a background path, but the modal isn't 'open' via context yet.
      // This happens on a fresh page load/refresh.
      // To show the background, we must navigate back to it, then reopen the settings.
      const segments = pathname.split("/").filter(Boolean);
      const tab = segments[1] || "general";
      
      // Navigate to the 'from' page and tell it to reopen settings
      router.replace(`${fromParam}${fromParam.includes('?') ? '&' : '?'}restore_settings=${tab}`);
    } else if (isInitialLoad && (pathname.startsWith("/settings") || pathname.startsWith("/profile")) && !isProfileOpen && !isOpen) {
      setIsInitialLoad(false);
      const target = fromParam || "/dashboard";
      if (pathname.startsWith("/settings")) {
        const segments = pathname.split("/").filter(Boolean);
        const tab = segments[1] || "general";
        router.replace(`${target}${target.includes('?') ? '&' : '?'}restore_settings=${tab}`);
      } else {
        router.replace(`${target}${target.includes('?') ? '&' : '?'}restore_profile=true`);
      }
    } else if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [pathname, fromParam, router, isOpen, isProfileOpen, isInitialLoad]);

  // Handle Restoration on the target page
  useEffect(() => {
    const restoreTab = searchParams.get("restore_settings");
    if (restoreTab) {
      // Trigger the modal via context
      openSettings(restoreTab);
    }

    if (searchParams.get("restore_profile") === "true") {
      openProfile();
    }
  }, [searchParams, openSettings, openProfile]);
  const checkIsFullPage = (path: string, params: URLSearchParams | null) => {
    const isPdf = path.includes("/library/pdf/");
    const isNote = path.includes("/library/note/");
    const isAi = path === "/ai" || path.startsWith("/ai/");
    const isPrep = path.includes("/preparation") && (
      (!!params?.get("id") && (params?.get("tab") === "exercise" || params?.get("tab") === "revision")) ||
      path.includes("/preparation/exercise/") ||
      path.includes("/preparation/revision/") ||
      params?.get("fullscreen") === "true"
    );
    return isPdf || isNote || isPrep || isAi;
  };

  const isSettingsOrTrash = pathname === "/settings" || 
                            pathname === "/trash" || 
                            pathname.startsWith("/settings/");

  let isFullPageLayer = false;
  if (isSettingsOrTrash && fromParam) {
    try {
      const fromUrl = new URL(fromParam, "http://localhost:3000"); // base doesn't matter for query parsing
      isFullPageLayer = checkIsFullPage(fromUrl.pathname, fromUrl.searchParams);
    } catch (e) {
      isFullPageLayer = checkIsFullPage(pathname, searchParams);
    }
  } else {
    isFullPageLayer = checkIsFullPage(pathname, searchParams);
  }

  return (
    <div 
      suppressHydrationWarning
      className="h-[100dvh] overflow-hidden flex flex-col bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] text-foreground"
    >

      {mounted && (!isFullPageLayer ? (
        <Sidebar
          open={open}
          isHovered={isHovered}
          onMouseLeave={() => setIsHovered(false)}
          onTrashClick={() => setIsTrashOpen(true)}
          onUpgradeClick={() => setIsPricingOpen(true)}
        />
      ) : (
        <div className="hidden md:contents">
          <Sidebar
            open={open}
            isHovered={isHovered}
            onMouseLeave={() => setIsHovered(false)}
            onTrashClick={() => setIsTrashOpen(true)}
            onUpgradeClick={() => setIsPricingOpen(true)}
          />
        </div>
      ))}

      {/* Global Notification Panel */}
      <NotificationPanel />

      {/* Global Setting Popup */}
      <SettingsModal />

      {/* Global Trash Popup */}
      <TrashModal isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} />

      {/* Global Profile Popup */}
      <ProfileModal open={isProfileOpen} onClose={closeProfile} />

      {/* Global Pricing Popup */}
      <PricingModal open={isPricingOpen} onClose={() => setIsPricingOpen(false)} />

      {mounted && !open && (
        <div
          className="fixed left-0 top-0 w-3 h-full z-[55] flex md:flex items-center group"
          onMouseEnter={() => setIsHovered(true)}
        >
          {/* Thin visual indicator — slides right on hover */}
          <div className={`w-0.5 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ml-0.5
            ${theme === 'dark' ? 'bg-[#545454]' : 'bg-[#E8E5E0]'}`}
          />
        </div>
      )}

      <main 
        suppressHydrationWarning
        className={`flex flex-col overflow-hidden flex-1 min-h-0 
          ${isFullPageLayer ? 'pt-[env(safe-area-inset-top,0px)]' : 'pt-0'} 
          ${mounted && open 
            ? 'md:pl-[16rem]' 
            : mounted && !open && !isFullPageLayer 
              ? 'md:px-[2.5%]' 
              : 'px-0'} 
          ${mounted && (isKeyboardOpen || (isFullPageLayer && !isAiPage) || (isAiPage && !isBottomNavVisible)) ? 'pb-0' : 'pb-[calc(3rem+env(safe-area-inset-bottom,0px))] md:pb-0'} 
          transition-all duration-300 bg-transparent`}
      >
        {mounted && children}
      </main>

      {/* Swipe Handle for AI Chat BottomNav */}
      {mounted && isAiPage && !isKeyboardOpen && !isAiSidebarOpen && (
        <div className="fixed bottom-[calc(2.9rem+env(safe-area-inset-bottom,0px))] md:hidden left-0 right-0 z-[65] flex justify-center pointer-events-none">
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 20) setIsBottomNavVisible(false);
              else if (info.offset.y < -20) setIsBottomNavVisible(true);
            }}
            className={`w-12 h-6 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing transition-transform ${!isBottomNavVisible ? 'translate-y-[calc(3.2rem+env(safe-area-inset-bottom,0px))]' : ''}`}
          >
            <div className={`w-12 h-1 rounded-full ${theme === 'dark' ? 'bg-[#545454]' : 'bg-[#E8E5E0]'} opacity-60`} />
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {mounted && !isKeyboardOpen && !(isFullPageLayer && !isAiPage) && isBottomNavVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
          >
            <BottomNav isFullPageLayer={false} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ProfileProvider>
        <Suspense fallback={null}>
          <AppShellInner>{children}</AppShellInner>
        </Suspense>
      </ProfileProvider>
    </SidebarProvider>
  );
}
