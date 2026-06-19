"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, CheckCircle2, Circle, Trash2, CalendarDays, ChevronDown, ArrowRight, Check, PartyPopper, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { ICON_MAP } from "@/components/editor/EmojiPicker";
import { FileText, File as FileIcon } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function DashboardTasks() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Selected task state for the detail modal
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filterRange, setFilterRange] = useState<"today" | "overdue" | "1week" | "2weeks" | "1month">("today");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { show: showToast } = useToast();
    const pendingDeletes = useRef<Record<string, NodeJS.Timeout>>({});

    // Handle click away for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Lock scroll when modal is open
    useEffect(() => {
        if (selectedTask) {
            document.body.style.overflow = "hidden";
            document.body.style.paddingRight = "var(--removed-body-scroll-bar-size, 0px)";
        } else {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        };
    }, [selectedTask]);

    const { data: tasksData, isLoading: tasksLoading, mutate: mutateTasks } = useSWR<{ tasks: Task[] }>("/api/tasks");
    const { data: projectsData, isLoading: projectsLoading, mutate: mutateProjects } = useSWR("/api/projects");
    const { data: workspacesData, isLoading: workspacesLoading, mutate: mutateWorkspaces } = useSWR("/api/workspaces");
    const { data: notesData, isLoading: notesLoading, mutate: mutateNotes } = useSWR("/api/notes");

    const tasks = tasksData?.tasks || [];
    const projects = projectsData?.projects || [];
    const workspaces = workspacesData?.workspaces || [];
    const notes = notesData?.notes || [];
    const isLoading = tasksLoading && !tasksData;

    useEffect(() => {
        const handleTaskUpdated = () => {
            mutateTasks();
            mutateProjects();
            mutateWorkspaces();
            mutateNotes();
        };
        window.addEventListener("task-updated", handleTaskUpdated);
        return () => window.removeEventListener("task-updated", handleTaskUpdated);
    }, [mutateTasks, mutateProjects, mutateWorkspaces, mutateNotes]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            setIsCreating(true);
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTaskTitle.trim(),
                    status: "not_started",
                    due_date: new Date().toISOString(), // Default to today since it's "Today's Tasks"
                }),
            });

            if (res.ok) {
                const { task } = await res.json();
                mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
                    ...currentData,
                    tasks: [task, ...(currentData?.tasks || [])]
                }) as { tasks: Task[] }, false);
                setNewTaskTitle("");
                window.dispatchEvent(new Event("task-updated"));
            }
        } catch (err) {
            console.error("Failed to create task", err);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleTaskStatus = async (task: Task, e?: React.SyntheticEvent) => {
        if (e) e.stopPropagation();
        const newStatus = task.status === "done" ? "not_started" : "done";

        // Optimistic update
        mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
            ...currentData,
            tasks: (currentData?.tasks || []).map((t: Task) => t.id === task.id ? { ...t, status: newStatus } : t)
        }) as { tasks: Task[] }, false);

        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            window.dispatchEvent(new Event("task-updated"));
        } catch (err) {
            console.error("Failed to update status");
            mutateTasks(); // revert
        }
    };

    const deleteTask = async (taskId: string, e?: React.SyntheticEvent) => {
        if (e) e.stopPropagation();

        const taskToDelete = tasks.find(t => t.id === taskId);
        if (!taskToDelete) return;

        // 1. Optimistic update
        mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
            ...currentData,
            tasks: (currentData?.tasks || []).filter((t: Task) => t.id !== taskId)
        }) as { tasks: Task[] }, false);

        // 2. Show Undo Toast
        showToast({
            message: "Moved to trash",
            type: "info",
            duration: 5000,
            action: {
                label: "Undo",
                onClick: () => {
                    // Restore task
                    mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
                        ...currentData,
                        tasks: [taskToDelete, ...(currentData?.tasks || [])]
                    }) as { tasks: Task[] }, false);

                    // Clear the timeout
                    if (pendingDeletes.current[taskId]) {
                        clearTimeout(pendingDeletes.current[taskId]);
                        delete pendingDeletes.current[taskId];
                    }
                }
            }
        });

        // 3. Set timeout for actual deletion
        const timeout = setTimeout(async () => {
            try {
                await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
                window.dispatchEvent(new Event("task-updated"));
                delete pendingDeletes.current[taskId];
            } catch (err) {
                console.error("Failed to delete task", err);
                mutateTasks(); // revert
            }
        }, 5000);

        pendingDeletes.current[taskId] = timeout;
    };

    const handleTaskUpdated = (updatedTask?: Task) => {
        if (updatedTask) {
            mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
                ...currentData,
                tasks: (currentData?.tasks || []).map((t: Task) => t.id === updatedTask.id ? updatedTask : t)
            }) as { tasks: Task[] }, false);
        }
        mutateTasks(); // Re-sync in background to be safe
        window.dispatchEvent(new Event("task-updated"));
    };

    // Filter for tasks based on range
    const displayTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.status === "done" || t.status === "archived") return false;
            if (!t.due_date) return false;

            const dueDate = new Date(t.due_date);
            const today = new Date();
            const maxDate = new Date();

            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            if (filterRange === "today") {
                return dueDate.toDateString() === today.toDateString();
            } else if (filterRange === "overdue") {
                return dueDate.getTime() < today.getTime();
            } else if (filterRange === "1week") {
                maxDate.setDate(today.getDate() + 7);
            } else if (filterRange === "2weeks") {
                maxDate.setDate(today.getDate() + 14);
            } else if (filterRange === "1month") {
                maxDate.setMonth(today.getMonth() + 1);
            }

            maxDate.setHours(23, 59, 59, 999);
            return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= maxDate.getTime();
        }).sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [tasks, filterRange]);

    const getTitle = () => {
        switch (filterRange) {
            case "today": return "Today's Tasks";
            case "overdue": return "Overdue Tasks";
            case "1week": return "This Week's Tasks";
            case "2weeks": return "Next 2 Weeks' Tasks";
            case "1month": return "This Month's Tasks";
            default: return "Tasks";
        }
    };

    return (
        <>
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 flex flex-col group/card relative
                ${isDropdownOpen ? "z-30" : "z-10"}
                ${displayTasks.length > 5 ? "min-h-[220px] max-h-[365px]" : "h-auto"}
                ${isDark ? "hover:bg-white/5 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"}
                shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
            `}>
                {/* Header - Fixed */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-2 border-b border-[#E8E5E0] dark:border-[#383838]">
                    <div className="flex items-center gap-2 min-w-0">
                        <CalendarDays className="w-5 h-5 text-[#252525] dark:text-white shrink-0" />
                        <h2 className="text-lg font-bold text-[#252525] dark:text-white truncate">
                            {getTitle()}
                        </h2>
                        {displayTasks.length > 0 && (
                            <span className="text-xs font-bold bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-[#CFCFCF] px-2 py-0.5 rounded-full">
                                {displayTasks.length}
                            </span>
                        )}
                    </div>

                    <div className="relative shrink-0" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-1.5 bg-[#F0EDE8] dark:bg-[#383838] hover:bg-[#E8E5E0] dark:hover:bg-[#444] text-xs font-bold text-[#252525] dark:text-[#CFCFCF] pl-3 pr-2 py-1.5 rounded-full transition-all active:scale-95 outline-none shadow-sm"
                        >
                            <span>
                                {filterRange === "today" ? "Today" :
                                    filterRange === "overdue" ? "Overdue" :
                                        filterRange === "1week" ? "1 Week" :
                                            filterRange === "2weeks" ? "2 Weeks" : "1 Month"}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-[#7D7D7D] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute right-0 top-full mt-2 w-40 bg-white/95 dark:bg-[#2A2A2A]/95 backdrop-blur-md border border-[#E8E5E0] dark:border-[#545454] rounded-2xl shadow-xl z-[100] p-1.5 overflow-hidden"
                                >
                                    {[
                                        { v: "today", l: "Today" },
                                        { v: "overdue", l: "Overdue" },
                                        { v: "1week", l: "1 Week" },
                                        { v: "2weeks", l: "2 Weeks" },
                                        { v: "1month", l: "1 Month" }
                                    ].map((opt) => (
                                        <button
                                            key={opt.v}
                                            onClick={() => {
                                                setFilterRange(opt.v as any);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterRange === opt.v
                                                ? "bg-[#C2A27A]/10 dark:bg-[#C2A27A]/20 text-[#C2A27A]"
                                                : "text-[#545454] dark:text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#383838] hover:text-[#252525] dark:hover:text-white"
                                                }`}
                                        >
                                            {opt.l}
                                            {filterRange === opt.v && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Task List - Scrollable */}
                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 ${displayTasks.length > 5 ? "pb-12" : "pb-5"} space-y-2
                    [&::-webkit-scrollbar]:w-[2px] 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-[#D1CEC8] dark:[&::-webkit-scrollbar-thumb]:bg-[#444]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    custom-scrollbar-alt
                `}>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-[44px] rounded-xl bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse w-full" />
                            ))}
                        </div>
                    ) : displayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 sm:py-8 animate-in fade-in duration-500 gap-3 text-center">
                            {filterRange === "today" ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-[#C2A27A]/10 dark:bg-[#C2A27A]/15 flex items-center justify-center">
                                        <PartyPopper className="w-5 h-5 text-[#C2A27A]" />
                                    </div>
                                    <p className="text-sm font-medium text-[#545454] dark:text-[#7D7D7D]">All caught up for today!</p>
                                </>
                            ) : filterRange === "overdue" ? (
                                <>
                                    <div className="w-10 h-10 rounded-full bg-[#C2A27A]/10 dark:bg-[#C2A27A]/15 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-[#C2A27A]" />
                                    </div>
                                    <p className="text-sm font-medium text-[#545454] dark:text-[#7D7D7D]">No overdue tasks! Great job!</p>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-[#545454] dark:text-[#7D7D7D]">No tasks found for this period.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in duration-500">
                            {displayTasks.slice(0, 15).map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    projects={projects}
                                    workspaces={workspaces}
                                    notes={notes}
                                    isDark={isDark}
                                    setSelectedTask={setSelectedTask}
                                    toggleTaskStatus={toggleTaskStatus}
                                    deleteTask={deleteTask}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Scroll Indicator */}
                {displayTasks.length > 5 && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-20">
                        <div className={`p-1 rounded-full ${isDark ? "bg-[#252525]/90 text-white" : "bg-white/80 text-[#252525]"} backdrop-blur-md shadow-lg border border-white/10 dark:border-white/5`}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                )}
            </div>

            {/* Shared Task Detail Modal */}
            <TaskDetailModal
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                projects={projects}
                notes={notes}
                workspaces={workspaces}
                onTaskUpdated={handleTaskUpdated}
            />
        </>
    );
}

interface TaskRowProps {
    task: Task;
    projects: any[];
    workspaces: any[];
    notes: any[];
    isDark: boolean;
    setSelectedTask: (task: Task) => void;
    toggleTaskStatus: (task: Task, e?: React.SyntheticEvent) => void;
    deleteTask: (taskId: string, e?: React.SyntheticEvent) => void;
}

function TaskRow({ task, projects, workspaces, notes, isDark, setSelectedTask, toggleTaskStatus, deleteTask }: TaskRowProps) {
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Find workspace name if task is linked to a note in a workspace
    const workspaceName = task.linked_document_id ? (() => {
        const n = notes.find((note: any) => note.id === task.linked_document_id);
        if (!n) return null;
        const ws = workspaces.find((w: any) => w.id === n.workspace_id);
        return ws ? ws.name : null;
    })() : null;

    return (
        <div className="relative rounded-xl overflow-hidden touch-pan-y group/item-container">
            {/* Background actions revealed by swipe */}
            <div className="absolute inset-0 flex items-center justify-between text-white font-medium text-xs">
                {/* Background for Complete (Swipe Right) */}
                <div className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 w-1/2 transition-opacity duration-200 ${swipeOffset > 20 ? "opacity-100 bg-[#C2A27A]" : "opacity-0 bg-[#C2A27A]/80"}`}>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                {/* Background for Delete (Swipe Left) */}
                <div className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 w-1/2 transition-opacity duration-200 ${swipeOffset < -20 ? "opacity-100 bg-red-500" : "opacity-0 bg-red-500/80"}`}>
                    <Trash2 className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Foreground Card */}
            <div
                className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer
                    ${swipeOffset === 0 ? "transition-transform duration-300 ease-out" : ""}
                    ${isDark
                        ? "bg-[#1E1E1E] text-white hover:bg-[#383838]"
                        : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                    }
                `}
                style={{ transform: `translateX(${swipeOffset}px)` }}
                onClick={() => {
                    if (swipeOffset === 0) setSelectedTask(task);
                }}
                onTouchStart={(e) => {
                    touchStartRef.current = {
                        x: e.touches[0].clientX,
                        y: e.touches[0].clientY,
                    };
                }}
                onTouchMove={(e) => {
                    if (!touchStartRef.current) return;
                    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
                    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

                    if (deltaY < 30) {
                        if (deltaX > 10) {
                            setSwipeOffset(Math.max(0, Math.min(100, deltaX)));
                        } else if (deltaX < -10) {
                            setSwipeOffset(Math.min(0, Math.max(-100, deltaX)));
                        }
                    }
                }}
                onTouchEnd={(e) => {
                    if (!touchStartRef.current) {
                        setSwipeOffset(0);
                        return;
                    }

                    if (swipeOffset > 60) {
                        toggleTaskStatus(task, e);
                    } else if (swipeOffset < -60) {
                        deleteTask(task.id, e);
                    }

                    setSwipeOffset(0);
                    touchStartRef.current = null;
                }}
            >
                <div className="flex items-center gap-3 overflow-hidden w-full">
                    <button
                        type="button"
                        onClick={(e) => toggleTaskStatus(task, e)}
                        className={`transition-colors flex-shrink-0 ${task.status === "done" ? "text-green-500" : "text-[#CFCFCF] dark:text-[#545454] hover:text-[#252525] dark:hover:text-[#CFCFCF]"}`}
                    >
                        {task.status === "done" ? (
                            <CheckCircle2 className="w-5 h-5" />
                        ) : (
                            <Circle className="w-5 h-5" />
                        )}
                    </button>
                    <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-medium truncate ${task.status === "done" ? "line-through opacity-50" : ""}`}>
                            {task.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            {workspaceName && (
                                <span className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md ${isDark ? "text-[#D4AF37] bg-white/5" : "text-[#C2A27A] bg-[#C2A27A]/10"}`}>
                                    {workspaceName}
                                </span>
                            )}
                            {task.project_id && projects.find((p: any) => p.id === task.project_id) && (
                                <span className="text-[10px] text-[#7D7D7D] truncate">
                                    {projects.find((p: any) => p.id === task.project_id)?.title}
                                </span>
                            )}
                            {task.linked_document_id && (() => {
                                const n = notes.find((note: any) => note.id === task.linked_document_id);
                                if (!n) return null;
                                const iconMatch = n.title.match(/^\[(\w+)\]/);
                                const cleanTitle = n.title.replace(/^\[\w+\]\s*/, "");
                                const IconComp = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : (n.file_url ? FileIcon : FileText);
                                return (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase truncate max-w-[120px]">
                                        · <IconComp className="w-2.5 h-2.5 opacity-60" />
                                        <span className="truncate">{cleanTitle}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Arrow indicator (optional, to match Suggestions) */}
                {/* Desktop hover actions (Arrow/Delete) */}
                <div className="hidden sm:flex items-center justify-center w-8 h-8 shrink-0">
                    <div className="group/action relative flex items-center justify-center w-full h-full">
                        <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover/item-container:hidden transition-all" />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTask(task.id, e);
                            }}
                            className="hidden group-hover/item-container:flex items-center justify-center p-1.5 rounded-lg text-[#7D7D7D] dark:text-[#BABABA] hover:bg-red-500 hover:text-white transition-all transform scale-90 hover:scale-100"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Mobile only arrow */}
                <ArrowRight className="sm:hidden w-3.5 h-3.5 shrink-0 opacity-40" />
            </div>
        </div>
    );
}

interface Task {
    id: string;
    title: string;
    status: string;
    due_date?: string | null;
    project_id?: string | null;
    linked_document_id?: string | null;
    [key: string]: unknown;
}
