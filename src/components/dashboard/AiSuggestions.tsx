"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sparkles, ArrowRight, Loader2, Target, CalendarDays, BrainCircuit, Clock, CheckCircle2, Circle, ChevronDown } from "lucide-react";
import Link from "next/link";
import useSWR, { mutate } from "swr";

interface AiSuggestion {
    id: string;
    suggestion_type: "short_study" | "weak_topic" | "spaced_revision" | "missed_revision";
    title: string;
    description: string;
    action_type: string;
    action_label: string;
    multiple_actions?: { id: string; action_type: string; action_label: string; status: string }[];
}

export default function AiSuggestions() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { data, isLoading: suggestionsLoading } = useSWR("/api/suggestions");
    const suggestions = (data?.suggestions || []) as AiSuggestion[];
    
    const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});

    const updateItemStatus = async (suggestionId: string, itemId: string, newStatus: string) => {
        const originalData = data;
        const updatedSuggestions = suggestions.map(s => {
            if (s.id === suggestionId && s.multiple_actions) {
                return {
                    ...s,
                    multiple_actions: s.multiple_actions.map(act => 
                        act.id === itemId ? { ...act, status: newStatus } : act
                    )
                };
            }
            return s;
        });

        mutate("/api/suggestions", { suggestions: updatedSuggestions }, false);

        try {
            const res = await fetch("/api/suggestions", {
                method: "PATCH",
                body: JSON.stringify({ itemId, status: newStatus }),
                headers: { "Content-Type": "application/json" }
            });
            if (!res.ok) throw new Error("Failed to update");
            mutate("/api/suggestions");
        } catch (err) {
            console.error(err);
            mutate("/api/suggestions", originalData, false);
        }
    };

    const toggleHistory = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowHistory(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (suggestionsLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>AI Suggestions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:items-stretch">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex flex-col p-5 rounded-2xl border ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white border-[#CFCFCF]"} animate-pulse h-[200px] md:h-[365px]`}>
                            <div className="flex items-start gap-3 mb-3">
                                <div className={`w-9 h-9 rounded-xl shrink-0 ${isDark ? "bg-[#383838]" : "bg-[#E8E5E0]"}`}></div>
                                <div className={`h-4 mt-2 w-24 rounded-full ${isDark ? "bg-[#383838]" : "bg-[#E8E5E0]"}`}></div>
                            </div>
                            <div className="space-y-2 mt-2">
                                <div className={`h-3 w-full rounded-full ${isDark ? "bg-[#383838]" : "bg-[#E8E5E0]"}`}></div>
                                <div className={`h-3 w-4/5 rounded-full ${isDark ? "bg-[#383838]" : "bg-[#E8E5E0]"}`}></div>
                            </div>
                            <div className={`mt-auto w-full h-10 rounded-xl ${isDark ? "bg-[#383838]" : "bg-[#E8E5E0]"}`}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case "short_study": return <Clock className="w-5 h-5 text-[#7D7D7D]" />;
            case "weak_topic": return <Target className="w-5 h-5 text-[#545454] dark:text-[#CFCFCF]" />;
            case "spaced_revision": return <BrainCircuit className="w-5 h-5 text-[#252525] dark:text-white" />;
            case "missed_revision": return <CalendarDays className="w-5 h-5 text-[#7D7D7D]" />;
            default: return <Sparkles className="w-5 h-5 text-[#545454] dark:text-[#CFCFCF]" />;
        }
    };

    return (
        <div className="w-full pb-0 md:pb-10">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>AI Suggestions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start md:items-stretch">
                {suggestions.map((suggestion) => {
                    const activeActions = suggestion.multiple_actions?.filter(act => act.status === 'active') || [];
                    const completedActions = suggestion.multiple_actions?.filter(act => act.status === 'completed') || [];
                    const isHistoryVisible = !!showHistory[suggestion.id];
                    const itemCount = (activeActions.length + (completedActions.length > 0 ? completedActions.length + 1 : 0));
                    
                    return (
                        <div
                            key={suggestion.id}
                            className={`group relative flex flex-col p-5 rounded-3xl border transition-all duration-200 
                                ${itemCount > 5 ? "min-h-[260px] max-h-[365px]" : "min-h-[180px] h-auto"} 
                                md:h-[365px] 
                                ${isDark
                                ? "bg-[#252525] border-[#545454] hover:bg-white/10 hover:border-[#444]"
                                : "bg-white border-[#CFCFCF] hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"
                                } shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md`}
                        >
                            {/* History Toggle */}
                            {suggestion.multiple_actions && completedActions.length > 0 && (
                                <button
                                    onClick={(e) => toggleHistory(suggestion.id, e)}
                                    className={`absolute top-3.5 right-3.5 z-10 p-2 rounded-xl transition-all shadow-sm border ${
                                        isHistoryVisible 
                                        ? isDark ? "bg-white text-[#252525] border-white" : "bg-[#252525] text-white border-[#252525]" 
                                        : isDark ? "bg-[#333] text-[#BABABA] border-[#444] hover:text-white" : "bg-[#F0EDE8] text-[#545454] border-[#E8E5E0] hover:text-[#252525]"
                                    }`}
                                    title={isHistoryVisible ? "Show active items" : "View completed history"}
                                >
                                    <ChevronDown className={`w-5 h-5 transition-transform duration-150 ${isHistoryVisible ? "rotate-180" : ""}`} />
                                </button>
                            )}

                            {/* Header Area - Fixed */}
                            <div className="mb-4">
                                <div className="flex items-start gap-3 mb-3 pr-8">
                                    <div className={`p-2 rounded-xl shrink-0 ${isDark ? "bg-[#1A1A1A]" : "bg-[#F5F3EF]"}`}>
                                        {getIcon(suggestion.suggestion_type)}
                                    </div>
                                    <h3 className={`font-semibold mt-1.5 leading-tight ${isDark ? "text-white" : "text-[#252525]"}`}>
                                        {suggestion.title}
                                    </h3>
                                </div>
                                <p className={`text-sm leading-relaxed ${isDark ? "text-[#CFCFCF]" : "text-[#545454]"}`}>
                                    {isHistoryVisible ? "Review your completed study goals below." : suggestion.description}
                                </p>
                            </div>

                            {/* Scrollable Items Area */}
                            <div className={`flex-1 overflow-y-auto pr-1 ${itemCount > 5 ? "pb-12" : "pb-1"} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}>
                                {suggestion.multiple_actions ? (
                                    <div className="flex flex-col gap-2 relative">
                                        {!isHistoryVisible ? (
                                            activeActions.map((act, idx) => (
                                                <SuggestionItem
                                                    key={idx}
                                                    suggestionId={suggestion.id}
                                                    item={act}
                                                    isDark={isDark}
                                                    updateStatus={updateItemStatus}
                                                />
                                            ))
                                        ) : (
                                            <>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D] dark:text-[#BABABA] mb-1 px-1">Completed Items</p>
                                                {completedActions.map((act, idx) => (
                                                    <SuggestionItem
                                                        key={`hist-${idx}`}
                                                        suggestionId={suggestion.id}
                                                        item={act}
                                                        isDark={isDark}
                                                        updateStatus={updateItemStatus}
                                                        isCompleted={true}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href={suggestion.action_type || "/"}
                                        className={`mt-2 inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                            ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                                            : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                                            }`}
                                    >
                                        {suggestion.action_label}
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>

                            {/* Center bottom indicator for more items */}
                            {suggestion.multiple_actions && (isHistoryVisible ? completedActions.length > 5 : activeActions.length > 5) && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none z-20">
                                    <button 
                                        onClick={(e) => {
                                            const container = e.currentTarget.closest('.group')?.querySelector('.overflow-y-auto');
                                            if (container) {
                                                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                                            }
                                        }}
                                        className={`p-1 rounded-full ${isDark ? "bg-[#252525]/90 text-white" : "bg-white/90 text-[#252525]"} backdrop-blur-md shadow-sm border border-white/10 dark:border-white/20 pointer-events-auto hover:scale-110 active:scale-95 transition-transform`}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface SuggestionItemProps {
    suggestionId: string;
    item: { id: string; action_type: string; action_label: string; status: string };
    isDark: boolean;
    updateStatus: (sId: string, itemId: string, status: string) => void;
    isCompleted?: boolean;
}

function SuggestionItem({ suggestionId, item, isDark, updateStatus, isCompleted = false }: SuggestionItemProps) {
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    return (
        <div className="relative rounded-xl overflow-hidden touch-pan-y group/item-container">
            {/* Background actions revealed by swipe */}
            <div className="absolute inset-0 flex items-center justify-start text-white font-medium text-xs">
                {/* Background for Complete/Undo (Swipe Right) */}
                <div className={`absolute inset-y-0 left-0 flex items-center justify-start px-4 w-full transition-opacity duration-200 ${swipeOffset > 20 ? "opacity-100 bg-[#C2A27A]" : "opacity-0 bg-[#C2A27A]/80"}`}>
                    {isCompleted ? <Circle className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
                </div>
            </div>

            {/* Foreground Card */}
            <div
                className={`relative z-10 flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer
                    ${swipeOffset === 0 ? "transition-transform duration-300 ease-out" : ""}
                    ${isDark
                        ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                        : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                    }
                `}
                style={{ transform: `translateX(${swipeOffset}px)` }}
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
                        updateStatus(suggestionId, item.id, isCompleted ? 'active' : 'completed');
                        setSwipeOffset(0);
                    } else {
                        setSwipeOffset(0);
                    }
                    touchStartRef.current = null;
                }}
            >
                <div className="flex items-center gap-3 overflow-hidden w-full">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(suggestionId, item.id, isCompleted ? 'active' : 'completed');
                        }}
                        className={`transition-colors flex-shrink-0 ${isCompleted ? "text-green-500 hover:text-green-600" : "text-[#CFCFCF] dark:text-[#545454] hover:text-[#252525] dark:hover:text-[#CFCFCF]"}`}
                    >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <Link
                        href={item.action_type || "/"}
                        className={`flex-1 min-w-0 inline-flex items-center justify-between py-0.5 text-sm font-medium ${isCompleted ? "line-through text-[#7D7D7D] dark:text-[#BABABA]/80 opacity-60" : ""}`}
                    >
                        <span className={`truncate pr-2 font-medium ${isDark ? "text-white" : "text-[#252525]"}`}>
                            {item.action_label}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/item-container:opacity-100" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
