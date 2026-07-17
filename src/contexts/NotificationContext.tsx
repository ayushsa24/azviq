"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import useSWR from "swr";

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    related_subject?: string;
    related_topic?: string;
    is_read: boolean;
    created_at: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    panelOpen: boolean;
    setPanelOpen: (open: boolean) => void;
    pushPermission: NotificationPermission | "unsupported";
    requestPushPermission: () => Promise<void>;
    studyReminders: boolean;
    setStudyReminders: (val: boolean) => void;
    aiAlerts: boolean;
    setAiAlerts: (val: boolean) => void;
    todoReminders: boolean;
    setTodoReminders: (val: boolean) => void;
    taskDueReminders: boolean;
    setTaskDueReminders: (val: boolean) => void;
    doNotDisturb: boolean;
    setDoNotDisturb: (val: boolean) => void;
    checkReminders: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const GENERATE_COOLDOWN_KEY = "notif_generate_last_date";
const PREFS_STORAGE_KEY = "notification_preferences";

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { data, mutate, isLoading } = useSWR("/api/notifications", {
        refreshInterval: 30000, // 30 seconds
        revalidateOnFocus: true,
        dedupingInterval: 15000,
    });
    const notifications: Notification[] = data?.notifications ?? [];
    const [panelOpen, setPanelOpen] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
    
    // Unified Notification Preferences
    const [prefs, setPrefs] = useState({
        studyReminders: true,
        aiAlerts: true,
        todoReminders: true,
        taskDueReminders: true,
        doNotDisturb: false
    });

    const notifiedRef = useRef<Set<string>>(new Set());
    const isCheckingRef = useRef<boolean>(false);
    const lastNativePushRef = useRef<number>(0); // Global cooldown for native pushes

    // Sync preferences from localStorage on mount and across tabs
    useEffect(() => {
        const loadPrefs = () => {
            const saved = localStorage.getItem(PREFS_STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setPrefs(prev => ({
                        ...prev,
                        ...parsed
                    }));
                } catch (e) {
                    console.error("Failed to parse prefs", e);
                }
            }
        };

        loadPrefs();

        const handleStorage = (e: StorageEvent) => {
            if (e.key === PREFS_STORAGE_KEY) {
                loadPrefs();
            }
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    const updatePrefs = (newPartial: Partial<typeof prefs>) => {
        setPrefs(prev => {
            const updated = { ...prev, ...newPartial };
            if (typeof window !== "undefined") {
                localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
            }
            return updated;
        });
    };

    const setStudyReminders = (val: boolean) => updatePrefs({ studyReminders: val });
    const setAiAlerts = (val: boolean) => updatePrefs({ aiAlerts: val });
    const setTodoReminders = (val: boolean) => updatePrefs({ todoReminders: val });
    const setTaskDueReminders = (val: boolean) => updatePrefs({ taskDueReminders: val });
    const setDoNotDisturb = (val: boolean) => updatePrefs({ doNotDisturb: val });

    const { studyReminders, aiAlerts, todoReminders, taskDueReminders, doNotDisturb } = prefs;

    // Listen for storage changes in other tabs to keep settings in sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "notification-prefs" && e.newValue) {
                try {
                    const newPrefs = JSON.parse(e.newValue);
                    setPrefs(newPrefs);
                    console.log("Notification preferences synced from another tab.");
                } catch (err) {
                    console.error("Failed to sync prefs", err);
                }
            }
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) {
            setPushPermission("unsupported");
        } else {
            setPushPermission(Notification.permission);
        }
    }, []);

    const requestPushPermission = useCallback(async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        const result = await Notification.requestPermission();
        setPushPermission(result);

        // Also register this browser for Web Push so server-side reminders work
        if (result === "granted" && "serviceWorker" in navigator && "PushManager" in window) {
            try {
                const reg = await navigator.serviceWorker.ready;
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                if (vapidKey) {
                    const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
                    const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
                    const rawData = atob(base64);
                    const applicationServerKey = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
                    const subscription = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey,
                    });
                    await fetch("/api/push/subscribe", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(subscription.toJSON()),
                    });
                    console.log("[Push] Web Push subscription saved.");
                }
            } catch (err) {
                console.error("[Push] Failed to subscribe for Web Push:", err);
            }
        }
    }, []);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        await mutate();
    }, [mutate]);

    const triggerGenerate = useCallback(async () => {
        if (!studyReminders) return; // Respect preference
        if (doNotDisturb) return; // DND blocks all notification generation

        // Fire once per day (first time app is opened each day)
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toDateString();

        // ONLY generate between 9:00 AM and 9:00 PM (21:00)
        if (hour < 9 || hour >= 21) return;

        const lastFiredDate = typeof window !== "undefined" ? localStorage.getItem(GENERATE_COOLDOWN_KEY) : null;
        if (lastFiredDate === todayStr) return; // Already ran today

        // Add a "random" element: 30% chance to fire this time. 
        if (Math.random() > 0.3) return;

        try {
            localStorage.setItem(GENERATE_COOLDOWN_KEY, todayStr);

            // Snapshot of existing IDs before generation
            const data = await fetch("/api/notifications").then(r => r.json());
            const existingIds = new Set(data.notifications?.map((n: any) => n.id) ?? []);

            await fetch("/api/notifications/generate", { method: "POST" });
            await fetchNotifications();

            // Fire native push for newly generated notifications with STAGGERING
            if (typeof window !== "undefined" && "Notification" in window) {
                console.log("System notification check: permission is", Notification.permission);
                
                if (Notification.permission === "granted" && !doNotDisturb) {
                    const afterData = await fetch("/api/notifications").then(r => r.json());
                    const newNotifs: any[] = (afterData.notifications ?? []).filter(
                        (n: any) => {
                            if (existingIds.has(n.id)) return false;
                            
                            // Category Filter
                            if (["weak_subject", "revision_reminder", "ai_task_complete"].includes(n.type) && !aiAlerts) return false;
                            if (n.type === "study_reminder" && !studyReminders) return false;
                            
                            return ["study_reminder", "task_reminder", "streak_protection", "weekly_summary", "weak_subject", "revision_reminder", "ai_task_complete"].includes(n.type);
                        }
                    );

                    console.log(`Found ${newNotifs.length} new notifications to push.`);
                    
                    // Stagger them: send one every 20 seconds
                    newNotifs.forEach((n, index) => {
                        setTimeout(() => {
                            console.log(`Firing native notification: ${n.title}`);
                            try {
                                new Notification(n.title, {
                                    body: n.message,
                                    icon: "/azviq_logo_whitebg.png",
                                    tag: n.id,
                                    requireInteraction: true // Keep it visible until the user acts
                                });
                                lastNativePushRef.current = Date.now();
                            } catch (e) {
                                console.error("Critical: Native notification failed to fire:", e);
                            }
                        }, index * 20000); // 20s spacing
                    });
                } else if (Notification.permission === "default") {
                    console.warn("Notifications are not yet allowed. Permission is 'default'.");
                } else {
                    console.error("Notifications are explicitly BLOCKED/DENIED by the browser.");
                }
            }
        } catch (e) {
            console.error("Failed to generate notifications", e);
        }
    }, [fetchNotifications, studyReminders, aiAlerts, doNotDisturb]);

    // On mount — fetch notifications and trigger daily generate
    useEffect(() => {
        triggerGenerate();
    }, [triggerGenerate]);

    // Periodic reminder checking (every 30 seconds while tab is visible)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const interval = setInterval(() => {
            // Only check when tab is visible to save resources
            if (!document.hidden) {
                checkReminders(false); // false = not manual trigger
            }
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [checkReminders]);


    const markAsRead = useCallback(async (id: string) => {
        // Optimistic update
        mutate(
            (prev: any) => ({
                ...prev,
                notifications: prev.notifications.map((n: any) =>
                    n.id === id ? { ...n, is_read: true } : n
                ),
            }),
            false
        );
        try {
            await fetch(`/api/notifications/${id}`, { method: "PATCH" });
            mutate();
        } catch (e) {
            console.error("Failed to mark as read", e);
            mutate();
        }
    }, [mutate]);

    const markAllAsRead = useCallback(async () => {
        mutate(
            (prev: any) => ({
                ...prev,
                notifications: prev.notifications.map((n: any) => ({ ...n, is_read: true })),
            }),
            false
        );
        try {
            await fetch("/api/notifications/mark-all-read", { method: "POST" });
            mutate();
        } catch (e) {
            console.error("Failed to mark all as read", e);
            mutate();
        }
    }, [mutate]);

    const deleteNotification = useCallback(async (id: string) => {
        mutate(
            (prev: any) => ({
                ...prev,
                notifications: prev.notifications.filter((n: any) => n.id !== id),
            }),
            false
        );
        try {
            await fetch(`/api/notifications/${id}`, { method: "DELETE" });
            mutate();
        } catch (e) {
            console.error("Failed to delete notification", e);
            mutate();
        }
    }, [mutate]);

    // Global To-Do Reminder Watcher
    const checkToDos = useCallback(async (isManual = false) => {
        if (!todoReminders) return; // Respect preference
        if (doNotDisturb) return; // DND blocks all notifications
        if (!isManual && isCheckingRef.current) return;

        
        // Use visible state only to decide if we should do a full UI refresh, 
        // but background logic should always run.
        
        isCheckingRef.current = true;
        try {
            const res = await fetch("/api/todos", { cache: "no-store" });
            if (!res.ok) return;
            const { todos } = await res.json();
            if (!todos) return;

            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const currentHHMM = `${hours}:${minutes}`;
            const todayStr = now.toDateString();
            const todayDay = now.getDay();

            const due = todos.filter((item: any) => {
                if (item.done || !item.time) return false;

                const itemHHMM = item.time.slice(0, 5);
                const [itemH, itemM] = itemHHMM.split(':').map(Number);
                const itemTotalMinutes = (itemH * 60) + itemM;
                const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();

                // Check if current time is within ±2 minutes of the target time
                // This creates a 4-minute window centered on the scheduled time for better reliability
                const diff = Math.abs(currentTotalMinutes - itemTotalMinutes);
                if (diff > 2) return false;

                let isMatchToday = false;
                if (item.repeat === "today") {
                    if (!item.created_at) isMatchToday = true;
                    else {
                        const createdDate = new Date(item.created_at);
                        isMatchToday = createdDate.toDateString() === todayStr;
                        if (isMatchToday) {
                            const [iH, iM] = itemHHMM.split(':').map(Number);
                            const createH = createdDate.getHours();
                            const createM = createdDate.getMinutes();
                            if (createH > iH || (createH === iH && createM > iM)) return false;
                        }
                    }
                }
                else if (item.repeat === "daily") isMatchToday = true;
                else if (item.repeat === "weekdays") isMatchToday = todayDay >= 1 && todayDay <= 5;
                else if (item.repeat === "weekends") isMatchToday = todayDay === 0 || todayDay === 6;
                else if (item.repeat === "custom") isMatchToday = (item.custom_days || []).includes(todayDay);
                return isMatchToday;
            });

            for (const item of due) {
                const key = `notified-todo-${item.id}-${todayStr}-${currentHHMM}`;
                if (typeof window !== "undefined") {
                    if (localStorage.getItem(key)) continue;
                    localStorage.setItem(key, "true");
                }
                if (notifiedRef.current.has(key)) continue;
                notifiedRef.current.add(key);
                const postRes = await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "todo_reminder",
                        title: "To-Do Reminder",
                        message: `Time for: ${item.title}`,
                        related_topic: item.id
                    }),
                });
                if (postRes.ok) {
                    await fetchNotifications();
                    // Fire native system notification if permitted
                    if (typeof window !== "undefined" && "Notification" in window) {
                        console.log(`To-Do found! Permission: ${Notification.permission}`);
                        if (Notification.permission === "granted" && !doNotDisturb) {
                            try {
                                new Notification("⏰ To-Do Reminder", {
                                    body: `Time for: ${item.title}`,
                                    icon: "/azviq_logo_whitebg.png",
                                    tag: item.id,
                                    requireInteraction: true
                                });
                                lastNativePushRef.current = Date.now();
                                console.log(`To-Do popup fired for: ${item.title}`);
                            } catch (e) {
                                console.error("To-Do popup error:", e);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Global reminder check failed:", err);
        } finally {
            isCheckingRef.current = false;
        }
    }, [fetchNotifications, todoReminders, doNotDisturb]);

    useEffect(() => {
        // Legacy polling removed — Todo reminders are now handled server-side by Upstash Workflow.
        // The workflow fires an API call at exactly the right time, which sends a Web Push notification.
        // This eliminates the need for constant database polling.
    }, []);

    // Task Deadline Watcher — fires once per day at 9:00 AM
    const checkTaskDeadlines = useCallback(async (isManual = false) => {
        if (!taskDueReminders) return; // Respect preference
        if (doNotDisturb) return; // DND blocks all notifications
        if (!isManual && document.visibilityState !== "visible") return;

        try {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            // Only fire between 9:00 AM and 9:05 AM
            if (!isManual && (currentHour !== 9 || currentMinute > 5)) return;

            const todayStr = now.toDateString();
            const res = await fetch("/api/tasks", { cache: "no-store" });
            if (!res.ok) return;
            const { tasks } = await res.json();
            if (!tasks) return;

            const dueToday = tasks.filter((task: any) => {
                if (!task.due_date) return false;
                if (task.status === "done" || task.status === "completed") return false;
                const dueDate = new Date(task.due_date);
                return dueDate.toDateString() === todayStr;
            });

            for (const task of dueToday) {
                const key = `deadline-notified-${task.id}-${todayStr}`;
                if (typeof window !== "undefined") {
                    if (localStorage.getItem(key)) continue;
                    localStorage.setItem(key, "true");
                }

                const postRes = await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "task_deadline",
                        title: "Task Due Today",
                        message: `Your task "${task.title}" is due today!`,
                        related_topic: task.id,
                    }),
                });

                if (postRes.ok) {
                    await fetchNotifications();
                    // Native push notification with stagger
                    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && !doNotDisturb) {
                        const now = Date.now();
                        const sinceLast = now - lastNativePushRef.current;
                        const delay = sinceLast < 30000 ? 30000 - sinceLast : 0;

                        setTimeout(() => {
                            new Notification("🗓️ Task Due Today", {
                                body: `Your task "${task.title}" is due today!`,
                                icon: "/azviq_logo_whitebg.png",
                                tag: `deadline-${task.id}`,
                            });
                            lastNativePushRef.current = Date.now();
                        }, delay);
                    }
                }
            }
        } catch (err) {
            console.error("Task deadline check failed:", err);
        }
    }, [fetchNotifications, taskDueReminders, doNotDisturb]);

    // Task deadlines are checked on manual trigger (checkReminders) only.
    // Server-side Upstash Workflow handles automated task deadline push notifications.
    useEffect(() => {
        checkTaskDeadlines();
    }, [checkTaskDeadlines]);

    const checkReminders = useCallback(async () => {
        await Promise.all([
            checkToDos(true),
            checkTaskDeadlines(true)
        ]);
    }, [checkToDos, checkTaskDeadlines]);

    // Automatically mark all as read when the panel is opened
    useEffect(() => {
        if (panelOpen && unreadCount > 0) {
            markAllAsRead();
        }
    }, [panelOpen, unreadCount, markAllAsRead]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            fetchNotifications,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            panelOpen,
            setPanelOpen,
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
            setDoNotDisturb,
            checkReminders
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotifications must be used within a NotificationProvider");
    return context;
}
