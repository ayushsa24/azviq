"use client";
import React from "react";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle, CalendarClock } from "lucide-react";

export default function SettingsPage() {
  const { theme } = useTheme();
  const { pushPermission, requestPushPermission } = useNotifications();
  const isDark = theme === "dark";

  const statusConfig = {
    granted: {
      label: "Allowed",
      icon: CheckCircle,
      color: "text-green-500",
      bg: isDark ? "bg-green-900/20" : "bg-green-50",
      border: isDark ? "border-green-800/30" : "border-green-200",
    },
    denied: {
      label: "Blocked",
      icon: XCircle,
      color: "text-red-500",
      bg: isDark ? "bg-red-900/20" : "bg-red-50",
      border: isDark ? "border-red-800/30" : "border-red-200",
    },
    default: {
      label: "Not Enabled",
      icon: AlertCircle,
      color: "text-[#C2A27A]",
      bg: isDark ? "bg-[#C2A27A]/10" : "bg-amber-50",
      border: isDark ? "border-[#C2A27A]/20" : "border-amber-200",
    },
    unsupported: {
      label: "Not Supported",
      icon: BellOff,
      color: "text-[#7D7D7D]",
      bg: isDark ? "bg-[#252525]" : "bg-[#F5F5F5]",
      border: isDark ? "border-[#3A3A3A]" : "border-[#E0E0E0]",
    },
  };

  const status = statusConfig[pushPermission] ?? statusConfig.default;
  const StatusIcon = status.icon;

  return (
    <div className={`flex flex-col h-full ${isDark ? "bg-[#1A1A1A] text-white" : "bg-transparent text-[#252525]"} px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors`}>
      {/* Header */}
      <div className="flex items-center gap-3 pt-3 sm:pt-6 pb-4">
        <SidebarToggleButton />
        <div>
          <h1 className={`text-[23px] sm:text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-[#252525]"}`}>Settings</h1>
          <p className={`text-xs mt-0.5 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>Preferences &amp; account settings</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-6">

        {/* Notifications Section */}
        <section className={`rounded-2xl border p-5 ${isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-white border-[#E8E5E0]"}`}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`p-2 rounded-xl ${isDark ? "bg-[#252525]" : "bg-[#F5F3EF]"}`}>
              <Bell className={`w-4 h-4 ${isDark ? "text-[#C2A27A]" : "text-[#C2A27A]"}`} />
            </div>
            <div>
              <h2 className={`text-sm font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>Notifications</h2>
              <p className={`text-xs ${isDark ? "text-[#7D7D7D]" : "text-[#9E9E9E]"}`}>Manage how you receive alerts</p>
            </div>
          </div>

          {/* To-Do Reminders Row */}
          <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${status.bg} ${status.border}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 shrink-0 ${status.color}`} />
              <div>
                <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-[#252525]"}`}>To-Do Reminders</p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#7D7D7D]" : "text-[#9E9E9E]"}`}>
                  Show alerts on your phone / desktop when a to-do time arrives
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {pushPermission === "granted" && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`}>
                  Active
                </span>
              )}
              {pushPermission === "denied" && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"}`}>
                  Blocked
                </span>
              )}
              {pushPermission === "default" && (
                <button
                  onClick={requestPushPermission}
                  className="px-4 py-1.5 bg-[#C2A27A] hover:bg-[#B08F67] text-white rounded-full text-xs font-bold transition-all active:scale-95"
                >
                  Enable
                </button>
              )}
              {pushPermission === "unsupported" && (
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${isDark ? "bg-[#333] text-[#7D7D7D]" : "bg-[#F0EDE8] text-[#9E9E9E]"}`}>
                  Unsupported
                </span>
              )}
            </div>
          </div>

          {/* Extra info for denied */}
          {pushPermission === "denied" && (
            <div className={`mt-3 p-3 rounded-xl text-xs leading-relaxed ${isDark ? "bg-[#252525] text-[#BABABA]" : "bg-[#F5F3EF] text-[#545454]"}`}>
              <strong>How to fix:</strong> Open your browser address bar → click the 🔒 lock icon → change <em>Notifications</em> to <em>Allow</em>, then refresh the page.
            </div>
          )}

          {/* Task Deadline Reminders Row */}
          <div className={`mt-3 flex items-center justify-between gap-4 p-4 rounded-xl border ${
            isDark ? "bg-[#252525] border-[#2E2E2E]" : "bg-[#F5F3EF] border-[#E8E5E0]"
          }`}>
            <div className="flex items-center gap-3">
              <CalendarClock className={`w-5 h-5 shrink-0 ${isDark ? "text-[#C2A27A]" : "text-[#C2A27A]"}`} />
              <div>
                <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-[#252525]"}`}>Task Deadlines</p>
                <p className={`text-xs mt-0.5 ${isDark ? "text-[#7D7D7D]" : "text-[#9E9E9E]"}`}>
                  Get a reminder at <strong>9:00 AM</strong> if a task is due today
                </p>
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              pushPermission === "granted"
                ? isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"
                : isDark ? "bg-[#333] text-[#7D7D7D]" : "bg-[#F0EDE8] text-[#9E9E9E]"
            }`}>
              {pushPermission === "granted" ? "Active" : "Needs Push Enabled"}
            </span>
          </div>

        </section>

      </div>
    </div>
  );
}
