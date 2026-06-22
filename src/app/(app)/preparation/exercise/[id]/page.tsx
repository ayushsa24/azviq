"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, PanelLeft } from "lucide-react";
import TakeExercisePage from "@/components/preparation/TakeExercisePage";
import { logRecentActivity } from "@/lib/logRecentActivity";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";

function ExercisePageSkeleton({ onBack }: { onBack: () => void }) {
    const { theme } = useTheme();
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();
    const isDark = theme === "dark";
    
    const bgCls = isDark ? "bg-[#2A2A2A]" : "bg-[#E8E5E0]";
    const cardBgCls = isDark ? "bg-[#1E1E1E]" : "bg-white";

    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1E1E1E] overflow-hidden">
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 px-4 h-14 bg-white dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E] transition-colors">
                {!sidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                        title="Open Sidebar"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </button>
                )}
                <button
                    onClick={onBack}
                    className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 min-w-0" />


            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: Question + Options */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="px-4 sm:px-8 py-5 max-w-2xl flex flex-col gap-6">
                        
                        {/* Question label */}
                        <div className={`w-24 h-3 rounded-md animate-pulse ${bgCls} opacity-60`} />

                        {/* Question text */}
                        <div className="space-y-2">
                            <div className={`w-full h-5 rounded-md animate-pulse ${bgCls}`} />
                            <div className={`w-3/4 h-5 rounded-md animate-pulse ${bgCls}`} />
                        </div>

                        {/* Options */}
                        <div className="flex flex-col gap-3">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-full p-4 rounded-xl border flex items-center gap-3 animate-pulse ${isDark ? 'bg-[#1E1E1E] border-[#2E2E2E]' : 'bg-white border-[#7D7D7D]/20'}`}>
                                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${isDark ? 'border-[#545454]' : 'border-[#E8E5E0]'}`} />
                                    <div className={`w-4 h-3 rounded-md opacity-40 ${bgCls}`} />
                                    <div className={`w-1/2 h-4 rounded-md ${bgCls}`} />
                                </div>
                            ))}
                        </div>

                        {/* Nav Buttons */}
                        <div className="flex justify-between items-center mt-4">
                            <div className={`w-28 h-10 rounded-full animate-pulse ${bgCls} opacity-40`} />
                            <div className={`w-36 h-10 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-[#252525]'} opacity-20`} />
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR (Desktop) */}
                <div className={`hidden md:flex flex-col w-60 lg:w-64 shrink-0 border-l ${isDark ? 'border-[#2E2E2E] bg-[#161616]' : 'border-[#7D7D7D]/40 bg-white'}`}>
                    {/* Progress (top) */}
                    <div className={`p-4 border-b ${isDark ? 'border-[#2E2E2E]' : 'border-[#7D7D7D]/40'} space-y-4`}>
                        <div className="flex justify-between">
                            <div className={`w-12 h-3 rounded-md ${bgCls} opacity-40`} />
                            <div className={`w-8 h-3 rounded-md ${bgCls} opacity-40`} />
                        </div>
                        <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-[#2E2E2E]' : 'bg-[#E8E5E0]'}`} />
                        <div className={`w-20 h-3 rounded-md ${bgCls} opacity-40`} />
                    </div>

                    {/* Question grid */}
                    <div className="p-4 flex-1">
                        <div className={`w-24 h-3 rounded-md mb-4 ${bgCls} opacity-40`} />
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className={`w-full aspect-square rounded-lg animate-pulse ${isDark ? 'bg-[#252525]' : 'bg-[#F0EDE8]'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Bottom action */}
                    <div className={`p-4 border-t ${isDark ? 'border-[#2E2E2E]' : 'border-[#7D7D7D]/40'}`}>
                         <div className={`w-full h-10 rounded-xl animate-pulse ${isDark ? 'bg-[#333]' : 'bg-[#E8E5E0]'}`} />
                    </div>
                </div>
            </div>

            {/* Mobile bottom strip */}
            <div className={`md:hidden flex items-center gap-2 px-4 py-3 border-t shrink-0 ${isDark ? 'border-[#2E2E2E] bg-[#161616]' : 'border-[#7D7D7D]/40 bg-white'}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg animate-pulse shrink-0 ${isDark ? 'bg-[#252525]' : 'bg-[#F0EDE8]'}`} />
                ))}
            </div>
        </div>
    );
}

export default function ExercisePage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [exercise, setExercise] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleBack = () => {
        if (window.history.length > 2) {
            router.back();
        } else {
            router.push("/dashboard");
        }
    };

    useEffect(() => {
        async function fetchExercise() {
            try {
                const res = await fetch(`/api/exercises/${id}`);
                if (!res.ok) throw new Error("Not found");
                const data = await res.json();
                if (data.exercise) {
                    setExercise(data.exercise);
                    logRecentActivity({
                        item_id: data.exercise.id,
                        item_type: "exercise",
                        title: data.exercise.title || "Untitled Exercise",
                        href: `/preparation/exercise/${data.exercise.id}`,
                    });
                } else {
                    handleBack();
                }
            } catch {
                handleBack();
            } finally {
                setIsLoading(false);
            }
        }
        fetchExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (isLoading) {
        return <ExercisePageSkeleton onBack={handleBack} />;
    }

    if (!exercise) return null;

    return (
        <TakeExercisePage
            exercise={exercise}
            onBack={handleBack}
            onComplete={handleBack}
        />
    );
}
