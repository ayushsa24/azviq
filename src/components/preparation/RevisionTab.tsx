"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { RefreshCw, TrendingUp, Play, Clock, Calendar, Search, BookOpen } from "lucide-react";

interface RevisionTabProps {
    search?: string;
}

export default function RevisionTab({ search = "" }: RevisionTabProps) {
    const { theme } = useTheme();
    const [todayRevisions, setTodayRevisions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isDark = theme === 'dark';

    React.useEffect(() => {
        const fetchRevisions = async () => {
            try {
                setIsLoading(true);
                const res = await fetch("/api/notes");
                if (res.ok) {
                    const data = await res.json();
                    const sorted = (data.notes || [])
                        .sort((a: any, b: any) => (a.retention_score || 0) - (b.retention_score || 0))
                        .slice(0, 4);
                    setTodayRevisions(sorted);
                }
            } catch (error) {
                console.error("Failed to fetch notes for revision:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRevisions();
    }, []);

    const getRetentionBarColor = (score: number) => {
        if (!score || score < 40) return 'bg-red-500';
        if (score < 70) return 'bg-[#7D7D7D]';
        return 'bg-green-500';
    };

    const filtered = todayRevisions.filter(n =>
        !search || n.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-8">

            {/* Today's Revisions */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <RefreshCw className="text-[#545454] dark:text-[#7D7D7D] w-4 h-4" />
                    <h2 className="text-sm font-semibold text-[#252525] dark:text-[#CFCFCF] uppercase tracking-widest">Today's Revisions</h2>
                    <span className="ml-auto text-xs text-[#7D7D7D]">sorted by retention</span>
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center text-sm text-[#7D7D7D]">Loading revisions…</div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filtered.map((rev) => {
                            const score = rev.retention_score || 0;
                            return (
                                <div
                                    key={rev.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${isDark
                                        ? 'bg-[#CFCFCF]/10 border-[#7D7D7D]/30 hover:border-[#444] hover:bg-[#CFCFCF]/20'
                                        : 'bg-white border-[#E8E5E0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#D1D1D1] hover:bg-[#F9F8F6]'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#252525]' : 'bg-[#F0EDE8]'}`}>
                                        <BookOpen className="w-4 h-4 text-[#545454] dark:text-[#7D7D7D]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-black dark:group-hover:text-white" title={rev.title}>{rev.title}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-[#333]' : 'bg-[#E8E5E0]'} overflow-hidden`}>
                                                <div className={`h-full rounded-full transition-all ${getRetentionBarColor(score)}`} style={{ width: `${score || 5}%` }} />
                                            </div>
                                            <span className="text-xs font-medium text-[#545454] dark:text-[#7D7D7D] shrink-0">{score}%</span>
                                        </div>
                                    </div>
                                    <button className={`w-9 h-9 flex items-center justify-center rounded-full transition-all shrink-0 border ${isDark
                                        ? 'bg-[#252525] border-[#545454] text-[#7D7D7D] hover:bg-[#CFCFCF] hover:text-[#252525] hover:border-[#CFCFCF]'
                                        : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#545454] hover:bg-[#252525] hover:text-white hover:border-[#252525]'
                                        }`}>
                                        <Play className="w-3.5 h-3.5 ml-0.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`py-12 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center ${isDark ? 'border-[#333]' : 'border-[#E8E5E0]'}`}>
                        <RefreshCw className="w-7 h-7 text-[#CFCFCF] dark:text-[#545454] mb-3" />
                        <p className="text-sm font-medium text-[#545454] dark:text-[#7D7D7D]">All caught up for today!</p>
                    </div>
                )}
            </section>

            {/* Weekly Power Session */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-[#545454] dark:text-[#7D7D7D] w-4 h-4" />
                    <h2 className="text-sm font-semibold text-[#252525] dark:text-[#CFCFCF] uppercase tracking-widest">Weekly Power Session</h2>
                </div>

                <div className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-5 transition-all ${isDark
                    ? 'bg-[#CFCFCF]/10 border-[#7D7D7D]/30 hover:border-[#444] hover:bg-[#CFCFCF]/20'
                    : 'bg-white border-[#E8E5E0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#D1D1D1]'
                    }`}>
                    <div className="flex-1 space-y-1.5">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Spaced Repetition Review</h3>
                        <p className="text-sm text-[#545454] dark:text-[#7D7D7D] leading-relaxed max-w-md">
                            An AI-curated mix of weak topics from your notes this week.
                        </p>
                        <div className="flex items-center gap-4 text-xs font-medium text-[#545454] dark:text-[#7D7D7D] pt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> ~15 mins</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Weekly recommended</span>
                        </div>
                    </div>
                    <button className="px-5 py-2.5 rounded-full bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white text-sm font-medium transition-all shadow-sm whitespace-nowrap shrink-0">
                        Start Session
                    </button>
                </div>
            </section>

            {/* Select specific note */}
            <section>
                <button className={`w-full p-4 rounded-xl border-2 border-dashed font-medium text-sm transition-all flex items-center justify-center gap-2 ${isDark
                    ? 'border-[#333] text-[#7D7D7D] hover:text-[#CFCFCF] hover:border-[#545454] hover:bg-[#CFCFCF]/5'
                    : 'border-[#E8E5E0] text-[#545454] hover:text-[#252525] hover:border-[#D1D1D1] hover:bg-[#F9F8F6]'
                    }`}>
                    <Search size={15} />
                    Select a specific Note or PDF to revise
                </button>
            </section>
        </div>
    );
}
