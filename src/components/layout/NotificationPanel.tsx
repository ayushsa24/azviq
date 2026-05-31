"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { Bell, X, AlertTriangle, Trash2, Clock, TrendingUp, Calendar, BarChart2, Flame, ListTodo, Zap, CalendarClock, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

const TYPE_CONFIG: Record<string, { icon: any }> = {
    study_reminder:    { icon: Clock },
    task_reminder:     { icon: Calendar },
    revision_reminder: { icon: BookOpen },
    revision_missed:   { icon: AlertTriangle },
    weak_subject:      { icon: TrendingUp },
    streak_protection: { icon: Flame },
    weekly_summary:    { icon: BarChart2 },
    todo_reminder:     { icon: ListTodo },
    task_deadline:     { icon: CalendarClock },
};

export default function NotificationPanel() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const {
        notifications, unreadCount, isLoading,
        markAsRead, markAllAsRead, deleteNotification,
        panelOpen, setPanelOpen,
        pushPermission, requestPushPermission,
    } = useNotifications();
    const [activeConfirmId, setActiveConfirmId] = useState<string | null>(null);
    const router = useRouter();
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef(0);
    const touchStartX = useRef(0);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Handle mobile hardware back button
    useEffect(() => {
        if (panelOpen && typeof window !== "undefined" && isMobile) {
            window.history.pushState({ modal: 'notifications' }, "");
            const handlePopState = () => {
                setPanelOpen(false);
            };
            window.addEventListener("popstate", handlePopState);
            return () => window.removeEventListener("popstate", handlePopState);
        }
    }, [panelOpen, setPanelOpen, isMobile]);

    const handleClose = () => {
        setPanelOpen(false);
        if (typeof window !== "undefined" && isMobile) {
            router.push("/dashboard");
        }
    };

    // Close on outside click (Desktop only)
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!isMobile && panelRef.current && !panelRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement;
                if (target.closest("[data-notification-bell]")) return;
                setPanelOpen(false);
            }
        };
        if (panelOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [panelOpen, setPanelOpen, isMobile]);

    return (
        <AnimatePresence>
            {panelOpen && (
                <>
                    {/* Backdrop for Mobile */}
                    {isMobile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-[2px]"
                            onClick={handleClose}
                        />
                    )}

                    <motion.div
                        ref={panelRef}
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: -10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: -10 }}
                        transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.8 }}
                        onDragEnd={(_, info) => {
                            if (isMobile && (info.offset.y > 150 || info.velocity.y > 600)) {
                                handleClose();
                            }
                        }}
                        className={`
                            fixed z-[500] flex flex-col overflow-hidden
                            ${isMobile 
                                ? "inset-x-0 bottom-0 h-[92dvh] rounded-t-[20px] pt-2" 
                                : "top-[3.75rem] left-[17rem] w-[22.5rem] max-h-[calc(100vh-7.5rem)] rounded-xl shadow-2xl border"
                            }
                            ${isDark
                                ? "bg-[#1A1A1A] md:border-[#3A3A3A] text-white"
                                : "bg-[#F5F3EF] md:bg-white md:border-[#E8E5E0] text-[#252525]"
                            }
                        `}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile Drag Handle */}
                        {isMobile && (
                            <div className="w-full flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
                            </div>
                        )}

                        {/* Header */}
                        <div 
                            className={`flex items-center justify-between px-4 sm:px-6 pt-2 pb-2.5 md:px-5 md:pt-3 md:pb-3 border-b shrink-0 ${isDark ? "border-[#333]" : "border-[#E8E5E0]"}`}
                        >
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 md:w-4 md:h-4" />
                                <span className="font-extrabold text-xl md:font-semibold md:text-sm">Notifications</span>
                                {unreadCount > 0 && (
                                <span className="bg-[#C2A27A] text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleClose}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-[#333] text-[#BABABA]" : "hover:bg-[#F0EDE8] text-[#545454]"}`}
                                >
                                    <X className="w-5 h-5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Push Notification Enable Banner */}
                        {pushPermission === "default" && (
                            <div className={`mx-3 mt-2 mb-0 flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                                isDark ? "bg-[#C2A27A]/10 border-[#C2A27A]/20" : "bg-amber-50 border-amber-200"
                            }`}>
                                <Zap className="w-4 h-4 shrink-0 text-[#C2A27A]" />
                                <p className={`text-[0.6875rem] flex-1 leading-tight ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
                                    Enable phone alerts for To-Do reminders
                                </p>
                                <button
                                    onClick={requestPushPermission}
                                    className="px-3 py-1 bg-[#C2A27A] hover:bg-[#B08F67] text-white text-[0.6875rem] font-bold rounded-full shrink-0 transition-all active:scale-95"
                                >
                                    Enable
                                </button>
                            </div>
                        )}

                        {/* List */}
                        <div 
                            ref={scrollContainerRef}
                            className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain"
                            onTouchStart={(e) => {
                                touchStartY.current = e.touches[0].clientY;
                                touchStartX.current = e.touches[0].clientX;
                            }}
                            onTouchEnd={(e) => {
                                if (!isMobile) return;
                                const el = scrollContainerRef.current;
                                if (!el) return;
                                const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                                const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                                
                                // Only close if it's a clear downswipe (deltaY > 80) and NOT a side swipe
                                if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) && el.scrollTop <= 0) {
                                    handleClose();
                                }
                            }}
                        >
                            {isLoading && notifications.length === 0 ? (
                                <div className="flex flex-col gap-3 p-4">
                                    {[1,2,3].map(i => (
                                        <div key={i} className={`h-16 rounded-xl animate-pulse ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`} />
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <Bell className={`w-10 h-10 mb-3 ${isDark ? "text-[#545454]" : "text-[#CFCFCF]"}`} />
                                    <p className={`text-sm font-medium ${isDark ? "text-[#7D7D7D]" : "text-[#545454]"}`}>
                                        No notifications yet
                                    </p>
                                    <p className={`text-xs mt-1 ${isDark ? "text-[#545454]" : "text-[#9E9E9E]"}`}>
                                        Study daily to get smart reminders!
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    <AnimatePresence initial={false}>
                                        {notifications.map((n) => (
                                            <NotificationItem
                                                key={n.id}
                                                notification={n}
                                                isDark={isDark}
                                                activeConfirmId={activeConfirmId}
                                                setActiveConfirmId={setActiveConfirmId}
                                                onRead={markAsRead}
                                                onDelete={deleteNotification}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function NotificationItem({
    notification: n, isDark, activeConfirmId, setActiveConfirmId, onRead, onDelete
}: {
    notification: Notification;
    isDark: boolean;
    activeConfirmId: string | null;
    setActiveConfirmId: (id: string | null) => void;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const router = useRouter();
    const { setPanelOpen } = useNotifications();
    const showConfirm = activeConfirmId === n.id;
    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.study_reminder;
    const Icon = cfg.icon;

    // Clean up title (remove emojis and [Icon] pattern) for display
    const displayTitle = n.title
        .replace(/\[\w+\]\s*/g, "") // Remove [Icon] anywhere in title
        .replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove actual emojis
        .trim();

    const x = useMotionValue(0);
    const background = useTransform(
        x,
        [-100, 0],
        ["rgba(239, 68, 68, 1)", "rgba(239, 68, 68, 0)"]
    );
    const opacity = useTransform(x, [-80, 0], [1, 0]);
    const scale = useTransform(x, [-100, 0], [1, 0.5]);

    const handleDeleteClick = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        setActiveConfirmId(n.id);
    };

    useEffect(() => {
        if (!showConfirm) {
            animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
        }
    }, [showConfirm, x]);

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showConfirm) return;

        // Mark as read if not already
        if (!n.is_read) onRead(n.id);

        // Close the panel
        setPanelOpen(false);

        // Navigate based on type
        const payload = n.related_topic;

        switch (n.type) {
            case "task_reminder":
                router.push(payload ? `/tasks?id=${payload}` : "/tasks");
                break;
            case "revision_reminder":
            case "revision_missed":
            case "weak_subject":
                if (payload) {
                    if (payload.startsWith("revision:")) {
                        router.push(`/preparation/revision/${payload.split(":")[1]}`);
                    } else if (payload.startsWith("note:")) {
                        router.push(`/library/note/${payload.split(":")[1]}`);
                    } else if (payload.startsWith("pdf:")) {
                        router.push(`/library/pdf/${payload.split(":")[1]}`);
                    } else if (payload.startsWith("exercise:")) {
                        router.push(`/preparation/exercise/${payload.split(":")[1]}`);
                    } else if (payload.startsWith("search:")) {
                        const searchTerm = encodeURIComponent(payload.split(":")[1]);
                        if (n.type === "weak_subject") {
                            router.push(`/preparation?search=${searchTerm}`);
                        } else {
                            router.push(`/library?search=${searchTerm}`);
                        }
                    } else {
                        // Fallback for old notifications without prefixes
                        if (n.type === "weak_subject") {
                            router.push("/preparation");
                        } else {
                            // Assume old revision id
                            router.push(`/preparation/revision/${payload}`);
                        }
                    }
                } else {
                    router.push(n.type === "weak_subject" ? "/preparation" : "/preparation/revision");
                }
                break;
            case "study_reminder":
                router.push("/library");
                break;
            case "streak_protection":
            case "weekly_summary":
            case "todo_reminder":
                router.push("/dashboard");
                break;
            default:
                router.push("/dashboard");
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -200 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative px-2"
        >
            <AnimatePresence mode="wait">
                {!showConfirm ? (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative"
                    >
                        {/* Swipe Background */}
                        <motion.div
                            style={{ background }}
                            className="absolute inset-y-0 right-2 left-2 rounded-2xl flex items-center justify-end pr-6 pointer-events-none"
                        >
                            <motion.div style={{ opacity, scale }} className="text-white">
                                <Trash2 className="w-5 h-5 stroke-[2.5]" />
                            </motion.div>
                        </motion.div>

                        <motion.div
                            drag="x"
                            dragConstraints={{ left: -140, right: 0 }}
                            dragElastic={0.1}
                            style={{ x }}
                            onDragStart={() => {
                                if (activeConfirmId !== n.id) {
                                    setActiveConfirmId(null);
                                }
                            }}
                            onDragEnd={(_, info) => {
                                if (info.offset.x < -100) {
                                    setActiveConfirmId(n.id);
                                } else {
                                    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
                                }
                            }}
                            className={`
                                relative flex items-start gap-4 px-4 sm:px-6 md:px-5 py-4 rounded-2xl transition-all cursor-pointer group z-10
                                ${!n.is_read
                                    ? isDark ? "bg-[#2A2A2A] shadow-lg border border-[#3A3A3A]" : "bg-white border border-[#E8E5E0] shadow-sm"
                                    : isDark ? "bg-[#1A1A1A] hover:bg-[#252525]" : "bg-white hover:bg-[#F9F8F6]"
                                }
                            `}
                            onClick={handleAction}
                        >
                            {!n.is_read && (
                                <span className={`absolute top-4 right-4 sm:right-6 md:right-4 w-2 h-2 rounded-full flex-shrink-0 ${isDark ? "bg-white" : "bg-[#252525]"}`} />
                            )}

                            <div className={`mt-0.5 w-5 h-5 flex items-center justify-center flex-shrink-0 ${isDark ? "text-white" : "text-[#252525]"}`}>
                                <Icon className="w-4 h-4 stroke-[2]" />
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                                <p className={`text-[0.8125rem] font-bold leading-snug flex items-center gap-1.5 ${isDark ? "text-white" : "text-[#252525]"}`}>
                                    {(() => {
                                        const iconMatch = n.title.match(/\[(\w+)\]/);
                                        if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                            const IconComp = ICON_MAP[iconMatch[1]];
                                            return <IconComp size={14} className="opacity-60 shrink-0" strokeWidth={2} />;
                                        }
                                        return null;
                                    })()}
                                    <span>{displayTitle}</span>
                                </p>
                                <p className={`text-xs mt-0.5 leading-snug line-clamp-1 ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
                                    {n.message}
                                </p>
                                <p className={`text-[0.625rem] mt-1.5 font-medium ${isDark ? "text-[#545454]" : "text-[#9E9E9E]"}`}>
                                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </p>
                            </div>

                            <button
                                onClick={handleDeleteClick}
                                className={`hidden md:block absolute top-2.5 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all ${isDark ? "hover:bg-[#333] text-[#545454] hover:text-white" : "hover:bg-[#E8E5E0] text-[#9E9E9E] hover:text-[#252525]"}`}
                                title="Dismiss"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`
                            relative flex items-center justify-between gap-4 px-5 py-5 rounded-2xl border-2 z-20
                            ${isDark ? "bg-[#252525] border-red-900/30" : "bg-white border-red-100"}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-500"}`}>
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <span className={`text-[13px] font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>Delete?</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveConfirmId(null)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isDark ? "text-[#7D7D7D] hover:text-white" : "text-[#9E9E9E] hover:text-[#252525]"}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onDelete(n.id)}
                                className="px-5 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold shadow-md hover:bg-red-600 active:scale-95 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
