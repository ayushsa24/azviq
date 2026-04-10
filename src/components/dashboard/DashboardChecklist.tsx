"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { 
    Plus, 
    X, 
    Clock, 
    RotateCcw, 
    Calendar, 
    Trash2, 
    MessageCircle, 
    FileText, 
    ChevronDown, 
    Search,
    Check,
    ListTodo,
    CheckCircle2,
    Circle,
    AlarmClock,
    Loader2,
    ArrowRight,
    ExternalLink
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";


type RepeatType = "today" | "daily" | "weekdays" | "weekends" | "custom";

interface TodoItem {
    id: string;
    title: string;
    note?: string;
    time?: string;
    repeat: RepeatType;
    custom_days?: number[];
    done: boolean;
    created_at: string;
    linked_document_id?: string | null;
    linked_document_type?: "note" | "pdf" | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REPEAT_LABELS: Record<RepeatType, string> = {
    today: "Today only",
    daily: "Every day",
    weekdays: "Mon – Fri",
    weekends: "Sat & Sun",
    custom: "Custom days",
};

function isTodoVisibleToday(item: TodoItem): boolean {
    const now = new Date();
    const todayDay = now.getDay();
    if (item.repeat === "today") {
        if (!item.created_at) return true;
        const itemDate = new Date(item.created_at);
        return itemDate.toDateString() === now.toDateString();
    }
    if (item.repeat === "daily") return true;
    if (item.repeat === "weekdays") return todayDay >= 1 && todayDay <= 5;
    if (item.repeat === "weekends") return todayDay === 0 || todayDay === 6;
    if (item.repeat === "custom") return (item.custom_days || []).includes(todayDay);
    return false;
}

const defaultForm = () => ({
    title: "",
    note: "",
    time: "",
    repeat: "today" as RepeatType,
    custom_days: [] as number[],
    linked_document_id: null as string | null,
    linked_document_type: null as "note" | "pdf" | null,
});


export default function DashboardChecklist() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { fetchNotifications, checkReminders } = useNotifications();
    const { data: todosData, isLoading: todosLoading, mutate: mutateTodos } = useSWR("/api/todos");
    const { data: notesData } = useSWR("/api/notes?all=true");
    const { data: workspacesData } = useSWR("/api/workspaces");
    
    const notes = notesData?.notes || [];
    const workspaces = workspacesData?.workspaces || [];
    
    const [showAll, setShowAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(defaultForm());
    const [initialForm, setInitialForm] = useState(defaultForm());
    const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
    const [materialSearchQuery, setMaterialSearchQuery] = useState("");
    const materialDropdownRef = useRef<HTMLDivElement>(null);
    const timeInputRef = useRef<HTMLInputElement>(null);
    const frequencySelectRef = useRef<HTMLSelectElement>(null);

    const hasChanged = JSON.stringify(form) !== JSON.stringify(initialForm);

    // Filter range for responsiveness
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;


    const items = (todosData?.todos || []) as TodoItem[];
    const isLoading = todosLoading && !todosData;

    // Lock scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showModal]);

    const openAdd = () => {
        setEditingId(null);
        const f = defaultForm();
        setForm(f);
        setInitialForm(f);
        setShowModal(true);
    };

    const openEdit = (item: TodoItem) => {
        setEditingId(item.id);
        const f = {
            title: item.title,
            note: item.note || "",
            time: item.time || "",
            repeat: item.repeat,
            custom_days: item.custom_days || [],
            linked_document_id: item.linked_document_id || null,
            linked_document_type: item.linked_document_type || null,
        };
        setForm(f);
        setInitialForm(f);
        setShowModal(true);
    };

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showModal]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
                setShowMaterialDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveItem = async () => {
        if (!form.title.trim()) return;
        setIsSaving(true);
        try {
            if (editingId) {
                const res = await fetch(`/api/todos/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: form.title.trim(),
                        note: form.note,
                        time: form.time,
                        repeat: form.repeat,
                        custom_days: form.custom_days,
                        linked_document_id: form.linked_document_id,
                        linked_document_type: form.linked_document_type,
                    }),
                });
                if (res.ok) {
                    const { todo } = await res.json();
                    mutateTodos((currentData: { todos: TodoItem[] } | undefined) => ({
                        ...currentData,
                        todos: (currentData?.todos || []).map((i: TodoItem) => i.id === editingId ? todo : i)
                    }), false);
                    mutateTodos(); // Force background refresh
                    checkReminders(); // Check for immediate notifications
                }
            } else {
                const res = await fetch("/api/todos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: form.title.trim(),
                        note: form.note,
                        time: form.time,
                        repeat: form.repeat,
                        custom_days: form.custom_days,
                        linked_document_id: form.linked_document_id,
                        linked_document_type: form.linked_document_type,
                    }),
                });
                if (res.ok) {
                    const { todo } = await res.json();
                    mutateTodos((currentData: { todos: TodoItem[] } | undefined) => ({
                        ...currentData,
                        todos: [todo, ...(currentData?.todos || [])]
                    }), false);
                    mutateTodos(); // Force background refresh
                    checkReminders(); // Check for immediate notifications
                }
            }
            setShowModal(false);
        } catch (e) {
            console.error("Failed to save todo:", e);
        } finally {
            setIsSaving(false);
        }
    };


    const toggleDone = async (id: string, current: boolean) => {
        mutateTodos((currentData: { todos: TodoItem[] } | undefined) => ({
            ...currentData,
            todos: (currentData?.todos || []).map((i: TodoItem) => i.id === id ? { ...i, done: !current } : i)
        }), false);
        try {
            await fetch(`/api/todos/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ done: !current }),
            });
        } catch (e) {
            mutateTodos(); // Revert
        }
    };

    const deleteItem = async (id: string) => {
        mutateTodos((currentData: { todos: TodoItem[] } | undefined) => ({
            ...currentData,
            todos: (currentData?.todos || []).filter((i: TodoItem) => i.id !== id)
        }), false);
        setShowModal(false);
        try {
            await fetch(`/api/todos/${id}`, { method: "DELETE" });
        } catch (e) {
            mutateTodos(); // Revert
        }
    };

    const toggleCustomDay = (day: number) => {
        setForm(f => ({
            ...f,
            custom_days: f.custom_days.includes(day)
                ? f.custom_days.filter(d => d !== day)
                : [...f.custom_days, day],
        }));
    };

    const visibleItems = showAll ? items : items.filter(isTodoVisibleToday);
    const pending = visibleItems.filter(i => !i.done);
    const done = visibleItems.filter(i => i.done);
    const itemCount = (pending.length + (done.length > 0 ? done.length + 1 : 0));

    return (
        <>
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 flex flex-col group/card relative
                ${itemCount > 5 ? "min-h-[220px] max-h-[365px]" : "h-auto"}
                ${isDark ? "hover:bg-white/10 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"}
                shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
            `}>
                {/* Header - Fixed */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-2 border-b border-[#E8E5E0] dark:border-[#383838]">
                    <div className="flex items-center gap-2">
                        <ListTodo className="w-5 h-5 text-[#252525] dark:text-white" />
                        <h2 className="text-lg font-bold text-[#252525] dark:text-white">To-Do</h2>
                        {pending.length > 0 && (
                            <span className="text-xs font-bold bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-[#CFCFCF] px-2 py-0.5 rounded-full">
                                {pending.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F0EDE8] dark:bg-[#383838] hover:bg-[#E8E5E0] dark:hover:bg-[#444] text-[#252525] dark:text-[#CFCFCF] rounded-full text-xs font-semibold transition-all shadow-sm"
                        >
                            {showAll ? "View Today" : "View All"}
                        </button>
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#252525] dark:bg-white hover:bg-[#1A1A1A] dark:hover:bg-[#F0EDE8] text-white dark:text-[#252525] rounded-full text-xs font-semibold transition-all shadow-sm"
                        >
                            <Plus size={12} />
                            Add
                        </button>
                    </div>
                </div>

                {/* List - Scrollable */}
                <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 ${itemCount > 5 ? "pb-12" : "pb-2"} space-y-1.5
                    [&::-webkit-scrollbar]:w-[2px] 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-[#D1CEC8] dark:[&::-webkit-scrollbar-thumb]:bg-[#444]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    custom-scrollbar-alt
                `}>
                    {isLoading ? (
                        <div className="space-y-1.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#3C3C3C] bg-white/80 backdrop-blur-md dark:bg-[#252525] animate-pulse">
                                    <div className="w-4 h-4 rounded-full bg-[#E8E5E0] dark:bg-[#383838] flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className={`h-3 rounded-full bg-[#E8E5E0] dark:bg-[#383838] ${i === 1 ? "w-3/4" : i === 2 ? "w-1/2" : "w-2/3"}`} />
                                        <div className="h-2 rounded-full bg-[#F0EDE8] dark:bg-[#2C2C2C] w-1/3" />
                                    </div>
                                    <div className="w-5 h-5 rounded bg-[#F0EDE8] dark:bg-[#2C2C2C] flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : visibleItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-2 sm:py-3 gap-2">
                            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center">
                                <ListTodo className="w-5 h-5 text-[#7D7D7D] dark:text-[#BABABA]" />
                            </div>
                            <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA] text-center">No tasks found.<br />Tap <strong>Add</strong> to create one.</p>
                        </div>
                    ) : (
                        <>
                            {pending.map(item => (
                                <TodoRow key={item.id} item={item} isDark={isDark} notes={notes} onToggle={toggleDone} onEdit={openEdit} onDelete={deleteItem} />
                            ))}
                            {done.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2 pt-2 pb-1">
                                        <div className="h-px flex-1 bg-[#E8E5E0] dark:bg-[#383838]" />
                                        <span className="text-[10px] text-[#7D7D7D] dark:text-[#BABABA] font-bold uppercase tracking-wider">Completed {done.length}</span>
                                        <div className="h-px flex-1 bg-[#E8E5E0] dark:bg-[#383838]" />
                                    </div>
                                    {done.map(item => (
                                        <TodoRow key={item.id} item={item} isDark={isDark} notes={notes} onToggle={toggleDone} onEdit={openEdit} onDelete={deleteItem} />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Scroll Indicator */}
                {itemCount > 5 && (
                    <div className="absolute bottom-11 left-0 right-0 flex justify-center pointer-events-none z-20">
                        <div className={`p-1 rounded-full ${isDark ? "bg-[#252525]/90 text-white" : "bg-white/80 text-[#252525]"} backdrop-blur-md shadow-lg border border-white/10 dark:border-white/5`}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                )}

                {/* Bottom quick-add strip */}
                <div className={`px-4 sm:px-5 pb-4 sm:pb-5 ${itemCount === 0 ? "pt-0" : "pt-2"}`}>
                    <button
                        onClick={openAdd}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#D1CEC8] dark:border-[#444] text-[#BABABA] dark:text-[#7D7D7D] hover:border-[#7D7D7D] dark:hover:border-[#BABABA] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors text-xs"
                    >
                        <Plus size={13} />
                        <span>Add to-do item…</span>
                    </button>
                </div>
            </div>

            {/* Premium Detail Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[300] flex flex-col sm:justify-center sm:items-center">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.15 } }}
                            onClick={() => setShowModal(false)}
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
                                if (info.offset.y > 100 || info.velocity.y > 500) setShowModal(false);
                            }}
                            className="bg-[#F5F3EF] dark:bg-[#1A1A1A] w-full h-[95vh] sm:h-auto sm:max-h-[85vh] sm:max-w-3xl rounded-t-[20px] sm:rounded-xl overflow-hidden flex flex-col shadow-2xl relative border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454] mt-auto sm:mt-0 z-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Mobile Drag Handle */}
                            <div className="sm:hidden w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
                            </div>                            {/* Modal Header */}
                            <div className="sticky top-0 z-[100] flex items-center justify-between px-4 sm:px-6 pt-1 sm:pt-4 pb-3 sm:pb-4 bg-[#F5F3EF]/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                                <div className="flex items-center gap-2 min-w-0 pr-4">
                                    <span className="text-xs font-bold text-[#252525] dark:text-gray-200 truncate max-w-[200px] sm:max-w-[400px]">
                                        {form.title || (editingId ? "Edit To-Do" : "New To-Do")}
                                    </span>
                                    {hasChanged && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-[10px] text-orange-600 dark:text-orange-400 font-black uppercase tracking-wider animate-pulse">
                                            Unsaved
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {hasChanged && (
                                        <button
                                            onClick={saveItem}
                                            disabled={!form.title.trim() || isSaving}
                                            className="px-4 py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-xl text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg"
                                        >
                                            {isSaving ? (
                                                <span className="flex items-center gap-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Saving...
                                                </span>
                                            ) : "Save Changes"}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="p-1 rounded-md text-[#7D7D7D] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-2 pt-8 sm:pb-12 pb-12 custom-scrollbar">
                                {/* Giant Title */}
                                <div className="mb-10">
                                    <input
                                        type="text"
                                        placeholder="Start working on assignment"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        className="w-full text-4xl sm:text-5xl font-black bg-transparent border-none text-[#252525] dark:text-white placeholder-[#BDBDBD] focus:ring-0 p-0 outline-none leading-tight"
                                    />
                                </div>                                {/* Properties Section - Structured like the image */}
                                <div className="space-y-3 mb-8 max-w-2xl">
                                    {/* Reminder Time Row */}
                                    <div 
                                        onClick={() => {
                                            try { (timeInputRef.current as any)?.showPicker(); } 
                                            catch (e) { timeInputRef.current?.focus(); }
                                        }}
                                        className="grid grid-cols-3 items-center gap-4 group min-h-[32px] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-lg -mx-2 px-2 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA] col-span-1">
                                            <Clock className="w-4 h-4 text-[#7D7D7D]/50" />
                                            <span className="text-sm font-medium">Reminder</span>
                                        </div>
                                        <div className="col-span-2 relative flex items-center">
                                            <input
                                                ref={timeInputRef}
                                                type="time"
                                                value={form.time || ""}
                                                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                                className={`bg-transparent border-none p-1 -ml-1 text-sm font-medium focus:ring-0 outline-none w-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors ${!form.time ? "text-transparent" : "text-[#252525] dark:text-white"}`}
                                            />
                                            {!form.time && (
                                                <span className="absolute left-0 text-sm font-medium text-[#7D7D7D] dark:text-[#545454] pointer-events-none">
                                                    --:--
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Frequency Row */}
                                    <div 
                                        onClick={() => {
                                            try { (frequencySelectRef.current as any)?.showPicker(); } 
                                            catch (e) { frequencySelectRef.current?.focus(); }
                                        }}
                                        className="grid grid-cols-3 items-center gap-4 group min-h-[32px] cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-lg -mx-2 px-2 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA] col-span-1">
                                            <RotateCcw className="w-4 h-4 text-[#7D7D7D]/50" />
                                            <span className="text-sm font-medium">Frequency</span>
                                        </div>
                                        <div className="col-span-2">
                                            <select
                                                ref={frequencySelectRef}
                                                value={form.repeat}
                                                onChange={e => setForm(f => ({ ...f, repeat: e.target.value as RepeatType }))}
                                                className="bg-transparent border-none p-1 -ml-1 text-sm font-medium text-[#252525] dark:text-white focus:ring-0 outline-none w-full cursor-pointer appearance-none hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                                            >
                                                {Object.entries(REPEAT_LABELS).map(([key, label]) => (
                                                    <option key={key} value={key} className="bg-[#F5F3EF] dark:bg-[#1A1A1A]">{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {form.repeat === 'custom' && (
                                        <div className="grid grid-cols-3 items-center gap-4 animate-in fade-in slide-in-from-top-1">
                                            <div className="col-span-1" /> {/* Spacer */}
                                            <div className="col-span-2 flex gap-1.5">
                                                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => {
                                                    const isSelected = (form.custom_days || []).includes(i);
                                                    return (
                                                        <button
                                                            key={`${day}-${i}`}
                                                            onClick={() => {
                                                                const current = form.custom_days || [];
                                                                const next = current.includes(i) 
                                                                    ? current.filter(d => d !== i) 
                                                                    : [...current, i];
                                                                setForm(f => ({ ...f, custom_days: next }));
                                                            }}
                                                            className={`w-7 h-7 rounded-full text-[9px] font-bold transition-all flex items-center justify-center
                                                                ${isSelected 
                                                                    ? "bg-[#252525] dark:bg-white text-white dark:text-[#252525] shadow-sm transform scale-105" 
                                                                    : "bg-black/5 dark:bg-white/5 text-[#7D7D7D] dark:text-[#545454] hover:bg-black/10 dark:hover:bg-white/10"
                                                                }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Material Selection Row */}
                                    <div className="grid grid-cols-3 items-center gap-4 group min-h-[32px]" ref={materialDropdownRef}>
                                        <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA] col-span-1">
                                            <FileText className="w-4 h-4 text-[#7D7D7D]/50" />
                                            <span className="text-sm font-medium">Material</span>
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2">
                                            <div className="relative flex-1 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
                                                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg border transition-all text-sm min-w-0
                                                        ${form.linked_document_id 
                                                            ? "bg-black/5 dark:bg-white/5 border-[#CFCFCF] dark:border-[#444] text-[#252525] dark:text-white" 
                                                            : "bg-white/50 dark:bg-white/5 border-transparent hover:border-[#D1D1D1] dark:hover:border-[#545454] text-[#7D7D7D] dark:text-[#BABABA]"
                                                        }`}
                                                >
                                                    <span className="truncate flex-1 text-left">
                                                        {form.linked_document_id ? (() => {
                                                            const n = notes.find((note: any) => note.id === form.linked_document_id);
                                                            if (!n) return "Deleted Material";
                                                            const ws = workspaces?.find((w: any) => w.id === n.workspace_id);
                                                            const wsPrefix = ws ? `[${ws.name}] ` : "";
                                                            return `${wsPrefix}${n.title || "Untitled"} (${n.file_url ? 'PDF' : 'Note'})`;
                                                        })() : "None"}
                                                    </span>
                                                    <ChevronDown className={`w-3.5 h-3.5 ml-2 transition-transform shrink-0 ${showMaterialDropdown ? 'rotate-180' : ''}`} />
                                                </button>

                                                {showMaterialDropdown && (
                                                    <div className="absolute top-11 right-0 left-0 bg-[#F5F3EF] dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl shadow-xl max-h-[300px] flex flex-col z-[150]">
                                                        {/* Search Box */}
                                                        <div className="p-2 border-b border-[#E8E5E0] dark:border-[#545454]">
                                                            <div className="relative">
                                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Search material..."
                                                                    value={materialSearchQuery}
                                                                    onChange={(e) => setMaterialSearchQuery(e.target.value)}
                                                                    className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#444] focus:border-gray-400 dark:focus:border-[#666] rounded-lg text-sm py-1.5 pl-8 pr-3 outline-none transition-colors text-black dark:text-white"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm(f => ({ ...f, linked_document_id: null, linked_document_type: null }));
                                                                    setShowMaterialDropdown(false);
                                                                    setMaterialSearchQuery("");
                                                                }}
                                                                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between mb-1 ${!form.linked_document_id ? "bg-black/5 dark:bg-white/5 text-[#252525] dark:text-white font-medium" : "text-[#7D7D7D] dark:text-[#BABABA] hover:bg-black/5 dark:hover:bg-white/5"}`}
                                                            >
                                                                None
                                                                {!form.linked_document_id && <Check className="w-3 h-3" />}
                                                            </button>

                                                            {notes.filter((n: any) => n.title.toLowerCase().includes(materialSearchQuery.toLowerCase())).map((note: any) => {
                                                                const ws = workspaces?.find((w: any) => w.id === note.workspace_id);
                                                                const wsPrefix = ws ? `[${ws.name}] ` : "";
                                                                const isSelected = form.linked_document_id === note.id;
                                                                
                                                                return (
                                                                    <button
                                                                        key={note.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForm(f => ({ ...f, linked_document_id: note.id, linked_document_type: 'note' }));
                                                                            setShowMaterialDropdown(false);
                                                                            setMaterialSearchQuery("");
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between mt-0.5 ${isSelected ? "bg-black/5 dark:bg-white/5 text-[#252525] dark:text-white font-medium" : "text-[#7D7D7D] dark:text-[#BABABA] hover:bg-black/5 dark:hover:bg-white/5"}`}
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-2">
                                                                            <span className="truncate">
                                                                                {note.title || "Untitled Note"}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-500 truncate mt-0.5 flex gap-1">
                                                                                {wsPrefix && <span className="font-medium text-gray-400">{wsPrefix}</span>}
                                                                                <span>{note.file_url ? 'PDF' : 'Note'}</span>
                                                                            </span>
                                                                        </div>
                                                                        {isSelected && <Check className="w-3 h-3 flex-shrink-0 text-gray-600 dark:text-gray-300" />}
                                                                    </button>
                                                                );
                                                            })}

                                                            {notes.filter((n: any) => n.title.toLowerCase().includes(materialSearchQuery.toLowerCase())).length === 0 && (
                                                                <div className="px-3 py-4 text-center text-xs text-gray-500">
                                                                    No material found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {form.linked_document_id && (
                                                <Link
                                                    href={`/library/${form.linked_document_type || 'note'}/${form.linked_document_id}`}
                                                    target="_blank"
                                                    className="px-2 py-1 text-[11px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded shrink-0 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                                >
                                                    Open
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Comments / Description Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA]">
                                        <ListTodo className="w-4 h-4" />
                                        <span className="text-sm font-bold uppercase tracking-wider">Comments / Description</span>
                                    </div>
                                    <textarea
                                        rows={4}
                                        placeholder="Add a note or details…"
                                        value={form.note}
                                        onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                        className="w-full p-0 bg-transparent border-none text-sm text-[#252525] dark:text-[#BABABA] placeholder-[#9E9E9E] focus:ring-0 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

function TodoRow({ item, isDark, notes, onToggle, onEdit, onDelete }: {
    item: TodoItem;
    isDark: boolean;
    notes: any[];
    onToggle: (id: string, current: boolean) => void;
    onEdit: (item: TodoItem) => void;
    onDelete: (id: string) => void;
}) {
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

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
                className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm
                    ${swipeOffset === 0 ? "transition-transform duration-300 ease-out" : ""}
                    ${isDark
                        ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                        : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                    }
                `}
                style={{
                    transform: `translateX(${swipeOffset}px)`
                }}
                onClick={() => {
                    if (swipeOffset === 0) onEdit(item);
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
                        onToggle(item.id, item.done);
                    } else if (swipeOffset < -60) {
                        onDelete(item.id);
                    }
                    
                    setSwipeOffset(0);
                    touchStartRef.current = null;
                }}
            >
                {/* Checkbox */}
                <button
                    onClick={e => { e.stopPropagation(); onToggle(item.id, item.done); }}
                    className={`flex-shrink-0 transition-colors ${item.done ? "text-green-500" : "text-[#CFCFCF] dark:text-[#545454] hover:text-white"}`}
                >
                    {item.done
                        ? <CheckCircle2 className="w-5 h-5" />
                        : <Circle className="w-5 h-5" />
                    }
                </button>

                {/* Text + meta */}
                <div className="flex-1 min-w-0 pr-2">
                    <span className={`block text-sm font-medium truncate ${item.done ? "line-through text-[#7D7D7D] dark:text-[#BABABA]/80 opacity-60" : "text-[#252525] dark:text-white"}`}>
                        {item.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 opacity-70">
                        {item.time && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase">
                                <Clock className="w-2.5 h-2.5 text-[#C2A27A]" />
                                {item.time}
                            </div>
                        )}
                        <div className="text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase">
                            · {REPEAT_LABELS[item.repeat]}
                        </div>
                        {item.linked_document_id && notes.some(n => n.id === item.linked_document_id) && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase">
                                · {item.linked_document_type === 'note' ? <FileText className="w-2.5 h-2.5 text-[#C2A27A]" /> : <ExternalLink className="w-2.5 h-2.5 text-blue-500" />}
                                Material
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop hover actions (Arrow/Delete) */}
                <div className="hidden sm:flex items-center justify-center w-8 h-8 shrink-0">
                    <div className="group/action relative flex items-center justify-center w-full h-full">
                        <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover/item-container:hidden transition-all" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
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
