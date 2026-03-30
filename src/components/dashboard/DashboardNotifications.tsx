"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import {
    Bell, Clock, Calendar, BookOpen, AlertTriangle,
    TrendingUp, Flame, BarChart2, ChevronRight, CheckCheck
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; darkBg: string; darkColor: string; label: string }> = {
    study_reminder:    { icon: Clock,         color: "text-blue-600",   bg: "bg-blue-50",    darkBg: "bg-blue-900/20",   darkColor: "text-blue-300",   label: "Study" },
    task_reminder:     { icon: Calendar,      color: "text-orange-600", bg: "bg-orange-50",  darkBg: "bg-orange-900/20", darkColor: "text-orange-300", label: "Task" },
    revision_reminder: { icon: BookOpen,      color: "text-purple-600", bg: "bg-purple-50",  darkBg: "bg-purple-900/20", darkColor: "text-purple-300", label: "Revision" },
    revision_missed:   { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",     darkBg: "bg-red-900/20",    darkColor: "text-red-300",    label: "Weak Topic" },
    weak_subject:      { icon: TrendingUp,    color: "text-yellow-600", bg: "bg-yellow-50",  darkBg: "bg-yellow-900/20", darkColor: "text-yellow-300", label: "Weak Area" },
    streak_protection: { icon: Flame,         color: "text-rose-600",   bg: "bg-rose-50",    darkBg: "bg-rose-900/20",   darkColor: "text-rose-300",   label: "Streak" },
    weekly_summary:    { icon: BarChart2,     color: "text-green-600",  bg: "bg-green-50",   darkBg: "bg-green-900/20",  darkColor: "text-green-300",  label: "Summary" },
};

export default function DashboardNotifications() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading, setPanelOpen } = useNotifications();

    // Show only top 4 unread + 1 most recent read
    const unread = notifications.filter((n) => !n.is_read).slice(0, 4);
    const read = notifications.filter((n) => n.is_read).slice(0, 1);
    const displayed = unread.length > 0 ? unread : read.slice(0, 3);

    return (
        <div className={`rounded-2xl border p-4 sm:p-5 transition-colors ${isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-white border-[#E8E5E0]"}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Bell className={`w-4 h-4 ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`} />
                    <span className={`text-sm font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>
                        Notifications
                    </span>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${isDark ? "text-[#7D7D7D] hover:text-white" : "text-[#7D7D7D] hover:text-[#252525]"}`}
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            All read
                        </button>
                    )}
                    <button
                        onClick={() => setPanelOpen(true)}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${isDark ? "text-[#7D7D7D] hover:text-white" : "text-[#7D7D7D] hover:text-[#252525]"}`}
                    >
                        See all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading && displayed.length === 0 ? (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`h-14 rounded-xl animate-pulse ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`} />
                    ))}
                </div>
            ) : displayed.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-8 text-center rounded-xl ${isDark ? "bg-[#252525]" : "bg-[#F5F3EF]"}`}>
                    <Bell className={`w-8 h-8 mb-2 ${isDark ? "text-[#545454]" : "text-[#CFCFCF]"}`} />
                    <p className={`text-xs font-medium ${isDark ? "text-[#545454]" : "text-[#9E9E9E]"}`}>
                        All caught up! Keep studying 🎉
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {displayed.map((n) => (
                        <NotifRow key={n.id} notification={n} isDark={isDark} onRead={markAsRead} />
                    ))}
                </div>
            )}
        </div>
    );
}

function NotifRow({ notification: n, isDark, onRead }: { notification: Notification; isDark: boolean; onRead: (id: string) => void }) {
    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.study_reminder;
    const Icon = cfg.icon;

    return (
        <button
            className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.99] ${
                !n.is_read
                    ? isDark ? "bg-[#252525] border border-[#3A3A3A]" : "bg-[#F9F8F6] border border-[#E8E5E0]"
                    : isDark ? "hover:bg-[#252525]/50" : "hover:bg-[#F5F3EF]"
            }`}
            onClick={() => !n.is_read && onRead(n.id)}
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? cfg.darkBg : cfg.bg}`}>
                <Icon className={`w-4 h-4 ${isDark ? cfg.darkColor : cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 justify-between">
                    <p className={`text-xs font-semibold truncate ${isDark ? "text-white" : "text-[#252525]"} `}>
                        {n.title}
                    </p>
                    {!n.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                </div>
                <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${isDark ? "text-[#7D7D7D]" : "text-[#7D7D7D]"}`}>
                    {n.message}
                </p>
                <p className={`text-[10px] mt-1 ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
            </div>
        </button>
    );
}
