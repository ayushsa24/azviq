"use client";

import { useState, useEffect } from "react";
import { BookOpen, Trash2, Clock, FileText, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { useTheme } from "@/contexts/ThemeContext";

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface RevisionTabProps {
    search?: string;
    onNeedCreate?: () => void;
    refreshKey?: number;
    onOpenRevision?: (revision: any) => void;
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

export default function RevisionTab({ search = "", onNeedCreate, refreshKey, onOpenRevision, viewMode = "grid" }: RevisionTabProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const isList = viewMode === "list";

    const { data, mutate, isLoading } = useSWR("/api/revision", fetcher);
    const revisions = data?.revisions || [];

    // Sequential loading logic
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        if (!isLoading && revisions.length > 0) {
            const timer = setInterval(() => {
                setVisibleCount(prev => {
                    if (prev >= revisions.length) {
                        clearInterval(timer);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 50);
            return () => clearInterval(timer);
        } else if (!isLoading && revisions.length === 0) {
            setVisibleCount(0);
        }
    }, [isLoading, revisions.length]);

    useEffect(() => {
        setVisibleCount(0);
        mutate();
    }, [refreshKey, mutate]);


    const handleDelete = async (id: string) => {
        if (!confirm("Delete this revision?")) return;

        // Optimistic update
        mutate((current: any) => ({
            ...current,
            revisions: current.revisions.filter((r: any) => r.id !== id)
        }), false);

        try {
            const res = await fetch(`/api/revision/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            mutate();
        } catch (e) {
            console.error("Failed to delete revision:", e);
            mutate(); // Rollback
        }
    };

    const filtered = revisions.filter((r: any) =>
        !search || r.title?.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className={isList ? "flex flex-col gap-2.5" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`rounded-xl border flex animate-pulse ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-[#E8E5E0]'} ${isList ? 'flex-row items-center p-3 gap-4 h-[72px]' : 'flex-col p-5 gap-3'}`}>
                        {isList ? (
                            <>
                                <div className={`w-8 h-8 rounded-lg shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#E8E5E0]'}`}></div>
                                <div className="flex-1">
                                    <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    <div className={`h-3 w-1/4 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-xl shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#E8E5E0]'}`}></div>
                                    <div className="flex-1">
                                        <div className={`h-5 w-3/4 rounded mt-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                        <div className={`h-3 w-1/2 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    </div>
                                </div>
                                <div className="mt-2 flex gap-4">
                                    <div className={`h-4 w-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    <div className={`h-4 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col flex-1 h-full">
                <div className={`flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] ${isDark ? "border-[#333]" : "border-[#DEDBD6]"}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm ${isDark ? "bg-[#252525]" : "bg-white"}`}>
                        <Search className={`w-6 h-6 ${isDark ? "text-[#BABABA]" : "text-[#252525]"}`} />
                    </div>
                    <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                    <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                        Create your first revision to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={isList ? "grid grid-cols-1 lg:grid-cols-2 gap-2.5" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"}>
            {isLoading || (revisions.length > 0 && visibleCount === 0) ? (
                Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`rounded-xl border flex animate-pulse ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-[#E8E5E0]'} ${isList ? 'flex-row items-center p-3 gap-4 h-[72px]' : 'flex-col p-5 gap-3'}`}>
                        {isList ? (
                            <>
                                <div className={`w-8 h-8 rounded-lg shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#E8E5E0]'}`}></div>
                                <div className="flex-1">
                                    <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    <div className={`h-3 w-1/4 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 rounded-xl shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#E8E5E0]'}`}></div>
                                    <div className="flex-1">
                                        <div className={`h-5 w-3/4 rounded mt-1 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                        <div className={`h-3 w-1/2 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    </div>
                                </div>
                                <div className="mt-2 flex gap-4">
                                    <div className={`h-4 w-12 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                    <div className={`h-4 w-16 rounded ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                </div>
                            </>
                        )}
                    </div>
                ))
            ) : filtered.length === 0 ? (
                <div className="col-span-full flex flex-col flex-1 h-full">
                    <div className={`flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] ${isDark ? "border-[#333]" : "border-[#DEDBD6]"}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm ${isDark ? "bg-[#252525]" : "bg-white"}`}>
                            <Search className={`w-6 h-6 ${isDark ? "text-[#BABABA]" : "text-[#252525]"}`} />
                        </div>
                        <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                        <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                            Create your first revision to get started.
                        </p>
                    </div>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    {filtered.slice(0, visibleCount).map((rev: any) => (
                        <motion.div
                            key={rev.id}
                            layout
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ 
                                duration: 0.25, 
                                ease: [0.23, 1, 0.32, 1]
                            }}
                            onClick={() => onOpenRevision?.(rev)}
                            className={`group relative transition-all duration-200 cursor-pointer bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#7D7D7D]/40 dark:border-[#3C3C3C] hover:bg-[#F9F8F6] dark:hover:bg-[#1A1A1A] hover:border-[#D1CEC8] dark:hover:border-[#545454] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
                                ${isList
                                    ? "flex flex-row items-center gap-4 p-3 rounded-xl h-auto"
                                    : "flex flex-col justify-between p-3.5 rounded-xl h-44"
                                }`}
                        >
                            {isList ? (
                                <>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
                                        <BookOpen className="w-3.5 h-3.5 text-[#545454] dark:text-[#7D7D7D]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[14px] font-bold text-[#252525] dark:text-white truncate">
                                            {rev.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#7D7D7D] dark:text-[#BABABA]">
                                            <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(rev.created_at)}</span>
                                            <span className="font-bold text-[#252525] dark:text-white">
                                                Revision
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pr-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(rev.id); }}
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
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${isDark ? "bg-white/5 text-[#BABABA]" : "bg-[#F0EDE8] text-[#545454]"}`}>
                                            Revision
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(rev.id); }}
                                            className="lg:opacity-0 lg:group-hover:opacity-100 text-[#7D7D7D] hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>

                                    {/* Middle: Title & source */}
                                    <div className="flex-1 mt-1.5 overflow-hidden">
                                        <h3 className="text-[13px] font-bold text-[#252525] dark:text-white leading-tight line-clamp-2 group-hover:text-black dark:group-hover:text-white" title={rev.title}>
                                            {rev.title}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#7D7D7D] dark:text-[#BABABA]">
                                            <FileText size={10} className="shrink-0" />
                                            <span className="truncate" title={rev.notes?.title}>{rev.notes?.title || "Unknown source"}</span>
                                        </div>
                                    </div>

                                    {/* Footer Section */}
                                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between ${isDark ? 'border-[#7D7D7D]/20' : 'border-[#7D7D7D]/40'}`}>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[10px] font-bold ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
                                                    Tap to study
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#BABABA]">
                                                <Clock size={10} />
                                                <span>{formatDate(rev.created_at)}</span>
                                            </div>
                                        </div>
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                            </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
    );
}
