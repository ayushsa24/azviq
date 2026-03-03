"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { BookOpen, Trash2, Clock, FileText, HelpCircle, Key } from "lucide-react";

interface RevisionTabProps {
    search?: string;
    onNeedCreate?: () => void;
    refreshKey?: number;
    onOpenRevision?: (revision: any) => void;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RevisionTab({ search = "", onNeedCreate, refreshKey, onOpenRevision }: RevisionTabProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [revisions, setRevisions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRevisions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/revision");
            if (res.ok) {
                const data = await res.json();
                setRevisions(data.revisions || []);
            }
        } catch (e) {
            console.error("Failed to fetch revisions:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRevisions(); }, [refreshKey]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this revision?")) return;
        const res = await fetch(`/api/revision/${id}`, { method: "DELETE" });
        if (res.ok) setRevisions(prev => prev.filter(r => r.id !== id));
    };

    const filtered = revisions.filter(r =>
        !search || r.title?.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return <div className="py-16 flex justify-center text-sm text-[#7D7D7D]">Loading revisions…</div>;
    }

    if (filtered.length === 0) {
        return (
            <div className={`py-16 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-2xl ${isDark ? "border-[#333]" : "border-[#E8E5E0]"}`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
                    <BookOpen className="w-7 h-7 text-[#7D7D7D]" />
                </div>
                <h3 className="text-base font-bold text-[#252525] dark:text-[#CFCFCF] mb-1">No Revisions Yet</h3>
                <p className="text-sm text-[#545454] dark:text-[#7D7D7D] max-w-xs">
                    Create your first revision session using the button next to the search bar.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((rev) => (
                <div
                    key={rev.id}
                    className={`group relative p-5 rounded-xl border flex flex-col gap-3 transition-all cursor-pointer ${isDark
                        ? "bg-[#CFCFCF]/10 border-[#7D7D7D]/30 hover:border-[#444] hover:bg-[#CFCFCF]/20"
                        : "bg-white border-[#E8E5E0] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-[#D1D1D1] hover:bg-[#F9F8F6]"
                        }`}
                    onClick={() => onOpenRevision?.(rev)}
                >
                    {/* Delete button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(rev.id); }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[#7D7D7D] hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Trash2 size={14} />
                    </button>

                    {/* Icon + Title */}
                    <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
                            <BookOpen className="w-4 h-4 text-[#545454] dark:text-[#7D7D7D]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-[#252525] dark:text-[#CFCFCF] line-clamp-2 leading-snug">
                                {rev.title}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#7D7D7D]">
                                <FileText size={10} className="shrink-0" />
                                <span className="truncate">{rev.notes?.title || "Unknown source"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-[#252525] text-[#7D7D7D]" : "bg-[#F0EDE8] text-[#545454]"}`}>
                            <Key size={9} /> {rev.keywords?.length || 0} keywords
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isDark ? "bg-[#252525] text-[#7D7D7D]" : "bg-[#F0EDE8] text-[#545454]"}`}>
                            <HelpCircle size={9} /> {rev.qa_pairs?.length || 0} Q&A
                        </span>
                    </div>

                    {/* Footer */}
                    <div className={`flex items-center justify-between pt-2 border-t text-xs text-[#7D7D7D] ${isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
                        <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(rev.created_at)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? "bg-[#252525] text-[#CFCFCF]" : "bg-[#252525]/5 text-[#252525]"}`}>Open →</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
