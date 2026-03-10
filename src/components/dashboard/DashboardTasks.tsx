"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Circle, Trash2, CalendarDays, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";

export default function DashboardTasks() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Selected task state for the detail modal
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [filterRange, setFilterRange] = useState<"today" | "1week" | "2weeks" | "1month">("today");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [tasksRes, projectsRes] = await Promise.all([
                fetch("/api/tasks", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
                fetch("/api/projects", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
            ]);

            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                setTasks(tasksData.tasks || []);
            }
            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData.projects || []);
            }
        } catch (error) {
            console.error("Failed to load tasks and projects");
        } finally {
            setIsLoading(false);
        }
    };

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
                setTasks((prev) => [task, ...prev]);
                setNewTaskTitle("");
                window.dispatchEvent(new Event("task-updated"));
            }
        } catch (err) {
            console.error("Failed to create task", err);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleTaskStatus = async (task: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus = task.status === "done" ? "not_started" : "done";

        // Optimistic update
        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
        );

        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            window.dispatchEvent(new Event("task-updated"));
        } catch (err) {
            console.error("Failed to update status");
            fetchData(); // revert
        }
    };

    const deleteTask = async (taskId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        // Optimistic update
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        try {
            await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            window.dispatchEvent(new Event("task-updated"));
        } catch (err) {
            console.error("Failed to delete task");
            fetchData(); // revert
        }
    };

    const handleTaskUpdated = (updatedTask?: any) => {
        if (updatedTask) {
            setTasks((prev) =>
                prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            );
        }
        fetchData(); // Re-sync in background to be safe
        window.dispatchEvent(new Event("task-updated"));
    };

    // Filter for tasks based on range
    const displayTasks = tasks.filter(t => {
        if (t.status === "done" || t.status === "archived") return false;
        if (!t.due_date) return false;

        const dueDate = new Date(t.due_date);
        const today = new Date();
        const maxDate = new Date();

        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        if (filterRange === "today") {
            return dueDate.getTime() <= today.getTime();
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
    }).slice(0, 8);

    const getTitle = () => {
        switch (filterRange) {
            case "today": return "Today's Tasks";
            case "1week": return "This Week's Tasks";
            case "2weeks": return "Next 2 Weeks' Tasks";
            case "1month": return "This Month's Tasks";
            default: return "Tasks";
        }
    };

    return (
        <>
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm transition-all duration-200 sm:h-full flex flex-col group/card ${isDark
                ? "hover:bg-white/10 hover:border-[#444]"
                : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"
                } shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md`}>
                <div className="flex items-center justify-between mb-4 gap-2">
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
                            <option value="1week">1 Week</option>
                            <option value="2weeks">2 Weeks</option>
                            <option value="1month">1 Month</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7D7D7D] pointer-events-none" />
                    </div>
                </div>

                {/* Task List */}
                <div className="sm:flex-1 overflow-y-auto space-y-2 sm:min-h-[120px] pr-0.5">
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
                        <div className="text-center py-4 px-4">
                            <p className="text-sm text-[#545454] dark:text-[#7D7D7D]">
                                {filterRange === "today" ? "All caught up for today! 🎉" : "No tasks found for this period."}
                            </p>
                        </div>
                    ) : (
                        displayTasks.map((task) => (
                            <div
                                key={task.id}
                                onClick={() => setSelectedTask(task)}
                                className="group flex items-center justify-between px-3 py-2.5 bg-white/80 backdrop-blur-md dark:bg-white/5 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 rounded-xl hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] transition-all cursor-pointer shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={(e) => toggleTaskStatus(task, e)}
                                        className="text-[#CFCFCF] dark:text-[#545454] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors flex-shrink-0"
                                    >
                                        {task.status === "done" ? (
                                            <CheckCircle2 className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" />
                                        ) : (
                                            <Circle className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-medium truncate ${task.status === "done" ? "text-gray-400 line-through" : "text-[#252525] dark:text-[#CFCFCF]"}`}>
                                            {task.title}
                                        </span>
                                        {task.project_id && projects.find(p => p.id === task.project_id) && (
                                            <span className="text-[10px] text-[#7D7D7D] truncate">
                                                {projects.find(p => p.id === task.project_id)?.title}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete button appears on hover (always on mobile) */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to delete this task?")) {
                                            deleteTask(task.id, e);
                                        }
                                    }}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] hover:bg-[#F0EDE8] dark:hover:bg-[#333] rounded-lg transition-all flex-shrink-0"
                                    title="Delete task"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

            </div>

            {/* Shared Task Detail Modal (re-used from tasks page) */}
            <TaskDetailModal
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                projects={projects}
                notes={[]} // Empty array since we aren't fetching notes in dashboard view
                onTaskUpdated={handleTaskUpdated}
            // Instead of onDelete, the UI in DashboardTasks handles deletion before even opening the modal.
            />
        </>
    );
}
