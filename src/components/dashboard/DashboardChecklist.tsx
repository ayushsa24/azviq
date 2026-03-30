"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Plus, Trash2, ListTodo, Clock, X,
    CheckCircle2, Circle, AlarmClock, RotateCcw, Loader2,
    ChevronDown, ArrowRight
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNotifications } from "@/contexts/NotificationContext";
import useSWR from "swr";


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
});


export default function DashboardChecklist() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { fetchNotifications, checkReminders } = useNotifications();
    const { data: todosData, isLoading: todosLoading, mutate: mutateTodos } = useSWR("/api/todos");
    const [showAll, setShowAll] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(defaultForm());

    const items = (todosData?.todos || []) as TodoItem[];
    const isLoading = todosLoading && !todosData;

    const openAdd = () => {
        setEditingId(null);
        setForm(defaultForm());
        setShowModal(true);
    };

    const openEdit = (item: TodoItem) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            note: item.note || "",
            time: item.time || "",
            repeat: item.repeat,
            custom_days: item.custom_days || [],
        });
        setShowModal(true);
    };

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

    return (
        <>
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 flex flex-col group/card relative
                ${(pending.length + (done.length > 0 ? done.length + 1 : 0)) > 5 ? "min-h-[220px] max-h-[365px]" : "h-auto"}
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 pb-12 space-y-1.5
                    [&::-webkit-scrollbar]:w-[2px] 
                    [&::-webkit-scrollbar-track]:bg-transparent 
                    [&::-webkit-scrollbar-thumb]:bg-[#D1CEC8] dark:[&::-webkit-scrollbar-thumb]:bg-[#444]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    custom-scrollbar-alt
                ">
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
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center">
                                <ListTodo className="w-5 h-5 text-[#7D7D7D] dark:text-[#BABABA]" />
                            </div>
                            <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA] text-center">No tasks found.<br />Tap <strong>Add</strong> to create one.</p>
                        </div>
                    ) : (
                        <>
                            {pending.map(item => (
                                <TodoRow key={item.id} item={item} isDark={isDark} onToggle={toggleDone} onEdit={openEdit} onDelete={deleteItem} />
                            ))}
                            {done.length > 0 && (
                                <>
                                    <div className="flex items-center gap-2 pt-2 pb-1">
                                        <div className="h-px flex-1 bg-[#E8E5E0] dark:bg-[#383838]" />
                                        <span className="text-[10px] text-[#7D7D7D] dark:text-[#BABABA] font-bold uppercase tracking-wider">Completed {done.length}</span>
                                        <div className="h-px flex-1 bg-[#E8E5E0] dark:bg-[#383838]" />
                                    </div>
                                    {done.map(item => (
                                        <TodoRow key={item.id} item={item} isDark={isDark} onToggle={toggleDone} onEdit={openEdit} onDelete={deleteItem} />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Scroll Indicator */}
                {(pending.length + (done.length > 0 ? done.length + 1 : 0)) > 5 && (
                    <div className="absolute bottom-11 left-0 right-0 flex justify-center pointer-events-none z-20">
                        <div className={`p-1 rounded-full ${isDark ? "bg-[#252525]/90 text-white" : "bg-white/80 text-[#252525]"} backdrop-blur-md shadow-lg border border-white/10 dark:border-white/5`}>
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                )}

                {/* Bottom quick-add strip */}
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2">
                    <button
                        onClick={openAdd}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#D1CEC8] dark:border-[#444] text-[#BABABA] dark:text-[#7D7D7D] hover:border-[#7D7D7D] dark:hover:border-[#BABABA] hover:text-[#545454] dark:hover:text-[#CFCFCF] transition-colors text-xs"
                    >
                        <Plus size={13} />
                        <span>Add to-do item…</span>
                    </button>
                </div>
            </div>

            {/* Modal - Same as before */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="w-full max-w-sm bg-[#F5F3EF] dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#E8E5E0] dark:border-[#545454] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#E8E5E0] dark:border-[#383838]">
                            <h3 className="font-bold text-base text-[#252525] dark:text-white">
                                {editingId ? "Edit To-Do" : "New To-Do"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white p-1 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                            {/* Title */}
                            <div>
                                <label className="text-xs font-semibold text-[#7D7D7D] dark:text-[#BABABA] mb-1 block">Title *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="What do you need to do?"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && saveItem()}
                                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#545454] bg-white dark:bg-[#1A1A1A] text-[#252525] dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#C2A27A]/30 transition-colors placeholder-[#9E9E9E]"
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="text-xs font-semibold text-[#7D7D7D] dark:text-[#BABABA] mb-1 flex items-center gap-1 block">
                                    <AlarmClock className="w-3 h-3" /> Reminder Time
                                </label>
                                <input
                                    type="time"
                                    value={form.time}
                                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                                    onClick={(e) => (e.target as any).showPicker?.()}
                                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#545454] bg-white dark:bg-[#1A1A1A] text-[#252525] dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#C2A27A]/30 transition-colors cursor-pointer [&::-webkit-datetime-edit-ampm-field]:hidden"
                                />
                            </div>

                            {/* Repeat */}
                            <div>
                                <label className="text-xs font-semibold text-[#7D7D7D] dark:text-[#BABABA] mb-1.5 flex items-center gap-1 block">
                                    <RotateCcw className="w-3 h-3" /> Repeat
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {(Object.keys(REPEAT_LABELS) as RepeatType[]).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setForm(f => ({ ...f, repeat: r }))}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${form.repeat === r
                                                ? "bg-[#252525] dark:bg-white text-white dark:text-[#252525] border-[#252525] dark:border-white shadow-sm"
                                                : "bg-white/50 dark:bg-transparent border-[#E8E5E0] dark:border-[#545454] text-[#545454] dark:text-[#BABABA] hover:border-[#C2A27A] dark:hover:border-[#BABABA]"
                                                }`}
                                        >
                                            {REPEAT_LABELS[r]}
                                        </button>
                                    ))}
                                </div>
                                {form.repeat === "custom" && (
                                    <div className="flex gap-1 mt-2">
                                        {DAYS.map((d, i) => (
                                            <button
                                                key={d}
                                                onClick={() => toggleCustomDay(i)}
                                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all ${form.custom_days.includes(i)
                                                    ? "bg-[#252525] dark:bg-white text-white dark:text-[#252525] border-[#252525] dark:border-white"
                                                    : "bg-white/50 dark:bg-transparent border-[#E8E5E0] dark:border-[#545454] text-[#BABABA] dark:text-[#545454]"
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Note */}
                            <div>
                                <label className="text-xs font-semibold text-[#7D7D7D] dark:text-[#BABABA] mb-1 block">Note (optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Add a note or details…"
                                    value={form.note}
                                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#545454] bg-white dark:bg-[#1A1A1A] text-[#252525] dark:text-white text-sm outline-none focus:ring-1 focus:ring-[#C2A27A]/30 transition-colors resize-none placeholder-[#9E9E9E]"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 px-5 pb-5 pt-2">
                            {editingId && (
                                <button
                                    onClick={() => deleteItem(editingId)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[#E8E5E0] dark:border-[#545454] bg-white/50 dark:bg-transparent text-sm font-semibold text-[#545454] dark:text-[#BABABA] hover:bg-white dark:hover:bg-[#1A1A1A] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveItem}
                                disabled={!form.title.trim() || isSaving}
                                className="flex-1 py-2.5 rounded-xl bg-[#252525] dark:bg-white hover:bg-[#1A1A1A] dark:hover:bg-[#F0EDE8] text-white dark:text-[#252525] text-sm font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {editingId ? "Save" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function TodoRow({ item, isDark, onToggle, onEdit, onDelete }: {
    item: TodoItem;
    isDark: boolean;
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
                {/* Background for Complete (Swipe Right -> reveals left) */}
                <div className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 w-full transition-opacity duration-200 ${swipeOffset > 20 ? "opacity-100 bg-[#C2A27A]" : "opacity-0 bg-[#C2A27A]/80"}`}>
                    <CheckCircle2 className="w-5 h-5 text-white" />
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
                        onToggle(item.id, item.done);
                        setSwipeOffset(0);
                    } else {
                        setSwipeOffset(0);
                    }
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
                <div className="flex-1 min-w-0">
                    <span className={`flex-1 text-sm font-medium truncate pr-2 ${item.done ? "line-through text-[#7D7D7D] dark:text-[#BABABA]/80 opacity-60" : "text-[#252525] dark:text-white"}`}>
                        {item.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        {item.time && (
                            <span className={`flex items-center gap-0.5 text-[10px] ${item.done ? "opacity-40" : (isDark ? "text-[#BABABA]" : "text-[#7D7D7D]")}`}>
                                <Clock className="w-2.5 h-2.5" />{item.time}
                            </span>
                        )}
                        <span className={`text-[10px] ${item.done ? "opacity-40" : (isDark ? "text-[#545454]" : "text-[#BABABA]")}`}>
                            {REPEAT_LABELS[item.repeat]}
                        </span>
                    </div>
                </div>

                <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/item-container:opacity-100" />
            </div>
        </div>
    );
}
