"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Trash2, Clock, FileText, Search } from "lucide-react";
import { ICON_MAP } from "@/components/editor/EmojiPicker";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppDialog } from "@/components/ui/AppDialog";

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
    const dialog = useAppDialog();

    const { data, mutate, isLoading } = useSWR(refreshKey ? `/api/revision?refresh=${refreshKey}` : "/api/revision", fetcher);
    const revisions = data?.revisions || [];


    const handleDelete = async (id: string) => {
        if (!await dialog.showConfirm({ title: "Move to Trash?", message: "This revision will be moved to Trash and permanently deleted after 7 days.", confirmLabel: "Move to Trash", cancelLabel: "Cancel", type: "warning" })) return;

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

    return (
        <div className="flex-1 flex flex-col w-full min-h-0 bg-transparent">
            {isLoading ? (
                <div className={isList ? "grid grid-cols-1 lg:grid-cols-3 gap-3" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`rounded-xl border flex animate-pulse ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-[#E8E5E0]'} ${isList ? 'flex-row items-center p-3 gap-4 h-[72px]' : 'flex-col p-3.5 gap-3 h-44'}`}>
                            {isList ? (
                                <>
                                    <div className={`w-10 h-10 rounded-full shrink-0 ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`}></div>
                                        <div className={`h-3 w-1/4 rounded mt-2 ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`}></div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col h-full w-full">
                                    <div className="flex justify-end">
                                        <div className={`h-5 w-14 rounded ${isDark ? 'bg-white/10' : 'bg-[#252525]/10'}`} />
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`} />
                                    </div>
                                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#545454]/30' : 'border-[#E8E5E0]'} space-y-2`}>
                                        <div className={`h-4 w-full rounded ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`} />
                                        <div className="flex justify-between items-center">
                                            <div className={`h-3 w-1/3 rounded ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`} />
                                            <div className={`h-3 w-1/4 rounded ${isDark ? 'bg-white/10' : 'bg-[#F0EDE8]'}`} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className={`w-full flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] ${isDark ? "border-[#333]" : "border-[#DEDBD6]"}`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm ${isDark ? "bg-[#252525]" : "bg-white"}`}>
                        <Search className={`w-6 h-6 ${isDark ? "text-[#BABABA]" : "text-[#252525]"}`} />
                    </div>
                    <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                    <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                        Create your first revision to get started.
                    </p>
                </div>
            ) : (
                <motion.div 
                    layout
                    className={isList ? "grid grid-cols-1 lg:grid-cols-3 gap-3 w-full" : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full"}
                >
                    <AnimatePresence mode="popLayout">
                        {filtered.map((rev: any) => (
                            <motion.div
                                key={rev.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                onClick={() => onOpenRevision?.(rev)}
                                className={`group relative cursor-pointer bg-white dark:bg-white/5 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow duration-200
                                    ${isList
                                        ? "flex flex-row items-center gap-4 py-3 px-4 rounded-xl h-auto"
                                        : "flex flex-col justify-between p-3 rounded-xl h-44"
                                    }`}
                            >
                                <h3 className="sr-only">{rev.title}</h3>
                                {isList ? (
                                    <>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-white/10" : "bg-[#F0EDE8]"} text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors`}>
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors truncate flex items-center gap-1.5">
                                                <span>{rev.title.replace(/^\[\w+\]\s*/, "")}</span>
                                                {(() => {
                                                    const iconMatch = rev.title.match(/^\[(\w+)\]/);
                                                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                                        const IconComp = ICON_MAP[iconMatch[1]];
                                                        return <IconComp size={14} className="opacity-40 shrink-0" strokeWidth={1.5} />;
                                                    }
                                                    return null;
                                                })()}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#BABABA]">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(rev.created_at)}</span>
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
                                        {/* Top Badge Overlay */}
                                        <div className="absolute top-3 right-3 z-10 transition-all">
                                            <div className="rounded shadow-sm bg-[#252525] dark:bg-white text-white dark:text-[#252525] text-[0.5rem] sm:text-[0.625rem] px-1 py-0 sm:px-1.5 sm:py-0.5 font-bold uppercase transform-gpu">
                                                REVISION
                                            </div>
                                        </div>

                                        {/* Center Icon */}
                                        <div className="flex-1 flex items-center justify-center py-1 overflow-hidden">
                                            <div className="relative">
                                                <BookOpen className="w-10 h-10 text-[#545454] dark:text-[#7D7D7D] group-hover:text-black dark:group-hover:text-white transition-all duration-300 transform group-hover:scale-110" strokeWidth={1.5} />
                                            </div>
                                        </div>

                                        {/* Bottom Metadata (matches NoteCard style) */}
                                        <div className={`mt-3 pt-3 border-t border-[#E8E5E0] dark:border-[#7D7D7D]/20 transition-colors`}>
                                            <h3 className="text-sm font-semibold truncate text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1.5" title={rev.title}>
                                                <span>{rev.title.replace(/^\[\w+\]\s*/, "")}</span>
                                                {(() => {
                                                    const iconMatch = rev.title.match(/^\[(\w+)\]/);
                                                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                                        const IconComp = ICON_MAP[iconMatch[1]];
                                                        return <IconComp className="w-4 h-4 opacity-40 shrink-0" strokeWidth={1.5} />;
                                                    }
                                                    return null;
                                                })()}
                                            </h3>

                                            <div className="flex items-center justify-between text-[0.625rem] w-full text-[#545454] dark:text-[#BABABA]">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1 mt-0.5 opacity-60">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>{formatDate(rev.created_at)}</span>
                                                    </div>
                                                </div>
                                                
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(rev.id); }}
                                                    className="p-1.5 rounded-lg text-[#7D7D7D] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all lg:opacity-0 lg:group-hover:opacity-100"
                                                    title="Delete Revision"
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
