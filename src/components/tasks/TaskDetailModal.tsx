import React, { useState, useEffect, useCallback } from "react";
import {
    X,
    FolderOpen,
    Sun,
    Calendar,
    Clock,
    FileText,
    AlignLeft,
    ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

interface TaskDetailModalProps {
    task: any | null;
    onClose: () => void;
    projects: any[];
    notes: any[];
    onTaskUpdated: (updatedTask?: any) => void;
}

export function TaskDetailModal({
    task,
    onClose,
    projects,
    notes,
    onTaskUpdated,
}: TaskDetailModalProps) {
    const [localTask, setLocalTask] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (task) {
            setLocalTask({ ...task });
        } else {
            setLocalTask(null);
        }
    }, [task]);



    const hasChanged = localTask && task && (
        localTask.title !== task.title ||
        localTask.description !== task.description ||
        localTask.status !== task.status ||
        localTask.project_id !== task.project_id ||
        localTask.due_date !== task.due_date ||
        localTask.linked_document_id !== task.linked_document_id
    );

    const handleSave = async () => {
        if (!hasChanged) return;
        try {
            setIsSaving(true);
            await fetch(`/api/tasks/${localTask.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: localTask.title,
                    description: localTask.description,
                    status: localTask.status,
                    project_id: localTask.project_id,
                    due_date: localTask.due_date,
                    linked_document_id: localTask.linked_document_id,
                    linked_document_type: localTask.linked_document_type,
                }),
            });
            onTaskUpdated(localTask); // refresh lists quietly in background and supply the optimistic update
            onClose(); // close the modal to see the task moved
        } catch (err) {
            console.error("Failed to update task", err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!task || !localTask) return null;

    const handleUpdateField = (field: string, value: any) => {
        setLocalTask((prev: any) => {
            const updated = { ...prev, [field]: value };

            // Auto assign linked_document_type if linked_document_id changes
            if (field === "linked_document_id" && value) {
                const note = notes.find((n) => n.id === value);
                updated.linked_document_type = note?.file_url ? "pdf" : "note";
            } else if (field === "linked_document_id" && !value) {
                updated.linked_document_type = null;
            }
            return updated;
        });
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col sm:justify-center sm:items-center bg-[#F5F3EF] dark:bg-[#1A1A1A] sm:bg-black/40 sm:dark:bg-black/40 sm:backdrop-blur-sm pt-[calc(env(safe-area-inset-top,0px)+28px)] sm:pt-0 sm:px-4 sm:py-6"
            onClick={onClose}
        >
            {/* Notion-style Page Container */}
            <div
                className="bg-[#F5F3EF] dark:bg-[#1A1A1A] sm:bg-[#F5F3EF] sm:dark:bg-[#1A1A1A] w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-xl overflow-y-auto flex flex-col shadow-none sm:shadow-2xl relative scrollbar-hide border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Control Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 pt-3 sm:pt-4 pb-3 sm:pb-4 bg-[#F5F3EF]/95 dark:bg-[#1A1A1A]/95 sm:bg-[#F5F3EF]/95 sm:dark:bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#E8E5E0] sm:border-[#E8E5E0] dark:border-[#3A3A3A]">
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

                <div className="px-4 sm:px-10 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 flex-1 w-full">
                    {/* Title Area */}
                    <input
                        type="text"
                        value={localTask.title}
                        onChange={(e) => handleUpdateField("title", e.target.value)}
                        placeholder="Untitled Task"
                        className="w-full text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 mb-6"
                    />

                    {/* Properties Grid */}
                    <div className="space-y-3 mb-6">
                        {/* Project */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <FolderOpen className="w-4 h-4 text-gray-400" />
                                <span>Project</span>
                            </div>
                            <div className="col-span-2">
                                <select
                                    value={localTask.project_id || ""}
                                    onChange={(e) => handleUpdateField("project_id", e.target.value || null)}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors w-full cursor-pointer"
                                >
                                    <option value="">Empty</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Sun className="w-4 h-4 text-gray-400" />
                                <span>Status</span>
                            </div>
                            <div className="col-span-2 flex items-center">
                                <select
                                    value={localTask.status}
                                    onChange={(e) => handleUpdateField("status", e.target.value)}
                                    className={`text-sm font-medium outline-none p-1 -ml-1 rounded transition-colors w-fit cursor-pointer appearance-none ${localTask.status === "in_progress"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                        : localTask.status === "done"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                            : localTask.status === "in_review"
                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                                : localTask.status === "archived"
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

                        {/* Due Date */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>By Day</span>
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="date"
                                    value={localTask.due_date ? new Date(localTask.due_date).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                        const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                        handleUpdateField("due_date", dateVal);
                                    }}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors"
                                />
                            </div>
                        </div>

                        {/* Created Timestamp (Read Only) */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>Created</span>
                            </div>
                            <div className="col-span-2 text-sm text-gray-700 dark:text-gray-300 p-1 -ml-1">
                                {localTask.created_at ? format(new Date(localTask.created_at), "MMMM d, yyyy h:mm a") : "Just now"}
                            </div>
                        </div>

                        {/* Note/PDF Link */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span>Study Material</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <select
                                    value={localTask.linked_document_id || ""}
                                    onChange={(e) => handleUpdateField("linked_document_id", e.target.value || null)}
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors w-full cursor-pointer"
                                >
                                    <option value="">Empty</option>
                                    {notes.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {n.title} ({n.file_url ? 'PDF' : 'Note'})
                                        </option>
                                    ))}
                                </select>
                                {localTask.linked_document_id && (
                                    <Link
                                        href={`/library/${localTask.linked_document_type}/${localTask.linked_document_id}`}
                                        target="_blank"
                                        className="text-xs shrink-0 bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
                                    >
                                        Open
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-800 mb-8" />

                    {/* Description Section */}
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-bold mb-3">
                            <AlignLeft className="w-4 h-4" />
                            Comments / Description
                        </div>
                        <textarea
                            ref={(el) => {
                                if (el) {
                                    el.style.height = "auto";
                                    el.style.height = `${el.scrollHeight}px`;
                                }
                            }}
                            value={localTask.description || ""}
                            onChange={(e) => {
                                handleUpdateField("description", e.target.value);
                                e.target.style.height = "auto";
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            placeholder="Add your notes, action items, or comments here..."
                            rows={6}
                            className="w-full min-h-[140px] bg-transparent text-sm text-gray-800 dark:text-gray-200 outline-none resize-none placeholder-gray-400 leading-relaxed overflow-hidden transition-all duration-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
