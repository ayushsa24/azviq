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
    onTaskUpdated: () => void; // Trigger root refetch
    notes: any[];
}

export function ProjectDetailModal({
    project,
    onClose,
    tasks,
    onProjectUpdated,
    onTaskUpdated,
    notes,
}: ProjectDetailModalProps) {
    const [localProject, setLocalProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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

    const projectTasks = tasks.filter(t => t.project_id === project.id);

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
                onTaskUpdated(); // trigger root refresh to get the new task
                setSelectedTask(task); // Open it immediately
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
                onClose={() => setSelectedTask(null)}
                projects={[]} // Passed as empty as we are already within a project context
                notes={notes}
                onTaskUpdated={() => {
                    onTaskUpdated();
                }}
            />
        );
    }

    return (
        <div
            className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] md:top-16 bottom-0 left-0 right-0 z-40 flex justify-center sm:items-center bg-black/40 backdrop-blur-sm sm:px-4 sm:py-6"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1A1A1A] w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-xl overflow-y-auto flex flex-col shadow-2xl relative custom-scrollbar border border-transparent dark:border-[#545454]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Control Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-md border-b border-gray-100 dark:border-[#3A3A3A]">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3A3A3A] transition-colors"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="text-xs text-gray-400 font-medium ml-1">
                            {hasChanged ? "Unsaved changes" : "All changes saved"}
                        </span>
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

                <div className="px-6 sm:px-10 py-6 flex-1 w-full">
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

                    <hr className="border-gray-200 dark:border-[#3A3A3A] mb-6" />

                    {/* Embedded Kanban Board */}
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 border-b-[3px] border-black pb-1 inline-block">Tasks</h2>
                    </div>

                    <div className="bg-white dark:bg-[#1A1A1A] min-h-[300px] overflow-x-auto pb-4 scrollbar-hide" ref={menuRef}>
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
                                    className="flex flex-col gap-2 min-h-[120px] w-[260px] bg-[#f7f5f2] dark:bg-[#252525] rounded-[16px] p-2 border border-transparent transition-colors"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status)}
                                >
                                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 capitalize flex items-center justify-between mb-1 px-2">
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
                                                className="relative p-3 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-gray-100 dark:border-[#3A3A3A] group/card"
                                            >
                                                {/* Dropdown */}
                                                {openMenuId === t.id && (
                                                    <div className="absolute top-8 right-1 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
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
                                                <div onClick={() => setSelectedTask(t)} className="cursor-pointer">
                                                    <div className="flex items-center gap-1.5">
                                                        {t.is_pinned && <Pin className="w-3 h-3 text-[#C2A27A] flex-shrink-0" />}
                                                        {t.is_favorite && <Star className="w-3 h-3 text-[#C2A27A] fill-[#C2A27A] flex-shrink-0" />}
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate">
                                                            {t.title}
                                                        </p>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); setMoveMenuId(null); }}
                                                            className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#444] opacity-0 group-hover/card:opacity-100 transition-all flex-shrink-0"
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
