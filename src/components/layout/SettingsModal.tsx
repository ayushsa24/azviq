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
  Sparkles
} from "lucide-react";
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
    setTaskDueReminders
  } = useNotifications();

  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("general");

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as Tab);
    }
  }, [isOpen, initialTab]);

  const isDark = theme === "dark";

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
  
  const [linksType, setLinksType] = useState<"chat" | "note" | "archive">(() => {
    if (typeof window !== "undefined") {
      if (pathname.includes("/settings/notesharedlink")) return "note";
      if (pathname.includes("/settings/archivechat")) return "archive";
    }
    return "chat";
  });
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string | "all", title: string } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Close bulk menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setShowBulkMenu(false);
      }
    };
    if (showBulkMenu) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [showBulkMenu]);

  const { data: sharedLinksData, mutate: mutateSharedLinks, error: sharedLinksError } = useSWR(
    showSharedLinks ? (
      linksType === "chat" ? "/api/share/chat" :
        linksType === "note" ? "/api/share/note" :
          "/api/chat/history"
    ) : null
  );
  const sharedLinks = (
    linksType === "chat" ? sharedLinksData?.links :
      linksType === "note" ? sharedLinksData?.notes :
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

  const handleDeleteAll = async () => {
    try {
      setIsBulkDeleting(true);
      const url = linksType === "chat" ? "/api/share/chat/bulk" :
        linksType === "note" ? "/api/share/note/bulk" :
          "/api/chat/archive/bulk";

      await fetch(url, { method: "DELETE" });
      mutateSharedLinks();
      setShowBulkMenu(false);
    } catch (e) {
      console.error("Failed bulk delete", e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [notificationSound, setNotificationSound] = useState("chime");

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
  const [localControlEnabled, setLocalControlEnabled] = useState(true);
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
        body: JSON.stringify({ family_email: newFamilyEmail.trim() }),
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

  const handleSaveParentSettings = async () => {
    setSavingSettings(true);
    let target = null;
    if (localTarget === "custom") {
      target = parseFloat(customTarget) || 0;
    } else if (localTarget !== "unlimited") {
      target = parseFloat(localTarget);
    }

    try {
      await fetch("/api/parent-control", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_target_hours: target,
          restricted_mode: localRestrictedMode,
          control_enabled: localControlEnabled,
          report_time: localReportTime,
        }),
      });
      mutatePC();
    } finally { setSavingSettings(false); }
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
    new Notification("Avyx", {
      body: "This is a test notification. Your alerts are perfectly configured!",
      icon: theme === 'dark' ? "/lavyx_logo.png" : "/davyx_logo.png"
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
      <div className={`relative w-full h-full sm:h-[620px] sm:max-w-4xl flex flex-col sm:flex-row rounded-none sm:rounded-3xl overflow-hidden shadow-2xl transition-colors border-0 animate-in zoom-in-95 duration-200 ${isDark ? "bg-[#1A1A1A] text-white border-[#2E2E2E]" : "bg-[#F5F3EF] text-[#252525] border-[#E8E5E0]"
        }`}>

        {/* Sidebar (Desktop) / Top Bar (Mobile) */}
        <div className={`shrink-0 flex-none border-b sm:border-b-0 sm:border-r transition-colors flex flex-col ${isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-[#F0EDE8] border-[#E8E5E0]"
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
          <div className={`max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 ${isDark ? "bg-[#1A1A1A]" : ""}`}>

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
                  <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${pushPermission === "granted"
                      ? "bg-[#C2A27A]"
                      : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={requestPushPermission}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${pushPermission === "granted" ? "right-1" : "left-1"
                      }`} />
                  </div>
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
                {/* Section Title - Standardized */}
                <div className="pb-4 border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                  <h3 className="text-sm font-semibold">AI Models</h3>
                  <p className="text-xs text-[#7D7D7D] mt-0.5">Select the intelligence that powers your workspace.</p>
                </div>

                <div className="divide-y divide-[#E8E5E0] dark:divide-[#3A3A3A]">
                  <div className="flex flex-col gap-2 py-4">
                    <h3 className="text-sm font-semibold">Current Model</h3>
                    <div className="relative">
                      <select 
                        className={`w-full p-3 rounded-xl border text-sm transition-all appearance-none outline-none cursor-pointer
                          ${isDark 
                            ? "bg-[#252525] border-[#3A3A3A] text-white hover:border-[#545454]" 
                            : "bg-[#F7F7F8] border-[#E8E5E0] text-[#252525] hover:border-[#D1D1D1]"}
                        `}
                      >
                        <option value="gpt-4o">GPT-4o (Most Intelligent)</option>
                        <option value="gpt-4-mini">GPT-4o Mini (Fast & Cheap)</option>
                        <option value="claude-3-5">Claude 3.5 Sonnet (Nuanced)</option>
                        <option value="gemini-1-5">Gemini 1.5 Pro (Deep Memory)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 py-4 pb-6">
                    <h3 className="text-sm font-semibold">Response Style</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {["Balanced", "Creative", "Precise"].map((style) => (
                        <button
                          key={style}
                          className={`py-2 pt-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95
                            ${style === "Balanced" 
                              ? isDark ? "bg-white text-[#1A1A1A] border-white" : "bg-[#252525] text-white border-[#252525]"
                              : isDark ? "bg-[#252525] border-[#333] text-[#7D7D7D] hover:text-white" : "bg-white border-[#E8E5E0] text-[#7D7D7D] hover:text-[#252525]"}
                          `}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-6 border-t border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 dark:bg-white/5 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-2 font-bold text-sm text-blue-500 dark:text-blue-400">
                        <Sparkles size={16} /> Advanced Modeling
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-80">
                        Switching models affects the accuracy and personality of the AI assistant across all your chats and notes. This change is applied instantly to everyone on your account.
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

                  {/* Archived Chats */}
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
                    <button className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                      }`}>
                      Archive all
                    </button>
                  </div>

                  {/* Delete All */}
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-medium">Delete all chats</span>
                    <button className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10" : "bg-transparent border-red-200 text-red-600 hover:bg-red-50"
                      }`}>
                      Delete all
                    </button>
                  </div>

                  {/* Export Data */}
                  <div className="flex items-center justify-between py-3.5">
                    <span className="text-sm font-medium">Export data</span>
                    <button className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${isDark ? "bg-[#333] border-[#444] text-white hover:bg-[#444]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525] hover:bg-[#E8E8E8]"
                      }`}>
                      Export
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
                    <h3 className="text-sm font-semibold">Parental Control Mode</h3>
                    <p className="text-xs text-[#7D7D7D]">Enable monitoring and safety features</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${localControlEnabled
                      ? "bg-[#C2A27A]"
                      : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setLocalControlEnabled(!localControlEnabled)}>
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
                      }`} onClick={() => setLocalRestrictedMode(!localRestrictedMode)}>
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
                          onChange={(e) => setLocalTarget(e.target.value)}
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
                              onChange={(e) => setCustomTarget(e.target.value)}
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
                            onClick={() => setLocalTarget("unlimited")}
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
                              onChange={(e) => setLocalReportTime(e.target.value)}
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
                              setLocalReportTime("20:00");
                              setIsCustomTime(false);
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

                  {/* Save Settings Button */}
                  <button
                    onClick={handleSaveParentSettings}
                    disabled={savingSettings}
                    className={`w-full mt-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${isDark ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]" : "bg-[#252525] text-white hover:bg-[#333]"
                      }`}
                  >
                    {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Settings
                  </button>

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

      {/* Shared Links Sub-Modal */}
      {showSharedLinks && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-4 overflow-y-auto scrollbar-hide">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => {
            setShowSharedLinks(false);
            window.history.pushState(null, '', `/settings?from=${encodeURIComponent(fromParam)}`);
          }} />
          <div className={`relative w-full h-full sm:h-[620px] sm:max-w-4xl rounded-none sm:rounded-3xl shadow-2xl transition-colors overflow-hidden border-0 animate-in zoom-in-95 duration-200 flex flex-col my-auto ${isDark ? "bg-[#1A1A1A] border-[#2E2E2E] text-white" : "bg-[#F5F3EF] border-[#E8E5E0] text-[#252525]"
            }`}>
            <div className="shrink-0 transition-all duration-200 bg-[#F5F3EF] dark:bg-[#1A1A1A]">
              <div className={`flex items-center justify-between px-4 sm:px-6 transition-all duration-200 border-b border-[#E8E5E0] dark:border-[#545454] bg-[#F5F3EF] dark:bg-transparent h-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:h-20 pt-[env(safe-area-inset-top,0px)] sm:pt-0`}>
                <h3 className="text-lg font-bold sm:text-2xl">
                  {linksType === "chat" ? "Chat Shared Links" :
                    linksType === "note" ? "Note Shared Links" :
                      "Archived Chats"}
                </h3>
                <button
                  onClick={() => {
                    setShowSharedLinks(false);
                    window.history.pushState(null, '', `/settings?from=${encodeURIComponent(fromParam)}`);
                  }}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide relative">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className={`sticky top-0 z-10 text-[11px] uppercase tracking-wider font-bold shadow-sm ${isDark ? "bg-[#1A1A1A] text-[#7D7D7D]" : "bg-[#F5F3EF] text-[#545454]"}`}>
                  <tr className="border-b border-[#E8E5E0] dark:border-[#545454]">
                    <th className="px-6 py-3 sm:py-4 w-[40%] text-left">Name</th>
                    <th className="px-6 py-3 sm:py-4 w-[15%] hidden sm:table-cell text-center">Type</th>
                    <th className="px-6 py-3 sm:py-4 w-[30%] hidden sm:table-cell text-center">
                      {linksType === "archive" ? "Date" : "Date shared"}
                    </th>
                    <th className="px-6 py-3 sm:py-4 w-[15%] text-right pr-6 relative">
                      <button
                        onClick={() => setShowBulkMenu(!showBulkMenu)}
                        className={`p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 ${showBulkMenu ? "bg-black/5 dark:bg-white/10" : ""}`}
                      >
                        <MoreHorizontal size={16} className="ml-auto" />
                      </button>

                      {/* Bulk Actions Menu (Just the trigger) */}
                      {showBulkMenu && (
                        <div
                          ref={bulkMenuRef}
                          className={`absolute top-full right-6 mt-1 w-48 rounded-2xl shadow-2xl z-[50] overflow-hidden border animate-in slide-in-from-top-2 duration-200 ${isDark ? "bg-[#1C1C1B] border-[#2E2E2E]" : "bg-white border-[#E8E5E0]"
                            }`}
                        >
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setDeleteConfirmTarget({ id: "all", title: linksType === "archive" ? "All Archives" : "All Shared Links" });
                                setShowBulkMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={14} />
                              Delete All {linksType === "archive" ? "Archives" : "Links"}
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333]/10 dark:divide-white/5">
                  {isLoadingLinks ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4 w-[40%]"><div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-3/4"></div></td>
                        <td className="px-6 py-4 w-[15%] hidden sm:table-cell"><div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-12"></div></td>
                        <td className="px-6 py-4 w-[30%] hidden sm:table-cell"><div className="h-4 bg-gray-200 dark:bg-[#333] rounded w-24"></div></td>
                        <td className="px-6 py-4 w-[15%]"></td>
                      </tr>
                    ))
                  ) : sharedLinks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-[#7D7D7D]">
                        No {linksType === "archive" ? "archived chats" : "shared links"} found.
                      </td>
                    </tr>
                  ) : (
                    sharedLinks.map((link: any) => (
                      <tr key={link.id} className={`group hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-[#E8E5E0]/10 dark:border-white/5 last:border-b-0`}>
                        <td className="px-6 py-3 sm:py-4 w-[40%] text-sm font-medium">
                          <div className="flex flex-col gap-0.5">
                            {linksType === "archive" ? (
                                <a
                                  href={`/ai/${link.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                <LinkIcon size={14} />
                                <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                              </a>
                            ) : (
                              <a
                                href={linksType === "chat" ? `/share/chat/${link.id}` : `/share/note/${link.id}`}
                                target="_blank"
                                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                              >
                                <LinkIcon size={14} />
                                <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                              </a>
                            )}
                            {/* Mobile-only date display */}
                            <span className="text-[10px] text-[#7D7D7D] font-normal sm:hidden mt-1">
                              {new Date(link.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 sm:py-4 w-[15%] hidden sm:table-cell text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${isDark ? "bg-[#333] text-[#BABABA]" : "bg-[#E8E5E0] text-[#545454]"}`}>
                            {linksType === "archive" ? "Archive" : (linksType === "chat" ? "Chat" : "Note")}
                          </span>
                        </td>
                        <td className="px-6 py-3 sm:py-4 w-[30%] text-xs text-[#7D7D7D] hidden sm:table-cell text-center">
                          {new Date(link.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-3 sm:py-4 w-[15%] text-right pr-6">
                          <div className="flex items-center justify-end gap-3 sm:gap-5">
                            {linksType === "archive" ? (
                              <button
                                onClick={() => handleUnarchive(link.id)}
                                disabled={revokingId === link.id}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? "hover:bg-[#1C1C1B] text-[#BABABA] hover:text-white" : "hover:bg-white text-[#545454] hover:text-[#252525]"}`}
                                title="Unarchive chat"
                              >
                                {revokingId === link.id ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                              </button>
                            ) : (
                              <button
                                onClick={() => window.open(linksType === "chat" ? `/share/chat/${link.id}` : `/share/note/${link.id}`, '_blank')}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? "hover:bg-[#1C1C1B] text-[#BABABA] hover:text-white" : "hover:bg-white text-[#545454] hover:text-[#252525]"}`}
                                title={`View ${linksType}`}
                              >
                                {linksType === "chat" ? <MessageSquare size={14} /> : <FileIcon2 size={14} />}
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirmTarget({ id: link.id, title: link.title || `Untitled ${linksType}` })}
                              disabled={revokingId === link.id}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${isDark ? "hover:bg-red-500/10 text-red-500 hover:text-red-600" : "hover:bg-red-50 text-red-500 hover:text-red-700"}`}
                              title={`Delete ${linksType === "archive" ? "chat" : "link"}`}
                            >
                              {revokingId === link.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Centered Delete Confirmation Dialog */}
            {deleteConfirmTarget && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in" onClick={() => setDeleteConfirmTarget(null)} />
                <div className={`relative w-full max-w-[340px] rounded-3xl shadow-2xl p-6 border animate-in zoom-in-95 duration-200 ${isDark ? "bg-[#1C1C1B] border-[#2E2E2E] text-white" : "bg-white border-[#E8E5E0] text-[#252525]"
                  }`}>
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group animate-bounce">
                      <Trash2 size={24} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold">Are you sure?</h4>
                      <p className="text-sm text-[#7D7D7D] leading-relaxed">
                        Are you sure you want to delete <span className="text-red-500 font-bold">"{deleteConfirmTarget.title}"</span>? <br />This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex flex-col w-full gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (deleteConfirmTarget.id === "all") handleDeleteAll();
                          else handleRevokeLink(deleteConfirmTarget.id);
                          setDeleteConfirmTarget(null);
                        }}
                        className="w-full py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-95 transition-all shadow-lg"
                      >
                        {isBulkDeleting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "YES, DELETE"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTarget(null)}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${isDark ? "hover:bg-[#2E2E2E] text-[#BABABA]" : "hover:bg-gray-100 text-[#7D7D7D]"
                          }`}
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
