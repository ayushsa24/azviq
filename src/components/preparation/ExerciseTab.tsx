"use client";

import { useState, useEffect, useRef } from "react";
import { ClipboardCheck, Plus, Trash2, Clock, Search } from "lucide-react";
import { ICON_MAP } from "@/components/editor/EmojiPicker";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { useTheme } from "@/contexts/ThemeContext";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ExerciseTabProps {
    search?: string;
    onNeedGenerate?: () => void;
    refreshKey?: number;
    onStartExercise?: (exercise: any) => void;
    viewMode?: "grid" | "list";
}

function formatDate(iso: string) {
    if (!iso) return "Unknown date";
    const date = new Date(iso);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays < 3) {
        return formatDistanceToNow(date, { addSuffix: true });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ExerciseTab({ search = "", onNeedGenerate, refreshKey, onStartExercise, viewMode = "grid" }: ExerciseTabProps) {
    const { theme } = useTheme();
    const { data, mutate, isLoading } = useSWR(refreshKey ? `/api/exercises?refresh=${refreshKey}` : "/api/exercises", fetcher);
    
    const exercises = data?.exercises || [];
    const isDark = theme === 'dark';
    const isList = viewMode === "list";


    // Expose mutate so parent can call after generate
    useEffect(() => {
        (window as any).__refetchExercises = () => {
            mutate();
        };
        return () => { delete (window as any).__refetchExercises; };
    }, [mutate]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this exercise?")) return;
        
        // Optimistic update
        mutate((current: any) => ({
            ...current,
            exercises: current.exercises.filter((ex: any) => ex.id !== id)
        }), false);

        try {
            const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            mutate();
        } catch (error) {
            console.error("Failed to delete exercise:", error);
            mutate(); // Rollback
        }
    };

    const getDifficultyBadge = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
            case 'hard': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
            default: return 'bg-[#F0EDE8] text-[#545454] dark:bg-white/5 dark:text-[#BABABA]';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-green-600 dark:text-green-400';
            default: return 'text-[#7D7D7D] dark:text-[#BABABA]';
        }
    };

    const filtered = exercises.filter((ex: any) =>
        !search || ex.title?.toLowerCase().includes(search.toLowerCase()) || ex.notes?.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col w-full min-h-0 bg-transparent">
            {isLoading ? (
                <div className={isList ? "grid grid-cols-1 lg:grid-cols-3 gap-3" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`rounded-xl border flex animate-pulse ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-[#E8E5E0]'} ${isList ? 'flex-row items-center p-3 gap-4 h-[72px]' : 'flex-col p-3.5 gap-3 h-44'}`}>
                            {isList ? (
                                <>
                                    <div className={`w-8 h-8 rounded-lg shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#E8E5E0]'}`} />
                                    <div className="flex-1">
                                        <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        <div className={`h-3 w-1/4 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between">
                                        <div className={`h-4 w-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        <div className={`h-6 w-6 rounded-lg ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`h-4 w-full rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        <div className={`h-4 w-2/3 rounded mt-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        <div className={`h-3 w-1/2 rounded mt-3 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                    </div>
                                    <div className="pt-2.5 border-t border-gray-100 dark:border-[#545454]/30 flex justify-between">
                                        <div className={`h-3 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                        <div className={`h-5 w-10 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className={`w-full flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] ${isDark ? 'border-[#333]' : 'border-[#DEDBD6]'}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm ${isDark ? 'bg-[#252525]' : 'bg-white'}`}>
                        <Search className={`w-6 h-6 ${isDark ? 'text-[#BABABA]' : 'text-[#252525]'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                    <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                        Generate your first exercise to get started.
                    </p>
                </div>
            ) : (
                <motion.div 
                    layout
                    className={isList ? "grid grid-cols-1 lg:grid-cols-3 gap-3 w-full" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full"}
                >
                        <AnimatePresence mode="popLayout">
                            {filtered.map((ex: any, idx: number) => (
                                <motion.div
                                key={ex.id}
                                layout
                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ 
                                    duration: 0.25, 
                                    ease: [0.23, 1, 0.32, 1]
                                }}
                                onClick={() => onStartExercise?.(ex)}
                                className={`group relative transition-all duration-200 cursor-pointer bg-white dark:bg-white/5 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
                                    ${isList 
                                        ? "flex flex-row items-center gap-4 py-3 px-4 rounded-xl h-auto" 
                                        : "flex flex-col justify-between p-3 rounded-xl h-44"
                                    }`}
                            >
                                <h3 className="sr-only">{ex.title}</h3>
                                {isList ? (
                                    <>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-white/10" : "bg-[#F0EDE8]"} text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors`}>
                                            <ClipboardCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors truncate flex items-center gap-1.5">
                                                <span>{ex.title.replace(/^\[\w+\]\s*/, "")}</span>
                                                {(() => {
                                                    const iconMatch = ex.title.match(/^\[(\w+)\]/);
                                                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                                        const IconComp = ICON_MAP[iconMatch[1]];
                                                        return <IconComp size={14} className="opacity-40 shrink-0" strokeWidth={1.5} />;
                                                    }
                                                    return null;
                                                })()}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#BABABA]">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(ex.created_at)}</span>
                                                <span className={`font-bold ${getStatusStyle(ex.status)}`}>
                                                    {ex.status} {ex.score !== null && ex.score !== undefined && `· ${ex.score}%`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pr-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(ex.id); }}
                                                className="lg:opacity-0 lg:group-hover:opacity-100 text-[#7D7D7D] hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <div className="w-5 h-5 flex items-center justify-center text-[#BABABA]">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Top Badge Overlay */}
                                        <div className="absolute top-3 right-3 z-10 transition-all">
                                            <div className="rounded shadow-sm bg-[#252525] dark:bg-white text-white dark:text-[#252525] text-[0.5rem] sm:text-[0.625rem] px-1 py-0 sm:px-1.5 sm:py-0.5 font-bold uppercase transform-gpu">
                                                EXERCISE
                                            </div>
                                        </div>

                                        {/* Center Icon */}
                                        <div className="flex-1 flex items-center justify-center py-1 overflow-hidden">
                                            <div className="relative">
                                                <ClipboardCheck className="w-10 h-10 text-[#545454] dark:text-[#7D7D7D] group-hover:text-black dark:group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                                            </div>
                                        </div>

                                        {/* Bottom Metadata (matches NoteCard style) */}
                                        <div className={`mt-3 pt-3 border-t border-[#E8E5E0] dark:border-[#7D7D7D]/20 transition-colors`}>
                                            <h3 className="text-sm font-semibold truncate text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1.5" title={ex.title}>
                                                <span>{ex.title.replace(/^\[\w+\]\s*/, "")}</span>
                                                {(() => {
                                                    const iconMatch = ex.title.match(/^\[(\w+)\]/);
                                                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                                        const IconComp = ICON_MAP[iconMatch[1]];
                                                        return <IconComp className="w-4 h-4 opacity-40 shrink-0" strokeWidth={1.5} />;
                                                    }
                                                    return null;
                                                })()}
                                            </h3>

                                            <div className="flex items-center justify-between text-[0.625rem] w-full text-[#545454] dark:text-[#BABABA]">
                                                <div className="flex flex-col">
                                                    <p className={`font-bold flex items-center gap-1 ${getStatusStyle(ex.status)}`}>
                                                        {ex.status}
                                                        {ex.score !== null && ex.score !== undefined && (
                                                            <span className="opacity-50">· {ex.score}%</span>
                                                        )}
                                                    </p>
                                                    <div className="flex items-center gap-1 mt-0.5 opacity-60">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>{formatDate(ex.created_at)}</span>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(ex.id); }}
                                                    className="p-1.5 rounded-lg text-[#7D7D7D] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all lg:opacity-0 lg:group-hover:opacity-100"
                                                    title="Delete Exercise"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
            </div>
    );
}
