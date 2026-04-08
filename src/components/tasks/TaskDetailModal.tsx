import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    X,
    FolderOpen,
    Sun,
    Calendar,
    Clock,
    FileText,
    AlignLeft,
    ArrowLeft,
    Check,
    ChevronDown,
    Search
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { motion, useDragControls } from "framer-motion";

interface TaskDetailModalProps {
    task: any | null;
    onClose: () => void;
    projects: any[];
    notes: any[];
    workspaces: any[];
    onTaskUpdated: (updatedTask?: any) => void;
}

export function TaskDetailModal({
    task,
    onClose,
    projects,
    notes,
    workspaces,
    onTaskUpdated,
}: TaskDetailModalProps) {
    const [localTask, setLocalTask] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
    const [materialSearchQuery, setMaterialSearchQuery] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const materialDropdownRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (task) {
            document.body.style.overflow = "hidden";
            setLocalTask({ ...task });
        } else {
            document.body.style.overflow = "";
            setLocalTask(null);
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [task]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
                setIsMaterialDropdownOpen(false);
            }
        };

        if (isMaterialDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMaterialDropdownOpen]);

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
            onTaskUpdated(localTask); 
            onClose(); 
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
        <div className="fixed inset-0 z-[300] flex flex-col sm:justify-center sm:items-center">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 sm:backdrop-blur-sm pointer-events-none sm:pointer-events-auto"
                style={{ WebkitTapHighlightColor: "transparent" }}
            />

            {/* Sheet/Modal Container */}
            <motion.div
                initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
                drag={isMobile ? "y" : false}
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 500) {
                        onClose();
                    }
                }}
                className={`bg-[#F5F3EF] dark:bg-[#1A1A1A] w-full ${isMobile ? 'h-[95vh]' : 'h-auto max-h-[90vh]'} sm:max-w-3xl rounded-t-[20px] sm:rounded-xl shadow-2xl relative border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454] mt-auto sm:mt-0 z-10 overflow-hidden flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile Drag Handle */}
                <div className="sm:hidden w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
                </div>

                {/* Top Control Bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 pt-1 sm:pt-4 pb-3 sm:pb-4 bg-[#F5F3EF]/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                    <div className="flex items-center gap-2 min-w-0 pr-4">
                        <span className="text-xs font-bold text-[#252525] dark:text-gray-200 truncate max-w-[200px] sm:max-w-[400px]">
                            {localTask.title || "Untitled Task"}
                        </span>
                        {hasChanged && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
                                Unsaved
                            </span>
                        )}
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

                <div 
                    ref={scrollContainerRef} 
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                    onPointerDown={(e) => {
                        if (isMobile && scrollTop <= 0) {
                            dragControls.start(e);
                        }
                    }}
                    className="px-4 sm:px-10 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 flex-1 w-full overflow-y-auto overscroll-behavior-contain custom-scrollbar">
                    {/* Title Area */}
                    <input
                        type="text"
                        value={localTask.title || ""}
                        onChange={(e) => handleUpdateField("title", e.target.value)}
                        placeholder="Untitled Task"
                        className="w-full text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 mb-6"
                    />

                    {/* Properties Grid */}
                    <div className="space-y-3 mb-8 max-w-2xl">
                        {/* Status */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Sun className="w-4 h-4 text-gray-400" />
                                <span>Status</span>
                            </div>
                            <div className="col-span-2 flex items-center">
                                <select
                                    value={localTask.status || "not_started"}
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
                                    className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-1 -ml-1 rounded transition-colors w-full cursor-pointer appearance-none"
                                >
                                    <option value="">No Project</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>Due Date</span>
                            </div>
                            <div className="col-span-2 relative flex items-center">
                                <input
                                    type="date"
                                    value={localTask.due_date ? new Date(localTask.due_date).toISOString().split('T')[0] : ""}
                                    onChange={(e) => {
                                        const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                        handleUpdateField("due_date", dateVal);
                                    }}
                                    className={`bg-transparent text-sm font-medium outline-none p-1 -ml-1 rounded transition-colors w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${!localTask.due_date ? "text-transparent" : "text-gray-700 dark:text-gray-300"}`}
                                />
                                {!localTask.due_date && (
                                    <span className="absolute left-0 text-sm font-medium text-gray-400 dark:text-gray-500 pointer-events-none">
                                        dd-mm-yyyy
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Material (Notes/PDFs) */}
                        <div className="grid grid-cols-3 items-center gap-4 group">
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-medium col-span-1">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span>Material</span>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <div ref={materialDropdownRef} className="relative flex-1 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsMaterialDropdownOpen(!isMaterialDropdownOpen)}
                                        className="flex items-center justify-between bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-100 dark:hover:bg-[#252525] p-2 rounded-lg transition-colors w-full cursor-pointer border border-[#E8E5E0] dark:border-[#545454] min-w-0"
                                    >
                                        <span className="truncate flex-1 text-left">
                                            {localTask.linked_document_id ? (() => {
                                                const n = notes.find(note => note.id === localTask.linked_document_id);
                                                if (!n) return "Empty";
                                                const ws = workspaces?.find((w) => w.id === n.workspace_id);
                                                return `${ws ? `[${ws.name}] ` : ""}${n.title} (${n.file_url ? 'PDF' : 'Note'})`;
                                            })() : "Empty"}
                                        </span>
                                        <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
                                    </button>

                                    {isMaterialDropdownOpen && (
                                        <div className="absolute top-11 right-0 sm:left-0 sm:right-auto w-full sm:w-[350px] bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-lg shadow-xl z-50 flex flex-col max-h-[250px] overflow-hidden">
                                            <div className="p-2 border-b border-[#E8E5E0] dark:border-[#444] bg-gray-50 dark:bg-[#1A1A1A]">
                                                <div className="relative">
                                                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="Search material..."
                                                        value={materialSearchQuery}
                                                        onChange={(e) => setMaterialSearchQuery(e.target.value)}
                                                        className="w-full bg-white dark:bg-[#2A2A2A] border border-[#E8E5E0] dark:border-[#444] focus:border-gray-400 dark:focus:border-[#666] rounded-md text-sm py-1.5 pl-8 pr-3 outline-none transition-colors text-black dark:text-white"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleUpdateField("linked_document_id", null);
                                                        setIsMaterialDropdownOpen(false);
                                                        setMaterialSearchQuery("");
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between mb-1 ${!localTask.linked_document_id ? "bg-gray-100 dark:bg-[#333] text-black dark:text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3A3A3A]"}`}
                                                >
                                                    Empty
                                                    {!localTask.linked_document_id && <Check className="w-4 h-4" />}
                                                </button>
                                                
                                                {notes.filter(n => n.title.toLowerCase().includes(materialSearchQuery.toLowerCase())).map((n) => {
                                                    const ws = workspaces?.find((w) => w.id === n.workspace_id);
                                                    const wsPrefix = ws ? `[${ws.name}] ` : "";
                                                    const isSelected = localTask.linked_document_id === n.id;
                                                    return (
                                                        <button
                                                            key={n.id}
                                                            type="button"
                                                            onClick={() => {
                                                                handleUpdateField("linked_document_id", n.id);
                                                                setIsMaterialDropdownOpen(false);
                                                                setMaterialSearchQuery("");
                                                            }}
                                                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between mt-0.5 ${isSelected ? "bg-gray-100 dark:bg-[#333] text-black dark:text-white font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#3A3A3A]"}`}
                                                        >
                                                            <div className="flex flex-col min-w-0 pr-2">
                                                                <span className="truncate">
                                                                    {n.title}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 truncate mt-0.5 flex gap-1">
                                                                    {wsPrefix && <span className="font-medium text-gray-400">{wsPrefix}</span>}
                                                                    <span>{n.file_url ? 'PDF Document' : 'Note'}</span>
                                                                </span>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-300" />}
                                                        </button>
                                                    )
                                                })}
                                                {notes.filter(n => n.title.toLowerCase().includes(materialSearchQuery.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-6 text-center text-sm text-gray-500">
                                                        No material found
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
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
            </motion.div>
        </div>
    );
}
