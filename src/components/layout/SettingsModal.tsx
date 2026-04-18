"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import useSWR from "swr";
import { usePathname, useSearchParams } from "next/navigation";
import {
  X,
  Bell,
  ShieldAlert,
  User,
  Moon,
  Sun,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  BellOff,
  CalendarClock,
  AlertTriangle,
  Globe,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  CheckSquare,
  Plus,
  Loader2,
  Info,
  Check,
  Clock,
  ExternalLink,
  ChevronRight,
  Link as LinkIcon,
  MessageSquare,
  FileText as FileIcon2,
  Trash2 as TrashIcon,
  MoreHorizontal,
  ArchiveRestore,
  Archive as ArchiveIcon,
  Sparkles,
  Lock,
  Save,
  CheckCircle2,
  Crown
} from "lucide-react";
import { SharedLinksModal } from "./SharedLinksModal";
import { ImportersModal } from "../modals/ImportersModal";
import { useTheme } from "@/contexts/ThemeContext";
import { useZoom } from "@/contexts/ZoomContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSession, signOut } from "next-auth/react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLanguage, LanguageCode } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { translations } from "@/utils/translations";

type Tab = "general" | "notifications" | "models" | "data" | "account" | "parent_control";

interface SettingsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function SettingsModalInner({ isOpen: propIsOpen, onClose: propOnClose }: SettingsModalProps = {}) {
  const { isOpen: contextIsOpen, closeSettings, initialTab } = useSettings();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "/dashboard";
  
  // Use prop if provided, otherwise fallback to context
  const isOpen = propIsOpen !== undefined ? propIsOpen : contextIsOpen;
  const originalClose = propOnClose || closeSettings;

  const handleClose = () => {
    // Revert the URL to the actual originating page
    if (typeof window !== "undefined") {
      window.history.pushState(null, '', fromParam);
    }
    originalClose();
  };

  const { theme, toggleTheme } = useTheme();
  const { zoomLevel, setZoom, zoomIn, zoomOut, resetZoom } = useZoom();
  const { language, setLanguage } = useLanguage();
  const {
    pushPermission,
    requestPushPermission,
    studyReminders,
    setStudyReminders,
    aiAlerts,
    setAiAlerts,
    todoReminders,
    setTodoReminders,
    taskDueReminders,
    setTaskDueReminders,
    doNotDisturb,
    setDoNotDisturb
  } = useNotifications();

  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("general");


  const isDark = theme === "dark";

  // Sync state when URL changes (Back/Forward buttons & Initial Load)
  useEffect(() => {
    if (!isOpen) return;
    
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "settings") {
      const tabFromPath = segments[1] as Tab;
      const validTabs: Tab[] = ["general", "notifications", "models", "data", "account", "parent_control"];
      
      if (tabFromPath && validTabs.includes(tabFromPath)) {
        if (tabFromPath !== activeTab) {
          setActiveTab(tabFromPath);
        }
      } else if (["chatsharedlink", "notesharedlink", "archivechat", "importnotes", "importchats"].includes(segments[1])) {
        // These sub-modals belong to the Data tab
        if (activeTab !== "data") {
          setActiveTab("data");
        }
      } else if (!segments[1] && activeTab !== "general") {
        // Default to general only for the base /settings route
        setActiveTab("general");
      }
    }
  }, [pathname, isOpen]);

  // Sync URL when tab changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Skip URL update if we are currently in a sub-modal route (they manage their own URLs)
    const subModalRoutes = ["chatsharedlink", "notesharedlink", "archivechat", "importnotes", "importchats"];
    const segments = pathname.split("/").filter(Boolean);
    const isSubModal = segments[0] === "settings" && subModalRoutes.includes(segments[1]);
    
    if (isSubModal) return;

    const targetPath = activeTab === "general" ? "/settings" : `/settings/${activeTab}`;
    const currentUrl = new URL(window.location.href);
    
    if (currentUrl.pathname !== targetPath) {
      const newUrl = `${targetPath}?from=${encodeURIComponent(fromParam)}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeTab, isOpen, fromParam, pathname]);

  // State for Account deletion
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [showSharedLinks, setShowSharedLinks] = useState(() => {
    if (typeof window === "undefined") return false;
    return pathname.includes("/settings/notesharedlink") || 
           pathname.includes("/settings/chatsharedlink") || 
           pathname.includes("/settings/archivechat");
  });
  
  const [linksType, setLinksType] = useState<"chat" | "note" | "archive" | "import" | "import-chat">(() => {
    if (typeof window !== "undefined") {
      if (pathname.includes("/settings/notesharedlink")) return "note";
      if (pathname.includes("/settings/archivechat")) return "archive";
      if (pathname.includes("/settings/importnotes")) return "import";
      if (pathname.includes("/settings/importchats")) return "import-chat";
    }
    return "chat";
  });

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [importerModalData, setImporterModalData] = useState<{ type: "chat" | "note", id: string } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string | "all", title: string } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      const subModalMap: Record<string, { tab: Tab, type: "chat" | "note" | "archive" | "import" | "import-chat" }> = {
        "chatsharedlink": { tab: "data", type: "chat" },
        "notesharedlink": { tab: "data", type: "note" },
        "archivechat": { tab: "data", type: "archive" },
        "importnotes": { tab: "data", type: "import" },
        "importchats": { tab: "data", type: "import-chat" }
      };

      if (subModalMap[initialTab]) {
        const { tab, type } = subModalMap[initialTab];
        setActiveTab(tab);
        setLinksType(type);
        setShowSharedLinks(true);
      } else {
        setActiveTab(initialTab as Tab);
      }
    }
  }, [isOpen, initialTab]);

  // Handle mobile hardware back button to intuitively close the shared links popup
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      const isSubModalRoute = currentPath.includes("/settings/notesharedlink") || 
                              currentPath.includes("/settings/chatsharedlink") || 
                              currentPath.includes("/settings/archivechat");

      if (!isSubModalRoute && showSharedLinks) {
        setShowSharedLinks(false);
      }
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showSharedLinks]);

  const { data: sharedLinksData, mutate: mutateSharedLinks, error: sharedLinksError } = useSWR(
    showSharedLinks ? (
      linksType === "chat" ? "/api/share/chat" :
        linksType === "note" ? "/api/share/note" :
          linksType === "import" ? "/api/notes?imported=true&all=true" :
            linksType === "import-chat" ? "/api/chat/history?imported=true&all=true" :
              "/api/chat/history?archived=true"
    ) : null
  );
  const sharedLinks = (
    linksType === "chat" ? sharedLinksData?.links :
      linksType === "note" ? sharedLinksData?.notes :
        linksType === "import" ? sharedLinksData?.notes :
          linksType === "import-chat" ? sharedLinksData?.chats :
            sharedLinksData?.chats?.filter((c: any) => c.is_archived)
  ) || [];
  const isLoadingLinks = !sharedLinksData && !sharedLinksError && showSharedLinks;

  const handleRevokeLink = async (id: string) => {
    setRevokingId(id);
    try {
      let endpoint = "";
      let method = "DELETE";
      let body: any = null;

      if (linksType === "chat") endpoint = `/api/share/chat/${id}`;
      else if (linksType === "note") endpoint = `/api/share/note/${id}`;
      else if (linksType === "archive") endpoint = `/api/chat/history/${id}`;

      const res = await fetch(endpoint, { method, body });
      if (res.ok) mutateSharedLinks();
    } catch (err) {
      console.error("Failed to revoke link", err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      setRevokingId(id);
      const res = await fetch(`/api/chat/history/${id}`, { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false })
      });
      if (res.ok) mutateSharedLinks();
    } catch (e) {
      console.error("Failed to unarchive", e);
    } finally {
      setRevokingId(null);
    }
  };

  const handleArchiveAllHistory = async () => {
    try {
      setIsBulkDeleting(true);
      await fetch("/api/chat/history/bulk", { method: "PATCH" });
      mutateSharedLinks();
      // Also mutate the main history if we have access to it, 
      // but usually SWR handles it if they share the same key or are refreshed.
    } catch (e) {
      console.error("Failed bulk archive", e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAllHistory = async () => {
    try {
      setIsBulkDeleting(true);
      await fetch("/api/chat/history/bulk", { method: "DELETE" });
      mutateSharedLinks();
    } catch (e) {
      console.error("Failed bulk delete archives", e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsBulkDeleting(true);
      const url = linksType === "chat" ? "/api/share/chat/bulk" :
        linksType === "note" ? "/api/share/note/bulk" :
          "/api/chat/history/bulk";

      await fetch(url, { method: "DELETE" });
      mutateSharedLinks();
      setShowBulkMenu(false);
    } catch (e) {
      console.error("Failed bulk delete", e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const [notificationSound, setNotificationSound] = useState("chime");

  // AI Model Settings
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-lite");
  const [responseStyle, setResponseStyle] = useState<"balanced" | "creative" | "precise">("balanced");
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelSaveSuccess, setModelSaveSuccess] = useState(false);
  const [subscription, setSubscription] = useState<{ 
    plan_tier: number; 
    plan_name: string; 
    usage?: {
      chat: { remaining: number; limit: number; reset: number };
      vision: { remaining: number; limit: number; reset: number };
      exercise: { remaining: number; limit: number; reset: number };
      personal_ai: { remaining: number; limit: number; reset: number };
      note_ai: { remaining: number; limit: number; reset: number };
    }
  } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch AI settings and subscription from Supabase when models tab opens
  useEffect(() => {
    if (activeTab === "models" && isOpen) {
      setLoadingModels(true);
      // Fetch AI settings and subscription in parallel
      Promise.all([
        fetch("/api/user/ai-settings").then((r) => r.json()),
        fetch("/api/user/subscription").then((r) => r.json())
      ])
        .then(([aiData, subData]) => {
          setSubscription(subData);
          const userTier = subData?.plan_tier ?? 0;
          
          // Enforce default model for free tier, or load saved setting for others
          if (userTier === 0) {
            setSelectedModel("gemini-2.5-flash-lite");
          } else if (aiData.ai_model) {
            setSelectedModel(aiData.ai_model);
          }
          
          if (aiData.response_style) setResponseStyle(aiData.response_style);
        })
        .catch(() => {})
        .finally(() => {
          setLoadingModels(false);
        });
    }
  }, [activeTab, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveModelSettings = async (newModel?: string, newStyle?: string) => {
    setIsSavingModel(true);
    try {
      await fetch("/api/user/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ai_model: newModel || selectedModel, 
          response_style: newStyle || responseStyle 
        }),
      });
      setModelSaveSuccess(true);
      setTimeout(() => setModelSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save model settings", err);
    } finally {
      setIsSavingModel(false);
    }
  };

  const AI_MODELS = [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash ⚡", badge: "Free", desc: "Default engine — high quota & fast", minTier: 0 },
    { value: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Lite Plan", desc: "High quality OpenAI intelligence", minTier: 1 },
    { value: "gpt-4o", label: "GPT-4o", badge: "Pro Plan", desc: "OpenAI's most capable model", minTier: 2 },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", badge: "Pro Plan", desc: "Best for nuanced writing & analysis", minTier: 2 },
  ];

  // Parent control — live data from API
  const { data: pcData, mutate: mutatePC } = useSWR(
    activeTab === "parent_control" ? "/api/parent-control" : null
  );
  const pcEntries: { id: string; family_email: string; daily_target_hours: number | null; restricted_mode: boolean; control_enabled: boolean; report_time: string }[] = pcData?.entries || [];
  const pcSettings = pcEntries[0] ?? null;

  const [newFamilyEmail, setNewFamilyEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localTarget, setLocalTarget] = useState("unlimited");
  const [customTarget, setCustomTarget] = useState("");
  const [localControlEnabled, setLocalControlEnabled] = useState(false);
  const [localRestrictedMode, setLocalRestrictedMode] = useState(true);
  const [localReportTime, setLocalReportTime] = useState("20:00");
  const [isCustomTime, setIsCustomTime] = useState(false);

  useEffect(() => {
    if (pcSettings) {
      const target = pcSettings.daily_target_hours;
      const presets = ["1", "3", "5", "8"];
      if (target === null) {
        setLocalTarget("unlimited");
      } else if (presets.includes(String(target))) {
        setLocalTarget(String(target));
      } else {
        setLocalTarget("custom");
        setCustomTarget(String(target));
      }
      setLocalControlEnabled(pcSettings.control_enabled);
      setLocalRestrictedMode(pcSettings.restricted_mode);
      setLocalReportTime(pcSettings.report_time || "20:00");
    }
  }, [pcSettings]);

  const handleAddFamilyEmail = async () => {
    if (!newFamilyEmail.trim()) return;
    setAddingEmail(true);
    setEmailError("");
    try {
      const res = await fetch("/api/parent-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          family_email: newFamilyEmail.trim(),
          control_enabled: localControlEnabled,
          restricted_mode: localRestrictedMode,
          daily_target_hours: localTarget === "custom" ? parseFloat(customTarget) || 0 : (localTarget === "unlimited" ? null : parseFloat(localTarget)),
          report_time: localReportTime
        }),
      });
      const json = await res.json();
      if (!res.ok) { setEmailError(json.error || "Failed to add email"); }
      else { setNewFamilyEmail(""); mutatePC(); }
    } catch { setEmailError("An error occurred."); }
    finally { setAddingEmail(false); }
  };

  const handleRemoveFamilyEmail = async (id: string) => {
    setRemovingId(id);
    try {
      await fetch("/api/parent-control", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      mutatePC();
    } finally { setRemovingId(null); }
  };

  const handleSaveParentSettings = async (
    targetParam?: number | null,
    restrictedParam?: boolean,
    controlParam?: boolean,
    timeParam?: string
  ) => {
    setSavingSettings(true);
    
    let finalTarget = targetParam !== undefined ? targetParam : null;
    if (targetParam === undefined) {
      if (localTarget === "custom") {
        finalTarget = parseFloat(customTarget) || 0;
      } else if (localTarget !== "unlimited") {
        finalTarget = parseFloat(localTarget);
      }
    }

    try {
      await fetch("/api/parent-control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_target_hours: finalTarget,
          restricted_mode: restrictedParam !== undefined ? restrictedParam : localRestrictedMode,
          control_enabled: controlParam !== undefined ? controlParam : localControlEnabled,
          report_time: timeParam !== undefined ? timeParam : localReportTime,
        }),
      });
      setModelSaveSuccess(true);
      setTimeout(() => setModelSaveSuccess(false), 2000);
      mutatePC();
    } catch (err) {
      console.error("Failed to save parent settings", err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "general", label: translations[language].general, icon: Settings },
    { id: "notifications", label: translations[language].notifications, icon: Bell },
    { id: "models", label: "Models", icon: Sparkles },
    { id: "data", label: translations[language].data_controls, icon: Globe },
    { id: "parent_control", label: translations[language].parent_control, icon: ShieldAlert },
    { id: "account", label: translations[language].account, icon: User },
  ];

  const statusConfig = {
    granted: { label: "Allowed", icon: CheckCircle, color: "text-green-500" },
    denied: { label: "Blocked", icon: XCircle, color: "text-red-500" },
    default: { label: "Not Enabled", icon: AlertCircle, color: "text-[#C2A27A]" },
    unsupported: { label: "Not Supported", icon: BellOff, color: "text-[#7D7D7D]" },
  };

  const pushStatus = statusConfig[pushPermission] ?? statusConfig.default;
  const StatusIcon = pushStatus.icon;

  const handleDeleteAccount = async () => {
    if (deleteEmail !== session?.user?.email) {
      setDeleteError("Email address does not match your account.");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });
      if (res.ok) {
        signOut({ callbackUrl: "/signup" });
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete account.");
      }
    } catch (err) {
      setDeleteError("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };


  const sendTestNotification = () => {
    if (pushPermission !== "granted") {
      requestPushPermission();
      return;
    }
    if (doNotDisturb) {
      alert("Do Not Disturb is currently ON. Turn it off to see the test notification pop up!");
      return;
    }
    new Notification("Azviq", {
      body: "This is a test notification. Your alerts are perfectly configured!",
      icon: "/azviq_logo_whitebg.png"
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className={`relative w-full h-full sm:h-[620px] sm:max-w-4xl flex flex-col sm:flex-row rounded-none sm:rounded-3xl overflow-hidden shadow-2xl transition-colors border-0 animate-in zoom-in-95 duration-200 ${isDark ? "bg-[#1A1A1A] md:dark:bg-[#1F1F1F] text-white border-[#2E2E2E]" : "bg-[#F5F3EF] text-[#252525] border-[#E8E5E0]"
        }`}>

        {/* Sidebar (Desktop) / Top Bar (Mobile) */}
        <div className={`shrink-0 flex-none border-b sm:border-b-0 sm:border-r transition-colors flex flex-col ${isDark ? "bg-[#1A1A1A] md:dark:bg-[#1F1F1F] border-[#2E2E2E]" : "bg-[#F0EDE8] border-[#E8E5E0]"
          } ${"w-full sm:w-72"}`}>

          {/* Header Area */}
          <div className={`shrink-0 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 border-b border-[#E8E5E0] dark:border-[#545454] bg-[#F5F3EF] dark:bg-transparent h-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:h-20 pt-[env(safe-area-inset-top,0px)] sm:pt-0`}>
            <h2 className="text-lg font-bold sm:text-2xl">{translations[language].settings}</h2>
            <button onClick={handleClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Navigation - Sidebar on desktop, horizontal scroll on mobile */}
          <div className="flex sm:flex-col items-center sm:items-stretch overflow-x-auto sm:overflow-x-visible h-[3.25rem] sm:h-auto px-4 sm:px-2 sm:mt-2 pb-0 sm:pb-6 space-x-1 sm:space-x-0 sm:space-y-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:py-2.5 rounded-xl transition-all text-[11px] sm:text-sm font-medium whitespace-nowrap shrink-0 sm:shrink outline-none ${isActive
                      ? isDark ? "bg-[#2E2E2E] text-white" : "bg-white text-[#252525]"
                      : isDark ? "text-[#BABABA] hover:bg-[#1C1C1B]/50" : "text-[#7D7D7D] hover:bg-white/60"
                    }`}
                >
                  <Icon size={14} className="sm:w-[18px] sm:h-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-8 scrollbar-hide">
          <div className={`max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ${isDark ? "bg-[#1A1A1A] md:dark:bg-[#1F1F1F]" : ""}`}>

            {activeTab === "general" && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 -mt-2">
                {/* User Info - Moved to Top with moderate upward nudge */}
                <div className="flex items-center justify-between pb-4 border-b border-[#E8E5E0] dark:border-[#545454]">
                  <div>
                    <h3 className="text-sm font-semibold">User Info</h3>
                    <p className="text-xs text-[#7D7D7D]">{session?.user?.email || "No email"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{translations[language].theme}</h3>
                    <p className="text-xs text-[#7D7D7D]">Switch between light and dark mode</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${isDark ? "bg-[#333] border-[#444] text-white" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525]"
                      }`}
                  >
                    {isDark ? <Moon size={14} /> : <Sun size={14} />}
                    {isDark ? translations[language].dark : translations[language].light}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#E8E5E0] dark:border-[#3A3A3A]">
                  <div>
                    <h3 className="text-sm font-semibold">{translations[language].language}</h3>
                    <p className="text-xs text-[#7D7D7D]">Set your preferred interface language</p>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none transition-all ${isDark ? "bg-[#333] border-[#444] text-white" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525]"
                      }`}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="kn">Kannada</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3.5 pt-4 border-t border-[#E8E5E0] dark:border-[#3A3A3A]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Interface Scale</h3>
                      <p className="text-xs text-[#7D7D7D]">Adjust text and element sizing</p>
                    </div>
                    <button
                      onClick={resetZoom}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all active:scale-95 ${isDark ? "bg-[#333] text-[#BABABA] hover:text-white" : "bg-[#F0EDE8] text-[#7D7D7D] hover:text-[#252525]"
                        }`}
                    >
                      RESET
                    </button>
                  </div>

                  <div className="flex items-center gap-4 px-2">
                    <button
                      onClick={zoomOut}
                      className={`text-[10px] font-bold transition-all hover:scale-125 active:scale-90 p-1 rounded-md ${isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                        }`}
                    >
                      A
                    </button>
                    <div className="relative flex-1 group h-10 flex items-center">
                      {/* Unified Track Background */}
                      <div className={`absolute left-0 right-0 h-1.5 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"
                        }`} />

                      <input
                        type="range"
                        min="12"
                        max="24"
                        step="1.6"
                        value={zoomLevel}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className={`w-full appearance-none bg-transparent cursor-pointer relative z-10 outline-none
                                    [&::-webkit-slider-thumb]:appearance-none 
                                    [&::-webkit-slider-thumb]:w-5 
                                    [&::-webkit-slider-thumb]:h-5 
                                    [&::-webkit-slider-thumb]:rounded-full 
                                    [&::-webkit-slider-thumb]:border-2 
                                    ${isDark
                            ? "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-[#252525]"
                            : "[&::-webkit-slider-thumb]:bg-[#252525] [&::-webkit-slider-thumb]:border-white"
                          }
                                    group-hover:[&::-webkit-slider-thumb]:scale-110
                                    [&::-webkit-slider-thumb]:transition-transform 
                                    [&::-webkit-slider-thumb]:duration-200
                                `}
                      />
                    </div>
                    <button
                      onClick={zoomIn}
                      className={`text-lg font-bold transition-all hover:scale-110 active:scale-95 p-1 rounded-md ${isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                        }`}
                    >
                      A
                    </button>
                  </div>

                  <div className="flex justify-between px-10 text-[10px] font-medium opacity-30 mt-[-10px]">
                    <span>Small</span>
                    <span className="ml-1">Default ({Math.round((zoomLevel / 16) * 100)}%)</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-0 animate-in slide-in-from-right-4 duration-300 -mt-2">
                {/* Master Switch */}
                <div className="flex items-center justify-between py-4 border-b border-[#E8E5E0] dark:border-[#545454] -mt-5">
                  <div>
                    <h3 className="text-sm font-semibold">Enable Notifications</h3>
                    <p className="text-xs text-[#7D7D7D]">Receive updates and reminders</p>
                  </div>
                  {pushPermission === "granted" ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-green-500 flex items-center gap-1 font-medium bg-green-500/10 px-2 py-1 rounded-md">
                        <CheckCircle size={14} /> Enabled
                      </span>
                      <button onClick={requestPushPermission} className="text-[10px] text-[#7D7D7D] underline hover:text-[#252525] dark:hover:text-white cursor-pointer active:scale-95">
                        Resync Device Token
                      </button>
                    </div>
                  ) : (
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                        isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={requestPushPermission}>
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all" />
                    </div>
                  )}
                </div>

                <div className="divide-y divide-[#E8E5E0] dark:divide-[#3A3A3A]">
                  <div className="flex items-center justify-between py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">Study Reminders</h3>
                      <p className="text-xs text-[#7D7D7D]">Daily alerts to stay on track</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${studyReminders
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setStudyReminders(!studyReminders)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${studyReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">AI Assistant Alerts</h3>
                      <p className="text-xs text-[#7D7D7D]">Notify when long tasks are complete</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${aiAlerts
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setAiAlerts(!aiAlerts)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${aiAlerts ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">To-Do Reminders</h3>
                      <p className="text-xs text-[#7D7D7D]">Alerts for scheduled to-do items</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${todoReminders
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setTodoReminders(!todoReminders)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${todoReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3.5">
                    <div>
                      <h3 className="text-sm font-semibold">Task Deadlines</h3>
                      <p className="text-xs text-[#7D7D7D]">Alerts when tasks are due today</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${taskDueReminders
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setTaskDueReminders(!taskDueReminders)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${taskDueReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  {/* Sections with consistent spacing */}
                  <div className="flex items-center justify-between py-4">
                    <div>
                      <h3 className="text-sm font-semibold">Do Not Disturb</h3>
                      <p className="text-xs text-[#7D7D7D]">Silence all alerts for better focus</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${doNotDisturb
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setDoNotDisturb(!doNotDisturb)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${doNotDisturb ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 py-4 border-t border-black/5 dark:border-white/5">
                    <h3 className="text-sm font-semibold">Notification Sound</h3>
                    <select
                      value={notificationSound}
                      onChange={(e) => setNotificationSound(e.target.value)}
                      className={`w-full p-3 rounded-xl border text-sm transition-all appearance-none outline-none cursor-pointer
                        ${isDark
                          ? "bg-[#252525] border-[#3A3A3A] text-white hover:border-[#545454]"
                          : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] hover:border-[#D1D1D1]"}
                      `}
                    >
                      <option value="chime">Modern Chime</option>
                      <option value="pulsar">Pulsar Alert</option>
                      <option value="silent">Silent / Vibration Only</option>
                    </select>
                  </div>

                  <div className="py-6">
                    <button
                      onClick={sendTestNotification}
                      className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg
                        ${isDark
                          ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]"
                          : "bg-[#252525] text-white hover:bg-[#333]"}
                      `}
                    >
                      Send Test Notification
                    </button>
                    <p className="text-[10px] text-center mt-3 text-[#7D7D7D]">Click to verify your browser and push settings are working correctly.</p>

                    {pushPermission === "denied" && (
                      <div className={`mt-4 p-3 rounded-xl text-[11px] leading-relaxed flex items-start gap-2 ${isDark ? "bg-red-500/10 text-red-400" : "bg-red-500/5 text-red-600"
                        }`}>
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        Browser permissions are blocked. Please enable them in your address bar settings to receive alerts.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "models" && (
              <div className="space-y-0 animate-in slide-in-from-right-4 duration-300 -mt-2">
                <div className="pb-4 border-b border-[#E8E5E0] dark:border-[#3A3A3A] flex justify-between items-end">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      AI Chat Model
                      {modelSaveSuccess && (
                        <span className="text-[10px] text-green-500 font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                          (Saved)
                        </span>
                      )}
                      {isSavingModel && (
                        <Loader2 size={12} className="animate-spin text-[#C2A27A]" />
                      )}
                    </h3>
                    <p className="text-xs text-[#7D7D7D] mt-0.5">Applies to <strong>AI Chat only</strong>. All other features (exercises, revision, vision) always run on Flash for maximum reliability.</p>
                  </div>
                  {loadingModels ? (
                    <Skeleton className="w-16 h-4 rounded" />
                  ) : (
                    subscription && (
                      <div className={`px-2 py-0.5 rounded text-[10px] font-bold border border-[#C2A27A]/20 bg-[#C2A27A]/10 text-[#C2A27A]`}>
                        {subscription.plan_name.toUpperCase()}
                      </div>
                    )
                  )}
                </div>

                <div className="divide-y divide-[#E8E5E0] dark:divide-[#3A3A3A]">
                  {/* Active AI Model */}
                  <div className="flex flex-col gap-2 py-4" ref={dropdownRef}>
                    <h3 className="text-sm font-semibold">Active AI Model</h3>
                    {loadingModels ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (
                      <div className="relative">
                        {/* Dropdown Trigger */}
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all
                            ${isDark ? "bg-[#252525] border-[#3A3A3A] text-white" : "bg-white border-[#E8E5E0] text-[#252525]"}`}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#C2A27A]" />
                            <span className="font-medium">
                              {AI_MODELS.find(m => m.value === selectedModel)?.label || "Select Model"}
                            </span>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-90" : ""}`} />
                        </button>

                        {/* Dropdown Content */}
                        {isDropdownOpen && (
                          <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-xl overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-200
                            ${isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-white border-[#E8E5E0]"}`}
                          >
                            {AI_MODELS.map((m) => {
                              const userTier = subscription?.plan_tier ?? 0;
                              const isLocked = m.minTier > userTier;
                              const isSelected = selectedModel === m.value;
                              
                              return (
                                <button
                                  key={m.value}
                                  onClick={() => {
                                    if (!isLocked) {
                                      setSelectedModel(m.value);
                                      setIsDropdownOpen(false);
                                      handleSaveModelSettings(m.value, responseStyle);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors
                                    ${isSelected 
                                      ? isDark ? "bg-white/5" : "bg-black/5" 
                                      : isLocked ? "opacity-40 cursor-not-allowed" : isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-semibold ${isSelected ? "text-[#C2A27A]" : ""}`}>{m.label}</span>
                                      {m.minTier > 0 && (
                                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase
                                          ${m.minTier === 1 ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-[#C2A27A]"}`}>
                                          {m.badge}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] opacity-60 leading-tight">{m.desc}</span>
                                  </div>
                                  {isLocked ? (
                                    <Lock size={12} className="shrink-0 opacity-40" />
                                  ) : isSelected ? (
                                    <Check size={14} className="shrink-0 text-[#C2A27A]" />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Response Style */}
                  <div className="flex flex-col gap-2 py-4">
                    <h3 className="text-sm font-semibold">Response Style</h3>
                    <p className="text-xs text-[#7D7D7D] mb-1">Controls how the AI writes its answers.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {loadingModels ? (
                        <>
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                          <Skeleton className="h-14 w-full" />
                        </>
                      ) : (
                        (["balanced", "creative", "precise"] as const).map((style) => {
                          const labels = { balanced: "Balanced", creative: "Creative", precise: "Precise" };
                          const descs = { balanced: "Smart defaults", creative: "Imaginative", precise: "Exact & factual" };
                          const isActive = responseStyle === style;
                          return (
                            <button
                              key={style}
                              onClick={() => {
                                setResponseStyle(style);
                                handleSaveModelSettings(selectedModel, style);
                              }}
                              className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 gap-1 ${
                                isActive
                                  ? isDark ? "bg-[#C2A27A] text-white border-[#C2A27A]" : "bg-[#252525] text-white border-[#252525]"
                                  : isDark ? "bg-[#252525] border-[#333] text-[#7D7D7D] hover:text-white" : "bg-white border-[#E8E5E0] text-[#7D7D7D] hover:text-[#252525]"
                              }`}
                            >
                              <span>{labels[style]}</span>
                              <span className="text-[9px] font-normal opacity-60">{descs[style]}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Daily Quota & Usage */}
                  {loadingModels ? (
                    <div className="flex flex-col gap-4 py-5 border-t border-[#E8E5E0] dark:border-[#3A3A3A]">
                      <div className="flex justify-between items-center mb-1">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </div>
                  ) : (
                    subscription?.usage && (
                      <div className="flex flex-col gap-3 py-5 border-t border-[#E8E5E0] dark:border-[#3A3A3A]">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h3 className="text-sm font-bold">Daily Quota & Usage</h3>
                            <p className="text-[11px] text-[#7D7D7D]">Your remaining model requests for today</p>
                          </div>
                          {subscription.usage.chat.reset > 0 && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5
                              ${isDark ? "bg-white/5 border-white/10 text-[#BABABA]" : "bg-black/5 border-black/5 text-[#545454]"}`}>
                              <Clock className="w-3 h-3" />
                              Refreshes in {Math.ceil((subscription.usage.chat.reset - Date.now()) / (1000 * 60 * 60))}h
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 mt-1">
                          {/* Chat Usage */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>AI Chats</span>
                              <span className="font-bold">
                                {subscription.usage.chat.limit === Infinity ? "Unlimited" : `${subscription.usage.chat.remaining} / ${subscription.usage.chat.limit}`}
                              </span>
                            </div>
                            {subscription.usage.chat.limit !== Infinity && (
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-[#333]" : "bg-[#F0F0F0]"}`}>
                                <div 
                                  className="h-full bg-[#C2A27A] transition-all duration-500" 
                                  style={{ width: `${(subscription.usage.chat.remaining / subscription.usage.chat.limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Vision Usage */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>Vision & Images</span>
                              <span className="font-bold">
                                  {subscription.usage.vision.limit === Infinity ? "Unlimited" : `${subscription.usage.vision.remaining} / ${subscription.usage.vision.limit}`}
                              </span>
                            </div>
                            {subscription.usage.vision.limit !== Infinity && (
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-[#333]" : "bg-[#F0F0F0]"}`}>
                                <div 
                                  className="h-full bg-[#C2A27A] transition-all duration-500" 
                                  style={{ width: `${(subscription.usage.vision.remaining / subscription.usage.vision.limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Exercise Usage */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>Exercise Generation</span>
                              <span className="font-bold">
                                  {subscription.usage.exercise.limit === Infinity ? "Unlimited" : `${subscription.usage.exercise.remaining} / ${subscription.usage.exercise.limit}`}
                              </span>
                            </div>
                            {subscription.usage.exercise.limit !== Infinity && (
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-[#333]" : "bg-[#F0F0F0]"}`}>
                                <div 
                                  className="h-full bg-[#C2A27A] transition-all duration-500" 
                                  style={{ width: `${(subscription.usage.exercise.remaining / subscription.usage.exercise.limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Personal AI Usage */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>Personal AI Teacher</span>
                              <span className="font-bold">
                                  {subscription.usage.personal_ai.limit === Infinity ? "Unlimited" : `${subscription.usage.personal_ai.remaining} / ${subscription.usage.personal_ai.limit}`}
                              </span>
                            </div>
                            {subscription.usage.personal_ai.limit !== Infinity && (
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-[#333]" : "bg-[#F0F0F0]"}`}>
                                <div 
                                  className="h-full bg-[#C2A27A] transition-all duration-500" 
                                  style={{ width: `${(subscription.usage.personal_ai.remaining / subscription.usage.personal_ai.limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Note AI Usage */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className={isDark ? "text-[#CFCFCF]" : "text-[#545454]"}>Note Editor AI</span>
                              <span className="font-bold">
                                  {subscription.usage.note_ai.limit === Infinity ? "Unlimited" : `${subscription.usage.note_ai.remaining} / ${subscription.usage.note_ai.limit}`}
                              </span>
                            </div>
                            {subscription.usage.note_ai.limit !== Infinity && (
                              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? "bg-[#333]" : "bg-[#F0F0F0]"}`}>
                                <div 
                                  className="h-full bg-[#C2A27A] transition-all duration-500" 
                                  style={{ width: `${(subscription.usage.note_ai.remaining / subscription.usage.note_ai.limit) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Info Card */}
                  <div className="py-4">
                    <div className={`p-4 rounded-2xl border ${isDark ? "bg-[#C2A27A]/5 border-[#C2A27A]/15" : "bg-[#C2A27A]/5 border-[#C2A27A]/20"}`}>
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#C2A27A]">
                        <Crown size={16} /> Unlock Powerful AI
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-80">
                        Lite plan unlocks <strong>GPT-4o Mini</strong> for AI Chat. Pro plan unlocks <strong>GPT-4o</strong> and <strong>Claude 3.5 Sonnet</strong>. All study tools (exercises, revision, summarize, vision) always run on Gemini Flash for maximum speed and quota.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-0 animate-in slide-in-from-right-4 duration-300 -mt-2">
                {/* Section Title */}
                <div className="pb-4 border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                  <h3 className="text-sm font-semibold">Data controls</h3>
                  <p className="text-xs text-[#7D7D7D] mt-0.5">Manage how your data is used and stored.</p>
                </div>

                {/* List Items */}
                <div className="divide-y divide-[#E8E5E0] dark:divide-[#3A3A3A]">
                  {/* Chat Shared Links */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Chat shared links</span>
                    <button
                      onClick={() => { 
                        setLinksType("chat"); 
                        setShowSharedLinks(true); 
                        window.history.pushState(null, '', `/settings/chatsharedlink?from=${encodeURIComponent(fromParam)}`);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                        }`}
                    >
                      Manage
                    </button>
                  </div>

                  {/* Note Shared Links */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Note shared links</span>
                    <button
                      onClick={() => { 
                        setLinksType("note"); 
                        setShowSharedLinks(true); 
                        window.history.pushState(null, '', `/settings/notesharedlink?from=${encodeURIComponent(fromParam)}`);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                        }`}
                    >
                      Manage
                    </button>
                  </div>

                  {/* Imported chats */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Imported chats</span>
                    <button
                      onClick={() => { 
                        setLinksType("import-chat"); 
                        setShowSharedLinks(true); 
                        window.history.pushState(null, '', `/settings/importchats?from=${encodeURIComponent(fromParam)}`);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                        }`}
                    >
                      Manage
                    </button>
                  </div>

                  {/* Imported Notes */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Imported notes</span>
                    <button
                      onClick={() => { 
                        setLinksType("import"); 
                        setShowSharedLinks(true); 
                        window.history.pushState(null, '', `/settings/importnotes?from=${encodeURIComponent(fromParam)}`);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                        }`}
                    >
                      Manage
                    </button>
                  </div>

                  {/* Archived chats */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Archived chats</span>
                    <button
                      onClick={() => { 
                        setLinksType("archive"); 
                        setShowSharedLinks(true); 
                        window.history.pushState(null, '', `/settings/archivechat?from=${encodeURIComponent(fromParam)}`);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                        }`}
                    >
                      Manage
                    </button>
                  </div>

                  {/* Archive All */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Archive all chats</span>
                    <button 
                      onClick={() => setDeleteConfirmTarget({ id: "archive-all-history", title: "all your active chats" })}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                      }`}>
                      Archive all
                    </button>
                  </div>

                  {/* Delete All Archives */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Delete all archived chats</span>
                    <button 
                      onClick={() => setDeleteConfirmTarget({ id: "delete-all-archives", title: "all your archived chats permanently" })}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10" : "bg-transparent border-red-200 text-red-600 hover:bg-red-50"
                      }`}>
                      Delete all
                    </button>
                  </div>

                </div>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    {session?.user?.image ? (
                      <img src={session.user.image} className="w-full h-full object-cover" alt="User" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#C2A27A] text-white font-bold text-2xl">
                        {session?.user?.name?.[0] || 'A'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{session?.user?.name || "Member"}</h3>
                    <p className="text-xs text-[#7D7D7D]">{session?.user?.email}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-red-500/10">
                  <h3 className="text-sm font-bold text-red-500 mb-2">Danger Area</h3>
                  {!isConfirmingDelete ? (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Delete Account
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-[#7D7D7D]">Enter your email <span className="underline">{session?.user?.email}</span> to delete:</p>
                      <input
                        value={deleteEmail}
                        onChange={e => setDeleteEmail(e.target.value)}
                        className="w-full bg-[#F5F3EF] dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] px-3 py-2 rounded-lg text-xs outline-none"
                        placeholder="Your email here"
                      />
                      {deleteError && <p className="text-[10px] text-red-500">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-[11px] font-bold"
                        >
                          {isDeleting ? "Deleting..." : "Permanently Delete"}
                        </button>
                        <button
                          onClick={() => { setIsConfirmingDelete(false); setDeleteEmail(""); }}
                          className="px-4 py-2 bg-gray-100 dark:bg-[#333] rounded-lg text-[11px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}            {activeTab === "parent_control" && (
              <div className="space-y-3.5 animate-in slide-in-from-right-4 duration-300 -mt-2">
                {/* Master Controls */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      Parental Control Mode
                      {modelSaveSuccess && (
                        <span className="text-[10px] text-green-500 font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                          (Saved)
                        </span>
                      )}
                      {savingSettings && (
                        <Loader2 size={12} className="animate-spin text-[#C2A27A]" />
                      )}
                    </h3>
                    <p className="text-xs text-[#7D7D7D]">Enable monitoring and safety features</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${localControlEnabled
                      ? "bg-[#C2A27A]"
                      : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => {
                      const next = !localControlEnabled;
                      setLocalControlEnabled(next);
                      handleSaveParentSettings(undefined, undefined, next);
                    }}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${localControlEnabled ? "right-1" : "left-1"
                      }`} />
                  </div>
                </div>

                <div className="h-px bg-black/5 dark:bg-white/5" />

                {/* Family Members */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Family Members</h3>
                    <p className="text-xs text-[#7D7D7D]">These emails receive a daily study report every evening at 8 PM</p>
                  </div>

                  {/* Existing emails */}
                  <div className="flex flex-col gap-2">
                    {pcEntries.length === 0 && (
                      <p className="text-xs text-[#BABABA] dark:text-[#545454] py-2 text-center">No family members added yet</p>
                    )}
                    {pcEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-[#F7F7F8] border-[#E8E5E0]"
                          }`}
                      >
                        <span className="text-sm truncate flex-1">{entry.family_email}</span>
                        <button
                          onClick={() => handleRemoveFamilyEmail(entry.id)}
                          disabled={removingId === entry.id}
                          className="ml-2 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                        >
                          {removingId === entry.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <X className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add email input */}
                  {pcEntries.length < 5 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newFamilyEmail}
                          onChange={(e) => { setNewFamilyEmail(e.target.value); setEmailError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleAddFamilyEmail()}
                          placeholder="parent@example.com"
                          className={`flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition-all
                            ${isDark
                              ? "bg-[#252525] border-[#3A3A3A] text-white placeholder-[#545454] focus:border-[#545454]"
                              : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] placeholder-[#BABABA] focus:border-[#D1D1D1]"}
                          `}
                        />
                        <button
                          onClick={handleAddFamilyEmail}
                          disabled={addingEmail || !newFamilyEmail.trim()}
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 ${isDark ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]" : "bg-[#252525] text-white hover:bg-[#333]"
                            } disabled:opacity-40`}
                        >
                          {addingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Add
                        </button>
                      </div>
                      {emailError && <p className="text-[11px] text-red-500">{emailError}</p>}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 pt-3.5 border-t border-black/5 dark:border-white/5">

                  {/* Restricted AI */}
                  <div className="flex items-center justify-between pb-5 border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <div>
                      <h3 className="text-sm font-semibold">Restricted AI Content</h3>
                      <p className="text-xs text-[#7D7D7D]">Filter AI responses for younger audiences</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${localRestrictedMode
                        ? "bg-[#C2A27A]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => {
                        const next = !localRestrictedMode;
                        setLocalRestrictedMode(next);
                        handleSaveParentSettings(undefined, next);
                      }}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${localRestrictedMode ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  {/* Daily Study Target */}
                  <div className="flex flex-col gap-2 pb-6 border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <h3 className="text-sm font-semibold">Daily Study Target</h3>
                    <p className="text-xs text-[#7D7D7D] mb-1">Set a minimum study time for your child — tracked in the Study Consistency graph</p>
                    <div className="relative">
                      {localTarget !== "custom" ? (
                        <select
                          value={localTarget}
                          onChange={(e) => {
                            setLocalTarget(e.target.value);
                            if (e.target.value !== "custom") {
                              const t = e.target.value === "unlimited" ? null : parseFloat(e.target.value);
                              handleSaveParentSettings(t);
                            }
                          }}
                          className={`w-full p-3 rounded-xl border text-sm transition-all appearance-none outline-none cursor-pointer
                            ${isDark
                              ? "bg-[#252525] border-[#3A3A3A] text-white hover:border-[#545454]"
                              : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] hover:border-[#D1D1D1]"}
                          `}
                        >
                          <option value="unlimited">No target set</option>
                          <option value="1">1 Hour</option>
                          <option value="3">3 Hours</option>
                          <option value="5">5 Hours</option>
                          <option value="8">8 Hours</option>
                          <option value="custom">Custom Goal</option>
                        </select>
                      ) : (
                        <div className="flex items-stretch gap-6 sm:gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex-1 min-w-0 relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="24"
                              value={customTarget}
                              onChange={(e) => {
                                setCustomTarget(e.target.value);
                                handleSaveParentSettings(parseFloat(e.target.value) || 0);
                              }}
                              placeholder="Enter hours (e.g. 2.5)"
                              className={`w-full p-3 pr-16 rounded-xl border text-sm outline-none transition-all
                                ${isDark
                                  ? "bg-[#252525] border-[#3A3A3A] text-white focus:border-[#545454]"
                                  : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] focus:border-[#D1D1D1]"}
                              `}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7D7D7D] pointer-events-none">
                              Hours
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setLocalTarget("unlimited");
                              handleSaveParentSettings(null);
                            }}
                            className={`flex-shrink-0 px-4 rounded-xl border transition-all active:scale-95 flex items-center justify-center
                              ${isDark
                                ? "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                                : "bg-black/5 border-black/5 text-black/70 hover:text-black hover:bg-black/10"}
                            `}
                            title="Reset to No Target"
                          >
                            <Trash2 className="w-4 h-4 scale-x-[-1]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Delivery Time */}
                  <div className="flex flex-col gap-2 pb-6 border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <h3 className="text-sm font-semibold">Report Delivery Time</h3>
                    <p className="text-xs text-[#7D7D7D] mb-1">Scheduled time for family reports (IST)</p>

                    <div className="relative">
                      {(!isCustomTime && localReportTime === "20:00") ? (
                        <select
                          value="default"
                          onChange={(e) => {
                            if (e.target.value === "custom") {
                              setIsCustomTime(true);
                            }
                          }}
                          className={`w-full p-3 rounded-xl border text-sm transition-all appearance-none outline-none cursor-pointer
                            ${isDark
                              ? "bg-[#252525] border-[#3A3A3A] text-white hover:border-[#545454]"
                              : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] hover:border-[#D1D1D1]"}
                          `}
                        >
                          <option value="default">Default (8:00 PM)</option>
                          <option value="custom">Set Custom Time...</option>
                        </select>
                      ) : (
                        <div className="flex items-stretch gap-6 sm:gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex-1 min-w-0">
                            <input
                              type="time"
                              value={localReportTime}
                              onChange={(e) => {
                                setLocalReportTime(e.target.value);
                                handleSaveParentSettings(undefined, undefined, undefined, e.target.value);
                              }}
                              onClick={(e) => (e.target as any).showPicker?.()}
                              className={`w-full p-3 rounded-xl border text-sm outline-none transition-all cursor-pointer
                                ${isDark
                                  ? "bg-[#252525] border-[#3A3A3A] text-white focus:border-[#545454]"
                                  : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] focus:border-[#D1D1D1]"}
                              `}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const defaultTime = "20:00";
                              setLocalReportTime(defaultTime);
                              setIsCustomTime(false);
                              handleSaveParentSettings(undefined, undefined, undefined, defaultTime);
                            }}
                            className={`flex-shrink-0 px-4 rounded-xl border transition-all active:scale-95 flex items-center justify-center
                              ${isDark
                                ? "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                                : "bg-black/5 border-black/5 text-black/70 hover:text-black hover:bg-black/10"}
                            `}
                            title="Reset to 8:00 PM Default"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Settings Button - Removed as requested, using auto-save */}

                  {/* Info box */}
                  <div className="mt-4 p-4 rounded-2xl bg-[#C2A27A]/10 border border-[#C2A27A]/20">
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm text-[#C2A27A]">
                      <ShieldAlert size={16} /> How it works
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Every day at {
                        (() => {
                          const [h, m] = localReportTime.split(":");
                          const hour = parseInt(h);
                          const ampm = hour >= 12 ? "PM" : "AM";
                          const displayHour = hour % 12 || 12;
                          return `${displayHour}:${m} ${ampm}`;
                        })()
                      }, added family members receive an email with your child's study performance summary.
                    </p>
                  </div>
                </div>

              </div>
            )}


          </div>

          {/* Footer logout - ChatGPT style removed per user request */}
        </div>
      </div>

      <SharedLinksModal
        showSharedLinks={showSharedLinks}
        setShowSharedLinks={setShowSharedLinks}
        linksType={linksType}
        isDark={isDark}
        fromParam={fromParam}
        isLoadingLinks={isLoadingLinks}
        sharedLinks={sharedLinks}
        showBulkMenu={showBulkMenu}
        setShowBulkMenu={setShowBulkMenu}
        deleteConfirmTarget={deleteConfirmTarget}
        setDeleteConfirmTarget={setDeleteConfirmTarget}
        revokingId={revokingId}
        isBulkDeleting={isBulkDeleting}
        handleRevokeLink={handleRevokeLink}
        handleUnarchive={handleUnarchive}
        handleDeleteAll={handleDeleteAll}
        handleArchiveAllHistory={handleArchiveAllHistory}
        handleDeleteAllHistory={handleDeleteAllHistory}
        onViewImporters={(type, id) => {
          setImporterModalData({ type, id });
        }}
      />

      <ImportersModal 
        isOpen={!!importerModalData}
        onClose={() => setImporterModalData(null)}
        type={importerModalData?.type || "chat"}
        id={importerModalData?.id || ""}
        theme={theme}
      />
    </div>
  );
}

export default function SettingsModal(props: SettingsModalProps) {
  return (
    <Suspense fallback={null}>
      <SettingsModalInner {...props} />
    </Suspense>
  );
}
