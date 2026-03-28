"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
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
  ExternalLink
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useZoom } from "@/contexts/ZoomContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useSession, signOut } from "next-auth/react";
import { useSettings } from "@/contexts/SettingsContext";
import { useLanguage, LanguageCode } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { translations } from "@/utils/translations";

type Tab = "general" | "notifications" | "data" | "account" | "parent_control";

export default function SettingsModal() {
  const { isOpen, closeSettings, initialTab } = useSettings();
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
    { id: "data", label: translations[language].data_controls, icon: Globe },
    { id: "account", label: translations[language].account, icon: User },
    { id: "parent_control", label: translations[language].parent_control, icon: ShieldAlert },
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
        onClick={closeSettings}
      />

      {/* Modal Container */}
      <div className={`relative w-full h-full sm:h-[600px] sm:max-w-3xl flex flex-col sm:flex-row rounded-none sm:rounded-3xl overflow-hidden shadow-2xl transition-colors border-0 sm:border animate-in zoom-in-95 duration-200 ${
        isDark ? "bg-[#1A1A1A] text-white border-[#3A3A3A]" : "bg-white text-[#252525] border-[#E8E5E0]"
      }`}>

        {/* Sidebar (Desktop) / Top Bar (Mobile) */}
        <div className={`shrink-0 flex-none border-b sm:border-b-0 sm:border-r transition-colors flex flex-col ${
          isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-[#F7F7F8] border-[#E8E5E0]"
        } ${"w-full sm:w-64"}`}>
          
          {/* Header Area */}
          <div className="flex items-center justify-between px-4 pt-14 pb-4 sm:pt-6 sm:px-6">
            <h2 className="text-lg font-bold sm:text-2xl">{translations[language].settings}</h2>
            <button onClick={closeSettings} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
            </button>
          </div>

          {/* Navigation - Sidebar on desktop, horizontal scroll on mobile */}
          <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible px-2 pb-2 sm:pb-6 space-x-1 sm:space-x-0 sm:space-y-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-medium whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink outline-none ${
                    isActive
                      ? isDark ? "bg-[#333] text-white" : "bg-white sm:bg-[#F0F0F0] text-[#252525] shadow-sm sm:shadow-none border border-[#E8E5E0] sm:border-transparent"
                      : isDark ? "text-[#BABABA] hover:bg-[#252525]" : "text-[#545454] hover:bg-[#E8E5E0]"
                  }`}
                >
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 overscroll-contain">
            
            {activeTab === "general" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{translations[language].theme}</h3>
                    <p className="text-xs text-[#7D7D7D]">Switch between light and dark mode</p>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${
                        isDark ? "bg-[#333] border-[#444] text-white" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525]"
                    }`}
                  >
                    {isDark ? <Moon size={14} /> : <Sun size={14} />}
                    {isDark ? translations[language].dark : translations[language].light}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                    <div>
                        <h3 className="text-sm font-semibold">{translations[language].language}</h3>
                        <p className="text-xs text-[#7D7D7D]">Set your preferred interface language</p>
                    </div>
                    <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none transition-all ${
                            isDark ? "bg-[#333] border-[#444] text-white" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#252525]"
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

                <div className="flex flex-col gap-5 pt-6 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold">Interface Scale</h3>
                            <p className="text-xs text-[#7D7D7D]">Adjust text and element sizing</p>
                        </div>
                        <button 
                            onClick={resetZoom}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all active:scale-95 ${
                                isDark ? "bg-[#333] text-[#BABABA] hover:text-white" : "bg-[#F0EDE8] text-[#7D7D7D] hover:text-[#252525]"
                            }`}
                        >
                            RESET
                        </button>
                    </div>

                    <div className="flex items-center gap-4 px-2">
                        <button 
                            onClick={zoomOut}
                            className={`text-[10px] font-bold transition-all hover:scale-125 active:scale-90 p-1 rounded-md ${
                                isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
                            }`}
                        >
                            A
                        </button>
                        <div className="relative flex-1 group h-10 flex items-center">
                            {/* Unified Track Background */}
                            <div className={`absolute left-0 right-0 h-1.5 rounded-full ${
                                isDark ? "bg-white/10" : "bg-black/10"
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
                            className={`text-lg font-bold transition-all hover:scale-110 active:scale-95 p-1 rounded-md ${
                                isDark ? "text-white/40 hover:text-white" : "text-black/40 hover:text-black"
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

                <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
                    <div>
                        <h3 className="text-sm font-semibold">User Info</h3>
                        <p className="text-xs text-[#7D7D7D]">{session?.user?.email || "No email"}</p>
                    </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Enable Notifications</h3>
                    <p className="text-xs text-[#7D7D7D]">Receive updates and reminders</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                    pushPermission === "granted" 
                      ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                      : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                  }`} onClick={requestPushPermission}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        pushPermission === "granted" ? "right-1" : "left-1"
                      }`} />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Study Reminders</h3>
                      <p className="text-xs text-[#7D7D7D]">Daily alerts to stay on track</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      studyReminders
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setStudyReminders(!studyReminders)}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          studyReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">AI Assistant Alerts</h3>
                      <p className="text-xs text-[#7D7D7D]">Notify when long tasks are complete</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      aiAlerts
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setAiAlerts(!aiAlerts)}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          aiAlerts ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">To-Do Reminders</h3>
                      <p className="text-xs text-[#7D7D7D]">Alerts for scheduled to-do items</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      todoReminders
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setTodoReminders(!todoReminders)}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          todoReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Task Deadlines</h3>
                      <p className="text-xs text-[#7D7D7D]">Alerts when tasks are due today</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      taskDueReminders
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setTaskDueReminders(!taskDueReminders)}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          taskDueReminders ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Do Not Disturb</h3>
                      <p className="text-xs text-[#7D7D7D]">Silence all alerts for better focus</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      doNotDisturb
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]" 
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                    }`} onClick={() => setDoNotDisturb(!doNotDisturb)}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                          doNotDisturb ? "right-1" : "left-1"
                        }`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
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

                  <div className="pt-4">
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
                  </div>

                  {pushPermission === "denied" && (
                    <div className={`p-3 rounded-xl text-[11px] leading-relaxed flex items-start gap-2 ${
                      isDark ? "bg-red-500/10 text-red-400" : "bg-red-500/5 text-red-600"
                    }`}>
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      Browser permissions are blocked. Please enable them in your address bar settings to receive alerts.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "data" && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#252525] dark:text-amber-200">
                        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
                            <AlertTriangle size={16} /> Data Transparency
                        </div>
                        <p className="text-xs leading-relaxed opacity-80">
                            Your library content (PDFs, Notes) is indexed for AI generation only. Avyx does not sell your private data to third-party advertisers.
                        </p>
                    </div>

                    <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E8E5E0] dark:border-[#3A3A3A] hover:bg-[#F0F0F0] dark:hover:bg-[#333] transition-colors">
                        <span className="text-sm font-semibold">Export All Data</span>
                        <Globe size={16} className="opacity-40" />
                    </button>
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
              <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">

                {/* Master Controls */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Parental Control Mode</h3>
                    <p className="text-xs text-[#7D7D7D]">Enable monitoring and safety features</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                    localControlEnabled
                      ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]"
                      : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                  }`} onClick={() => setLocalControlEnabled(!localControlEnabled)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        localControlEnabled ? "right-1" : "left-1"
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
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                          isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-[#F7F7F8] border-[#E8E5E0]"
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
                          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                            isDark ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]" : "bg-[#252525] text-white hover:bg-[#333]"
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

                <div className="flex flex-col gap-4 pt-5 border-t border-black/5 dark:border-white/5">

                  {/* Restricted AI */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Restricted AI Content</h3>
                      <p className="text-xs text-[#7D7D7D]">Filter AI responses for younger audiences</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${
                      localRestrictedMode
                        ? isDark ? "bg-[#C2A27A]" : "bg-[#252525]"
                        : isDark ? "bg-[#333]" : "bg-[#E8E5E0]"
                      }`} onClick={() => setLocalRestrictedMode(!localRestrictedMode)}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                        localRestrictedMode ? "right-1" : "left-1"
                      }`} />
                    </div>
                  </div>

                  {/* Daily Study Target */}
                  <div className="flex flex-col gap-2">
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
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Report Delivery Time */}
                  <div className="flex flex-col gap-2">
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
                    className={`w-full mt-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isDark ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]" : "bg-[#252525] text-white hover:bg-[#333]"
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
    </div>
  );
}
