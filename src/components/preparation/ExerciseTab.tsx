"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Clock, Search } from "lucide-react";
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
    const { data, mutate, isLoading } = useSWR("/api/exercises", fetcher);
    
    const exercises = data?.exercises || [];
    const isDark = theme === 'dark';
    const isList = viewMode === "list";

    // Sequential loading logic
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        if (!isLoading && exercises.length > 0) {
            const timer = setInterval(() => {
                setVisibleCount(prev => {
                    if (prev >= exercises.length) {
                        clearInterval(timer);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 50); // Reveal one every 50ms for a fast but clear sequential feel
            return () => clearInterval(timer);
        } else if (!isLoading && exercises.length === 0) {
            setVisibleCount(0);
        }
    }, [isLoading, exercises.length]);

    // Re-sync and Reset
    useEffect(() => {
        setVisibleCount(0);
        mutate();
    }, [refreshKey, mutate]);


    // Expose mutate so parent can call after generate
    useEffect(() => {
        (window as any).__refetchExercises = () => {
            setVisibleCount(0);
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
        <div className="flex flex-col gap-4 flex-1 h-full">

            {/* Content Container */}
            <div className={isList ? "grid grid-cols-1 lg:grid-cols-2 gap-2.5" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"}>
                {isLoading || (exercises.length > 0 && visibleCount === 0) ? (
                    Array.from({ length: 8 }).map((_, i) => (
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
                    ))
                ) : filtered.length === 0 ? (
                    <div className={`col-span-full flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] ${isDark ? 'border-[#333]' : 'border-[#DEDBD6]'}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm ${isDark ? 'bg-[#252525]' : 'bg-white'}`}>
                            <Search className={`w-6 h-6 ${isDark ? 'text-[#BABABA]' : 'text-[#252525]'}`} />
                        </div>
                        <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                        <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                            Generate your first exercise to get started.
                        </p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filtered.slice(0, visibleCount).map((ex: any, idx: number) => (
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
                                className={`group relative transition-all duration-200 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#7D7D7D]/40 dark:border-[#3C3C3C] hover:bg-[#F9F8F6] dark:hover:bg-[#1A1A1A] hover:border-[#D1CEC8] dark:hover:border-[#545454] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md cursor-pointer
                                    ${isList
                                        ? "flex flex-row items-center gap-4 p-3 rounded-xl h-auto"
                                        : "flex flex-col justify-between p-3.5 rounded-xl h-44"
                                    }`}
                            >
                                {isList ? (
                                    <>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getDifficultyBadge(ex.difficulty)}`}>
                                            <FileText size={15} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[14px] font-bold text-[#252525] dark:text-white truncate">
                                                {ex.title}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#7D7D7D] dark:text-[#BABABA]">
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
                                        {/* Header: Badge + delete */}
                                        <div className="flex items-start justify-between gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${getDifficultyBadge(ex.difficulty)}`}>
                                                {ex.difficulty}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(ex.id); }}
                                                className="lg:opacity-0 lg:group-hover:opacity-100 text-[#7D7D7D] hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>

                                        {/* Middle: Title & source */}
                                        <div className="flex-1 mt-1.5 overflow-hidden">
                                            <h3 className="text-[13px] font-bold text-[#252525] dark:text-white leading-tight line-clamp-2 group-hover:text-black dark:group-hover:text-white" title={ex.title}>
                                                {ex.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#7D7D7D] dark:text-[#BABABA]">
                                                <FileText size={10} className="shrink-0" />
                                                <span className="truncate" title={ex.notes?.title}>{ex.notes?.title || "Unknown source"}</span>
                                            </div>
                                        </div>

                                        {/* Footer Section */}
                                        <div className={`mt-3 pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-[#7D7D7D]/20' : 'border-[#7D7D7D]/40'}`}>
                                            <div className="flex flex-col">
                                                <p className={`text-[11px] font-bold flex items-center gap-1 ${getStatusStyle(ex.status)}`}>
                                                    {ex.status}
                                                    {ex.score !== null && ex.score !== undefined && (
                                                        <span className="opacity-50">· {ex.score}%</span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#BABABA]">
                                                    <Clock size={10} />
                                                    <span>{formatDate(ex.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${isDark ? 'bg-white/5 border-white/10 text-[#BABABA]' : 'bg-[#F0EDE8] border-[#7D7D7D]/20 text-[#545454]'}`}>
                                                {ex.questions?.length || 5} Qns
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
