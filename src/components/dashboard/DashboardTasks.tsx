"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, CheckCircle2, Circle, Trash2, CalendarDays, ChevronDown, ArrowRight } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import useSWR from "swr";

export default function DashboardTasks() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Selected task state for the detail modal
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filterRange, setFilterRange] = useState<"today" | "overdue" | "1week" | "2weeks" | "1month">("today");

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
        // Optimistic update
        mutateTasks((currentData: { tasks: Task[] } | undefined) => ({
            ...currentData,
            tasks: (currentData?.tasks || []).filter((t: Task) => t.id !== taskId)
        }) as { tasks: Task[] }, false);
        try {
            await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            window.dispatchEvent(new Event("task-updated"));
        } catch (err) {
            console.error("Failed to delete task");
            mutateTasks(); // revert
        }
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
                ${displayTasks.length > 5 ? "min-h-[220px] max-h-[365px]" : "h-auto"}
                ${isDark ? "hover:bg-white/10 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"}
                shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
            `}>
                {/* Header - Fixed */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-2 border-b border-[#E8E5E0] dark:border-[#383838]">
                    <div className="flex items-center gap-2 min-w-0">
                        <CalendarDays className="w-5 h-5 text-[#252525] dark:text-white shrink-0" />
                        <h2 className="text-lg font-bold text-[#252525] dark:text-white truncate">
                            {getTitle()}
                        </h2>
                    </div>

                    <div className="relative shrink-0">
                        <select
                            value={filterRange}
                            onChange={(e) => setFilterRange(e.target.value as any)}
                            className="appearance-none bg-[#F0EDE8] dark:bg-[#383838] hover:bg-[#E8E5E0] dark:hover:bg-[#444] text-xs font-semibold text-[#252525] dark:text-[#CFCFCF] pl-3 pr-7 py-1.5 rounded-full border-none focus:ring-1 focus:ring-[#C2A27A]/30 cursor-pointer transition-colors outline-none shadow-sm"
                        >
                            <option value="today">Today</option>
                            <option value="overdue">Overdue</option>
                            <option value="1week">1 Week</option>
                            <option value="2weeks">2 Weeks</option>
                            <option value="1month">1 Month</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7D7D7D] pointer-events-none" />
                    </div>
                </div>

                {/* Task List - Scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-12 space-y-2
                    [&::-webkit-scrollbar]:w-[2px] 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-[#D1CEC8] dark:[&::-webkit-scrollbar-thumb]:bg-[#444]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    custom-scrollbar-alt
                ">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#3C3C3C] bg-white/80 backdrop-blur-md dark:bg-[#252525] animate-pulse">
                                <div className="w-4 h-4 rounded-full bg-[#E8E5E0] dark:bg-[#383838] flex-shrink-0" />
                                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                                    <div className={`h-3 rounded-full bg-[#E8E5E0] dark:bg-[#383838] ${i % 2 === 0 ? "w-1/2" : "w-2/3"}`} />
                                    <div className="h-2 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] w-1/4" />
                                </div>
                                <div className="w-5 h-5 rounded bg-[#F0EDE8] dark:bg-[#2C2C2C] flex-shrink-0" />
                            </div>
                        ))
                    ) : displayTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-[#545454] dark:text-[#7D7D7D]">
                                {filterRange === "today" ? "All caught up for today! 🎉" :
                                 filterRange === "overdue" ? "No overdue tasks! Great job! 🙌" : 
                                 "No tasks found for this period."}
                            </p>
                        </div>
                    ) : (
                        displayTasks.slice(0, 15).map((task) => (
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
                        ))
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
            <div className="absolute inset-0 flex items-center justify-start text-white font-medium text-xs">
                {/* Background for Complete (Swipe Right) */}
                <div className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 w-full transition-opacity duration-200 ${swipeOffset > 20 ? "opacity-100 bg-[#C2A27A]" : "opacity-0 bg-[#C2A27A]/80"}`}>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Foreground Card */}
            <div
                className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer
                    ${swipeOffset === 0 ? "transition-transform duration-300 ease-out" : ""}
                    ${isDark
                        ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
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

                    if (deltaY < 30 && deltaX > 10) {
                        setSwipeOffset(Math.max(0, Math.min(100, deltaX)));
                    }
                }}
                onTouchEnd={(e) => {
                    if (!touchStartRef.current) {
                        setSwipeOffset(0);
                        return;
                    }

                    if (swipeOffset > 60) {
                        toggleTaskStatus(task, e);
                        setSwipeOffset(0);
                    } else {
                        setSwipeOffset(0);
                    }
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
                        <div className="flex items-center gap-2 mt-0.5">
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
                        </div>
                    </div>
                </div>

                {/* Arrow indicator (optional, to match Suggestions) */}
                <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/item-container:opacity-100" />
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
