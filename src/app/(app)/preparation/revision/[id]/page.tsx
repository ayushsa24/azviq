"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, BookOpen, Key, HelpCircle } from "lucide-react";
import TakeRevisionPage from "@/components/preparation/TakeRevisionPage";
import { logRecentActivity } from "@/lib/logRecentActivity";
import { useTheme } from "@/contexts/ThemeContext";

function RevisionPageSkeleton({ onBack }: { onBack: () => void }) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    
    const bgCls = isDark ? "bg-[#2A2A2A]" : "bg-[#E8E5E0]";
    const cardBgCls = isDark ? "bg-[#252525]" : "bg-white";

    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] overflow-hidden">
            <div className={`flex items-center gap-1.5 sm:gap-3 px-4 sm:px-6 pt-1 sm:pt-3 pb-3 border-b shrink-0 ${isDark ? "border-[#333] bg-[#1A1A1A]" : "border-[#E8E5E0] bg-[#F5F3EF]"}`}>
                <button
                    onClick={onBack}
                    className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0
                      ${isDark ? 'hover:bg-[#333] text-white' : 'hover:bg-[#E8E5E0] text-[#252525]'}`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                    <h1 className={`font-bold text-lg sm:text-xl truncate ${isDark ? 'text-white' : 'text-[#252525]'}`}>
                        Revision
                    </h1>
                    <div className={`w-24 h-6 rounded-full animate-pulse opacity-40 ${isDark ? 'bg-[#333]' : 'bg-[#E8E5E0]'}`} />
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div className={`flex border-b shrink-0 px-4 sm:px-6 ${isDark ? "border-[#333] bg-[#1A1A1A]" : "border-[#E8E5E0] bg-[#F5F3EF]"}`}>
                {[
                    { icon: <BookOpen size={13} />, label: "Summary" },
                    { icon: <Key size={13} />, label: "Keywords" },
                    { icon: <HelpCircle size={13} />, label: "Q&A" }
                ].map((tab, i) => (
                    <div key={i} className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 ${i === 0 ? 'border-[#252525] dark:border-white' : 'border-transparent'}`}>
                        <div className="text-[#7D7D7D]">{tab.icon}</div>
                        <div className={`w-14 h-3 rounded-md animate-pulse ${bgCls} opacity-60`} />
                    </div>
                ))}
            </div>

            {/* ── Content (Summary view skeleton) ── */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
                    <div className={`p-5 sm:p-6 rounded-2xl border ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white border-[#7D7D7D]/20 shadow-sm"} animate-pulse`}>
                        {/* Summary label */}
                        <div className={`w-32 h-3 rounded-md mb-8 ${bgCls} opacity-40`} />
                        
                        {/* Title line */}
                        <div className={`w-48 h-6 rounded-md mb-6 ${bgCls}`} />

                        {/* Text lines */}
                        <div className="space-y-4">
                            <div className={`w-full h-4 rounded-md ${bgCls} opacity-60`} />
                            <div className={`w-[95%] h-4 rounded-md ${bgCls} opacity-60`} />
                            <div className={`w-[98%] h-4 rounded-md ${bgCls} opacity-60`} />
                            <div className={`w-[80%] h-4 rounded-md ${bgCls} opacity-60`} />
                            
                            <div className="h-4" /> {/* Spacer */}
                            
                            <div className={`w-[40%] h-5 rounded-md ${bgCls}`} />
                            <div className={`w-full h-4 rounded-md ${bgCls} opacity-60`} />
                            <div className={`w-[90%] h-4 rounded-md ${bgCls} opacity-60`} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RevisionPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [revision, setRevision] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleBack = () => {
        if (window.history.length > 2) {
            router.back();
        } else {
            router.push("/dashboard");
        }
    };

    useEffect(() => {
        async function fetchRevision() {
            try {
                const res = await fetch(`/api/revision/${id}`);
                if (!res.ok) throw new Error("Not found");
                const data = await res.json();
                if (data.revision) {
                    setRevision(data.revision);
                    logRecentActivity({
                        item_id: data.revision.id,
                        item_type: "revision",
                        title: data.revision.title || "Untitled Revision",
                        href: `/preparation/revision/${data.revision.id}`,
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
        fetchRevision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (isLoading) {
        return <RevisionPageSkeleton onBack={handleBack} />;
    }

    if (!revision) return null;

    return (
        <TakeRevisionPage
            revision={revision}
            onBack={handleBack}
        />
    );
}
