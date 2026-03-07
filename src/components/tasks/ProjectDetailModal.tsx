import React, { useState, useEffect, useRef } from "react";
import {
    X,
    FolderOpen,
    Sun,
    Calendar,
    Clock,
    AlignLeft,
    Plus,
    FileText,
    ArrowLeft,
    MoreHorizontal,
    Pin,
    Star,
    Trash2,
    MoveRight,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { TaskDetailModal } from "./TaskDetailModal";

interface ProjectDetailModalProps {
    project: any | null;
    onClose: () => void;
    tasks: any[];
    onProjectUpdated: (updatedProject?: any) => void;
    onTaskUpdated: () => void;
    notes: any[];
    breadcrumb?: string;
    selectedTask: any | null;       // lifted from parent
    onSelectTask: (t: any | null) => void; // lifted from parent
}

export function ProjectDetailModal({
    project,
    onClose,
    tasks,
    onProjectUpdated,
    onTaskUpdated,
    notes,
    breadcrumb = "Projects",
    selectedTask,
    onSelectTask,
}: ProjectDetailModalProps) {
    const [localProject, setLocalProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.context-menu') && !target.closest('.context-menu-button')) {
                setOpenMenuId(null);
                setMoveMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);


    useEffect(() => {
        if (project) {
            setLocalProject({ ...project });
        } else {
            setLocalProject(null);
        }
    }, [project]);

    const hasChanged = localProject && project && (
        localProject.title !== project.title ||
        localProject.description !== project.description ||
        localProject.status !== project.status ||
        localProject.start_date !== project.start_date ||
        localProject.due_date !== project.due_date ||
        localProject.color_theme !== project.color_theme
    );

    const handleSave = async () => {
        if (!hasChanged) return;
        try {
            setIsSaving(true);
            await fetch(`/api/projects/${localProject.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: localProject.title,
                    description: localProject.description,
                    status: localProject.status,
                    start_date: localProject.start_date,
                    due_date: localProject.due_date,
                    color_theme: localProject.color_theme
                }),
            });
            onProjectUpdated(localProject);
            onClose();
        } catch (err) {
            console.error("Failed to update project", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!project || !localProject) return null;

    const handleUpdateField = (field: string, value: any) => {
        setLocalProject((prev: any) => ({ ...prev, [field]: value }));
    };

    const projectTasks = tasks.filter(t => t.project_id === project.id && (!showFavorites || t.is_favorite));

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        // Optimistic UI for drag n drop locally inside project
        const taskToUpdate = projectTasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;

        try {
            // Trigger root sync
            await fetch(`/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            onTaskUpdated();
        } catch (e) {
            console.error("Failed to update status");
        }
    };

    const handleQuickCreateTask = async (status: string) => {
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Untitled Task",
                    status,
                    project_id: project.id // Attach to this project
                }),
            });

            if (res.ok) {
                const { task } = await res.json();
                onTaskUpdated();
                onSelectTask(task); // Open it immediately
            }
        } catch (e) {
            console.error("Failed to create task", e);
        }
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDrop = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) {
            updateTaskStatus(taskId, status);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDeleteTask = async (taskId: string) => {
        setOpenMenuId(null);
        try {
            await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            onTaskUpdated();
        } catch (e) {
            console.error("Failed to delete task", e);
        }
    };

    const handleToggleTaskPin = async (task: any) => {
        setOpenMenuId(null);
        await fetch(`/api/tasks/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_pinned: !task.is_pinned }),
        });
        onTaskUpdated();
    };

    const handleToggleTaskFavorite = async (task: any) => {
        setOpenMenuId(null);
        await fetch(`/api/tasks/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_favorite: !task.is_favorite }),
        });
        onTaskUpdated();
    };

    const handleMoveTaskStatus = async (taskId: string, newStatus: string) => {
        setOpenMenuId(null);
        setMoveMenuId(null);
        await updateTaskStatus(taskId, newStatus);
    };

    if (selectedTask) {
        return (
            <TaskDetailModal
                task={selectedTask}
                onClose={() => onSelectTask(null)}
                projects={[]}
                notes={notes}
                onTaskUpdated={() => { onTaskUpdated(); }}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col sm:justify-center sm:items-center bg-[#F5F3EF] dark:bg-[#1A1A1A] sm:bg-black/40 sm:dark:bg-black/40 sm:backdrop-blur-sm pt-[calc(env(safe-area-inset-top,0px)+28px)] sm:pt-0 sm:px-4 sm:py-6"
            onClick={onClose}
        >
            <div
                className="bg-[#F5F3EF] dark:bg-[#1A1A1A] sm:bg-[#F5F3EF] sm:dark:bg-[#1A1A1A] w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-xl overflow-y-auto flex flex-col shadow-none sm:shadow-2xl relative custom-scrollbar border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Control Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-4 bg-[#F5F3EF]/95 dark:bg-[#1A1A1A]/95 sm:bg-[#F5F3EF]/95 sm:dark:bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#E8E5E0] sm:border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3A3A3A] transition-colors"
                            title={`Back to ${breadcrumb}`}
                        >
                            <ArrowLeft size={16} />
                        </button>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                            <span
                                onClick={onClose}
                                className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                {breadcrumb}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">›</span>
                            <span className="text-gray-700 dark:text-gray-200 truncate max-w-[180px]">
                                {localProject?.title || "Project"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {hasChanged && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3A3A3A] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="px-4 sm:px-10 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 flex-1 w-full">
                    {/* Title Area */}
                    <input
                        type="text"
                        value={localProject.title}
                        onChange={(e) => handleUpdateField("title", e.target.value)}
                        placeholder="Untitled Project"
                        className="w-full text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 mb-6"
                    />

                    {/* Properties Grid */}
                    <div className="space-y-3 mb-6 max-w-2xl">
                        {/* Status */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Sun className="w-4 h-4 text-gray-400" />
                                <span>Status</span>
                            </div>
                            <div className="col-span-2 flex items-center">
                                <select
                                    value={localProject.status || "not_started"}
                                    onChange={(e) => handleUpdateField("status", e.target.value)}
                                    className={`text-sm font-medium outline-none p-1 -ml-1 rounded transition-colors w-fit cursor-pointer appearance-none ${localProject.status === "in_progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : localProject.status === "done"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            : localProject.status === "in_review"
                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                : localProject.status === "archived"
                                                    ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                        }`}
                                >
                                    <option value="not_started">Not started</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="in_review">In review</option>
                                    <option value="done">Done</option>
                                    <option value="archived">Archive</option>
                                </select>
                            </div>
                        </div>

                        {/* Timing */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Timing</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2 flex-wrap">
                                <input
                                    type="date"
                                    value={localProject.start_date ? new Date(localProject.start_date).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                        const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                        handleUpdateField("start_date", dateVal);
                                    }}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors"
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                    type="date"
                                    value={localProject.due_date ? new Date(localProject.due_date).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                        const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                        handleUpdateField("due_date", dateVal);
                                    }}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors"
                                />
                            </div>
                        </div>

                        {/* Stats - Tasks Left */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span>Task left</span>
                            </div>
                            <div className="col-span-2 text-sm text-gray-800 dark:text-gray-200 p-1 -ml-1 font-medium">
                                {projectTasks.filter(t => t.status !== "done" && t.status !== "archived").length} / {projectTasks.length} Tasks left
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="pt-2">
                            <textarea
                                value={localProject.description || ""}
                                onChange={(e) => handleUpdateField("description", e.target.value)}
                                placeholder="Add project description..."
                                className="w-full min-h-[60px] bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none resize-y placeholder-gray-400 leading-relaxed"
                            />
                        </div>
                    </div>

                    <hr className="border-[#E8E5E0] dark:border-[#3A3A3A] mb-6" />

                    {/* Embedded Kanban Board */}
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 border-b-[3px] border-black dark:border-white pb-1 inline-block">Tasks</h2>
                        {/* Favorites Filter */}
                        <button
                            type="button"
                            onClick={() => setShowFavorites((v) => !v)}
                            title={showFavorites ? "Showing favorites only" : "Show favorites only"}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all active:scale-95 ${showFavorites
                                ? "bg-[#252525] dark:bg-white border-[#252525] dark:border-white text-white dark:text-[#252525] shadow-sm"
                                : "bg-white/80 backdrop-blur-md dark:bg-[#252525] border-[#E8E5E0] dark:border-[#545454] text-[#7D7D7D] dark:text-[#7D7D7D] hover:border-[#252525] dark:hover:border-white hover:text-[#252525] dark:hover:text-white"
                                }`}
                        >
                            <Star size={14} className={showFavorites ? "fill-current" : ""} />
                        </button>
                    </div>

                    <div className="bg-[#F5F3EF] dark:bg-[#1A1A1A] min-h-[300px] overflow-x-auto pb-4 scrollbar-hide">
                        <div className="flex gap-4 min-w-max px-1">
                            {/* Kanban Columns */}
                            {[
                                "not_started",
                                "in_progress",
                                "in_review",
                                "done",
                                "archived",
                            ].map((status) => (
                                <div
                                    key={status}
                                    className="flex flex-col gap-2 min-h-[120px] w-[260px] bg-[#f0ede8] dark:bg-white/5 rounded-xl p-2 border border-transparent hover:border-[#D1D1D1] dark:hover:border-[#444] transition-all hover:bg-[#E8E5E0]/50 dark:hover:bg-white/10"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status)}
                                >
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-white capitalize flex items-center justify-between mb-1 px-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-2 h-2 rounded-full ${status === "done"
                                                    ? "bg-green-500"
                                                    : status === "in_progress"
                                                        ? "bg-blue-500"
                                                        : status === "in_review"
                                                            ? "bg-purple-500"
                                                            : status === "archived"
                                                                ? "bg-gray-400"
                                                                : "bg-orange-500"
                                                    }`}
                                            ></span>
                                            {status.replace("_", " ")}
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {
                                                projectTasks.filter((t) => t.status === status)
                                                    .length
                                            }
                                        </span>
                                    </h3>
                                    {projectTasks
                                        .filter((t) => t.status === status)
                                        .sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
                                        .map((t) => (
                                            <div
                                                key={t.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, t.id)}
                                                className="relative p-3 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-gray-200 dark:border-[#7D7D7D]/30 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#D1D1D1] dark:hover:border-[#444] hover:bg-[#F9F8F6] dark:hover:bg-[#1A1A1A] transition-all group/card"
                                            >
                                                {/* Dropdown */}
                                                {openMenuId === t.id && (
                                                    <div className="absolute top-8 right-1 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[180px] context-menu" onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => handleToggleTaskPin(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                                            <Pin className="w-4 h-4" />
                                                            {t.is_pinned ? "Unpin" : "Pin"}
                                                        </button>
                                                        <button onClick={() => handleToggleTaskFavorite(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
                                                            <Star className="w-4 h-4" />
                                                            {t.is_favorite ? "Unfavorite" : "Favorite"}
                                                        </button>
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setMoveMenuId(moveMenuId === t.id ? null : t.id)}
                                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"
                                                            >
                                                                <MoveRight className="w-4 h-4" />
                                                                Move to
                                                                <span className="ml-auto text-gray-400">›</span>
                                                            </button>
                                                            {moveMenuId === t.id && (
                                                                <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[150px]">
                                                                    {["not_started", "in_progress", "in_review", "done", "archived"].filter(s => s !== status).map(s => (
                                                                        <button
                                                                            key={s}
                                                                            onClick={() => handleMoveTaskStatus(t.id, s)}
                                                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors capitalize"
                                                                        >
                                                                            {s.replace("_", " ")}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="border-t border-gray-100 dark:border-[#444] my-1" />
                                                        <button onClick={() => handleDeleteTask(t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Title row: pin/star + title + 3-dot */}
                                                <div onClick={() => onSelectTask(t)} className="cursor-pointer">
                                                    <div className="flex items-center gap-1.5">
                                                        {t.is_pinned && <Pin className="w-3 h-3 text-[#545454] dark:text-white flex-shrink-0" />}
                                                        {t.is_favorite && <Star className="w-3 h-3 text-[#545454] dark:text-white fill-current flex-shrink-0" />}
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">
                                                            {t.title}
                                                        </p>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); setMoveMenuId(null); }}
                                                            className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#444] sm:opacity-0 sm:group-hover/card:opacity-100 opacity-100 transition-all flex-shrink-0 context-menu-button"
                                                        >
                                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {t.due_date && (
                                                        <p className="text-xs text-gray-400 font-medium mt-2">
                                                            Due {format(new Date(t.due_date), "MMM d")}
                                                        </p>
                                                    )}
                                                    {t.linked_document_id && (
                                                        <span className="mt-3 flex items-center gap-1 w-fit px-2 py-1 bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300 rounded-md text-[10px] font-semibold">
                                                            <FileText className="w-3 h-3" />
                                                            {t.linked_document_type === "pdf" ? "PDF Linked" : "Note Linked"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                    {/* Inline New Page Button */}
                                    <button
                                        onClick={() => handleQuickCreateTask(status)}
                                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg transition-colors mt-1 w-full text-left"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New page
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
