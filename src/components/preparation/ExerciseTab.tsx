"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { FileText, Plus, Trash2, Clock } from "lucide-react";

interface ExerciseTabProps {
    search?: string;
    onNeedGenerate?: () => void;
    refreshKey?: number;
    onStartExercise?: (exercise: any) => void;
}

export default function ExerciseTab({ search = "", onNeedGenerate, refreshKey, onStartExercise }: ExerciseTabProps) {
    const { theme } = useTheme();
    const [exercises, setExercises] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isDark = theme === 'dark';

    const fetchExercises = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/exercises");
            if (res.ok) {
                const data = await res.json();
                setExercises(data.exercises || []);
            }
        } catch (error) {
            console.error("Failed to fetch exercises:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchExercises(); }, [refreshKey]);

    // Expose fetchExercises so parent can call after generate
    useEffect(() => {
        (window as any).__refetchExercises = fetchExercises;
        return () => { delete (window as any).__refetchExercises; };
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this exercise?")) return;
        try {
            const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
            if (res.ok) setExercises(prev => prev.filter(ex => ex.id !== id));
        } catch (error) {
            console.error("Failed to delete exercise:", error);
        }
    };

    const getDifficultyBadge = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
            case 'easy': return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
            case 'hard': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
            default: return 'bg-[#F0EDE8] text-[#545454] dark:bg-[#CFCFCF]/10 dark:text-[#CFCFCF]';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-green-600 dark:text-green-400';
            default: return 'text-[#7D7D7D] dark:text-[#545454]';
        }
    };

    const filtered = exercises.filter(ex =>
        !search || ex.title?.toLowerCase().includes(search.toLowerCase()) || ex.notes?.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-4">


            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isLoading ? (
                    <div className="col-span-full py-16 flex justify-center text-sm text-[#7D7D7D]">Loading exercises…</div>
                ) : filtered.length === 0 ? (
                    <div className={`col-span-full py-14 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl ${isDark ? 'border-[#333]' : 'border-[#E8E5E0]'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-[#252525]' : 'bg-[#F0EDE8]'}`}>
                            <FileText className="w-7 h-7 text-[#7D7D7D]" />
                        </div>
                        <h3 className="text-base font-bold text-[#252525] dark:text-[#CFCFCF] mb-1">No Exercises Yet</h3>
                        <p className="text-sm text-[#545454] dark:text-[#7D7D7D] max-w-xs">
                            Generate your first exercise using the button next to the search bar to test your knowledge.
                        </p>
                    </div>
                ) : filtered.map((ex: any) => (
                    <div
                        key={ex.id}
                        className={`group relative p-5 rounded-xl border flex flex-col gap-3 transition-all ${isDark
                            ? 'bg-[#CFCFCF]/10 border-[#7D7D7D]/30 hover:border-[#444] hover:bg-[#CFCFCF]/20'
                            : 'bg-white border-[#E8E5E0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#D1D1D1] hover:bg-[#F9F8F6]'
                            }`}
                    >
                        {/* Badge + delete */}
                        <div className="flex items-start justify-between gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${getDifficultyBadge(ex.difficulty)}`}>
                                {ex.difficulty}
                            </span>
                            <button
                                onClick={() => handleDelete(ex.id)}
                                className="opacity-0 group-hover:opacity-100 text-[#7D7D7D] hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Title & source */}
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-black dark:group-hover:text-white" title={ex.title}>
                                {ex.title}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-[#545454] dark:text-[#7D7D7D]">
                                <FileText size={11} className="shrink-0" />
                                <span className="truncate" title={ex.notes?.title}>{ex.notes?.title || "Unknown source"}</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-[#7D7D7D]/20' : 'border-[#E8E5E0]'}`}>
                            <div>
                                <p className={`text-xs font-medium ${getStatusStyle(ex.status)}`}>
                                    {ex.status}{ex.score !== null && ex.score !== undefined && ` · ${ex.score}%`}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-[#7D7D7D]">
                                    <Clock size={11} />
                                    <span>{ex.questions?.length || 5} questions</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onStartExercise?.(ex)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${ex.status === 'Completed'
                                    ? 'bg-[#F0EDE8] dark:bg-[#CFCFCF]/10 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E8E5E0] dark:hover:bg-[#CFCFCF]/20 border border-[#DEDBD6] dark:border-[#545454]'
                                    : 'bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white'
                                    }`}
                            >
                                {ex.status === 'Not Started' ? 'Start' : ex.status === 'Completed' ? 'Review' : 'Continue'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
