import React, { useState, useEffect, useRef } from "react";
import {
    X,
    FolderOpen,
    Sun,
    Calendar,
    AlignLeft,
    Plus,
    FileText,
    MoreHorizontal,
    Pin,
    Star,
    Trash2,
    MoveRight,
    ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { TaskDetailModal } from "./TaskDetailModal";

interface ProjectDetailModalProps {
    project: any | null;
    onClose: () => void;
    tasks: any[];
    onProjectUpdated: (updatedProject?: any) => void;
    onTaskUpdated: () => void;
    notes: any[];
    breadcrumb?: string;
    selectedTask: any | null;       
    onSelectTask: (t: any | null) => void; 
    workspaces: any[];
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
    workspaces,
}: ProjectDetailModalProps) {
    const [localProject, setLocalProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();
    const touchStartY = useRef(0);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
        const taskToUpdate = projectTasks.find(t => t.id === taskId);
        if (!taskToUpdate) return;
        try {
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
                    project_id: project.id 
                }),
            });

            if (res.ok) {
                const { task } = await res.json();
                onTaskUpdated();
                onSelectTask(task);
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

    return (
        <>
            <div className="fixed inset-0 z-[60] flex flex-col sm:justify-center sm:items-center">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none sm:pointer-events-auto"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                />

                {/* Sheet/Modal Container */}
                <motion.div
                    initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                    animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                    exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                    transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
                    drag={isMobile ? "y" : false}
                    dragControls={dragControls}
                    dragListener={!isMobile}
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                        // Close if dragged down more than 100px OR if flicked down quickly
                        if (info.offset.y > 100 || info.velocity.y > 500) {
                            onClose();
                        }
                    }}
                    className={`bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] w-full ${isMobile ? 'h-[92dvh] pt-2' : 'h-auto max-h-[85vh]'} sm:max-w-5xl rounded-t-[20px] sm:rounded-xl shadow-2xl relative border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454] mt-auto sm:mt-0 z-10 overflow-hidden flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Mobile Drag Handle */}
                    <div className="sm:hidden w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
                    </div>

                    {/* Top Control Bar */}
                    <div 
                        onPointerDown={(e) => isMobile && dragControls.start(e)}
                        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 pt-1 sm:pt-4 pb-3 sm:pb-4 bg-[#F5F3EF]/90 dark:bg-[#1A1A1A]/90 md:dark:bg-[#1F1F1F]/90 backdrop-blur-[2px] border-b border-[#E8E5E0] dark:border-[#3A3A3A] cursor-grab active:cursor-grabbing">
                        <div className="flex items-center gap-2 min-w-0 pr-4">
                            <div className="flex items-center gap-1 text-xs text-gray-400 font-medium ml-1 flex-shrink-0">
                                <span onClick={onClose} className="cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                    {breadcrumb}
                                </span>
                                <span className="text-gray-300 dark:text-gray-600">›</span>
                            </div>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[150px] sm:max-w-[300px]">
                                {localProject.title || "Untitled Project"}
                            </span>
                            {hasChanged && (
                                <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-[0.625rem] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">
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
                        onTouchStart={(e) => {
                            touchStartY.current = e.touches[0].clientY;
                        }}
                        onTouchEnd={(e) => {
                            if (!isMobile) return;
                            const el = scrollContainerRef.current;
                            if (!el) return;
                            const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                            // Close only if: swiped down 60px+ AND content is already at the very top
                            if (deltaY > 60 && el.scrollTop <= 0) {
                                onClose();
                            }
                        }}
                        className={`flex flex-col flex-1 ${isMobile ? 'overflow-y-auto' : 'overflow-hidden sm:overflow-y-auto'} overscroll-contain custom-scrollbar scroll-smooth`}>
                        {/* Header Content (Titles, Properties, Description) */}
                        <div className="px-4 sm:px-10 pt-6 flex-shrink-0">
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
                                    <div className="col-span-2 flex items-center gap-2 flex-wrap min-w-0">
                                        <div className="relative flex items-center">
                                            <input
                                                type="date"
                                                value={localProject.start_date ? new Date(localProject.start_date).toISOString().split('T')[0] : ""}
                                                onChange={(e) => {
                                                    const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                    handleUpdateField("start_date", dateVal);
                                                }}
                                                className={`bg-transparent text-sm font-medium outline-none p-1 -ml-1 rounded transition-colors min-w-[120px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${!localProject.start_date ? "text-transparent" : "text-gray-700 dark:text-gray-300"}`}
                                            />
                                            {!localProject.start_date && (
                                                <span className="absolute left-0 text-sm font-medium text-gray-400 dark:text-gray-500 pointer-events-none">
                                                    dd-mm-yyyy
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-gray-400 flex-shrink-0">→</span>

                                        <div className="relative flex items-center">
                                            <input
                                                type="date"
                                                value={localProject.due_date ? new Date(localProject.due_date).toISOString().split('T')[0] : ""}
                                                onChange={(e) => {
                                                    const dateVal = e.target.value ? new Date(e.target.value).toISOString() : null;
                                                    handleUpdateField("due_date", dateVal);
                                                }}
                                                className={`bg-transparent text-sm font-medium outline-none p-1 -ml-1 rounded transition-colors min-w-[120px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${!localProject.due_date ? "text-transparent" : "text-gray-700 dark:text-gray-300"}`}
                                            />
                                            {!localProject.due_date && (
                                                <span className="absolute left-0 text-sm font-medium text-gray-400 dark:text-gray-500 pointer-events-none">
                                                    dd-mm-yyyy
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
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
                            <hr className="border-[#E8E5E0] dark:border-[#3A3A3A] mb-4" />
                        </div>

                        {/* Tasks Content */}
                        <div className="px-4 sm:px-10 flex-1 sm:flex-initial pb-6 custom-scrollbar">
                            {/* Tasks Header - sticky so it pins when scrolled to */}
                            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between pt-2 pb-2 bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F]">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 border-b-[3px] border-black dark:border-white pb-1 inline-block">Tasks</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowFavorites((v) => !v)}
                                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all active:scale-95 ${showFavorites
                                        ? "bg-[#252525] dark:bg-white border-[#252525] dark:border-white text-white dark:text-[#252525] shadow-sm"
                                        : "bg-white/80 backdrop-blur-md dark:bg-[#252525] border-[#E8E5E0] dark:border-[#545454] text-[#7D7D7D] dark:text-[#7D7D7D] hover:border-[#252525] dark:hover:border-white hover:text-[#252525] dark:hover:text-white"
                                        }`}
                                >
                                    <Star size={14} className={showFavorites ? "fill-current" : ""} />
                                </button>
                            </div>

                            <div className="bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] min-h-[300px] overflow-x-auto overscroll-behavior-x-contain pb-4 scrollbar-hide">
                                <div className="flex gap-4 min-w-max px-1">
                                    {["not_started", "in_progress", "in_review", "done", "archived"].map((status) => (
                                        <div
                                            key={status}
                                            className="flex flex-col gap-2 min-h-[120px] w-[16.25rem] bg-[#f0ede8] dark:bg-white/5 rounded-xl p-2 border border-transparent hover:border-[#D1D1D1] dark:hover:border-[#444] transition-all hover:bg-[#E8E5E0]/50 dark:hover:bg-[#252525]"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, status)}
                                        >
                                            <h3 className="text-sm font-semibold text-gray-600 dark:text-white capitalize flex items-center justify-between mb-1 px-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${status === "done" ? "bg-green-500" : status === "in_progress" ? "bg-blue-500" : status === "in_review" ? "bg-purple-500" : status === "archived" ? "bg-gray-400" : "bg-orange-500"}`} />
                                                    {status.replace("_", " ")}
                                                </div>
                                                <span className="text-xs text-gray-400">{projectTasks.filter((t) => t.status === status).length}</span>
                                            </h3>
                                            {projectTasks.filter((t) => t.status === status).sort((a: any, b: any) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map((t) => (
                                                <div
                                                    key={t.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, t.id)}
                                                    onClick={() => onSelectTask(t)}
                                                    className="relative p-3 bg-white dark:bg-white/5 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-grab active:cursor-grabbing hover:border-[#D1D1D1] dark:hover:border-[#444] hover:bg-[#F9F8F6] dark:hover:bg-white/10 transition-all duration-200 group/card cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {t.is_pinned && <Pin className="w-3 h-3 text-[#545454] dark:text-white flex-shrink-0" />}
                                                        {t.is_favorite && <Star className="w-3 h-3 text-[#545454] dark:text-white fill-current flex-shrink-0" />}
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-1 truncate">{t.title}</p>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); setMoveMenuId(null); }}
                                                            className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#444] sm:opacity-0 sm:group-hover/card:opacity-100 opacity-100 transition-all flex-shrink-0 context-menu-button"
                                                        >
                                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {t.due_date && <p className="text-xs text-gray-400 font-medium mt-2">Due {format(new Date(t.due_date), "MMM d")}</p>}
                                                    {t.linked_document_id && notes.some(n => n.id === t.linked_document_id) && <span className="mt-3 flex items-center gap-1 w-fit px-2 py-1 bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-300 rounded-md text-[0.625rem] font-semibold"><FileText className="w-3 h-3" />{t.linked_document_type === "pdf" ? "PDF Linked" : "Note Linked"}</span>}
                                                    {openMenuId === t.id && (
                                                        <div className="absolute top-8 right-1 z-50 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[11.25rem] context-menu" onClick={(e) => e.stopPropagation()}>
                                                            <button onClick={() => handleToggleTaskPin(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"><Pin className="w-4 h-4" />{t.is_pinned ? "Unpin" : "Pin"}</button>
                                                            <button onClick={() => handleToggleTaskFavorite(t)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"><Star className="w-4 h-4" />{t.is_favorite ? "Unfavorite" : "Favorite"}</button>
                                                            <div className="relative">
                                                                <button onClick={() => setMoveMenuId(moveMenuId === t.id ? null : t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors"><MoveRight className="w-4 h-4" />Move to<span className="ml-auto text-gray-400">›</span></button>
                                                                {moveMenuId === t.id && (
                                                                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 min-w-[9.375rem]">
                                                                        {["not_started", "in_progress", "in_review", "done", "archived"].filter(s => s !== status).map(s => <button key={s} onClick={() => handleMoveTaskStatus(t.id, s)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors capitalize">{s.replace("_", " ")}</button>)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="border-t border-gray-100 dark:border-[#444] my-1" /><button onClick={() => handleDeleteTask(t.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" />Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <button onClick={() => handleQuickCreateTask(status)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-lg transition-colors mt-1 w-full text-left"><Plus className="w-4 h-4" />New page</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => onSelectTask(null)}
                        projects={[]}
                        notes={notes}
                        workspaces={workspaces}
                        onTaskUpdated={() => { onTaskUpdated(); }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
