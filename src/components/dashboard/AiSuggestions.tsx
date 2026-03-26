"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sparkles, ArrowRight, Loader2, Target, CalendarDays, BrainCircuit, Clock, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";


// Define the suggestion type based on what we return from the API
interface AiSuggestion {
    id: string;
    suggestion_type: "short_study" | "weak_topic" | "spaced_revision" | "missed_revision";
    title: string;
    description: string;
    related_subject?: string;
    related_topic?: string;
    action_type: string;
    action_label: string;
    multiple_actions?: { id: string; action_type: string; action_label: string; }[];
}

export default function AiSuggestions() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { data, isLoading: suggestionsLoading } = useSWR("/api/suggestions");
    const suggestions = (data?.suggestions || []) as AiSuggestion[];
    const isLoading = suggestionsLoading;
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [dismissedSubActions, setDismissedSubActions] = useState<string[]>([]);

    // Load persisted state from localStorage
    useEffect(() => {
        const savedCompleted = localStorage.getItem("ai_suggestions_completed");
        const savedDismissed = localStorage.getItem("ai_suggestions_dismissed_subactions");
        if (savedCompleted) setTimeout(() => setCompletedIds(JSON.parse(savedCompleted)), 0);
        if (savedDismissed) setTimeout(() => setDismissedSubActions(JSON.parse(savedDismissed)), 0);
    }, []);

    // Persist to localStorage whenever state changes
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem("ai_suggestions_completed", JSON.stringify(completedIds));
            localStorage.setItem("ai_suggestions_dismissed_subactions", JSON.stringify(dismissedSubActions));
        }
    }, [completedIds, dismissedSubActions, isLoading]);

    const handleDismiss = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCompletedIds(prev => {
            const next = [...prev, id];
            return next;
        });
    };

    const handleSubActionDismiss = (suggestionId: string, actionId: string, actionLabel: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const key = actionId ? `${suggestionId}-${actionId}` : `${suggestionId}-${actionLabel}`;
        setDismissedSubActions(prev => {
            const next = [...prev, key];
            return next;
        });
    };

    const activeSuggestions = suggestions.filter(s => {
        if (completedIds.includes(s.id)) return false;

        if (s.multiple_actions) {
            const visibleActions = s.multiple_actions.filter(act => {
                const key = act.id ? `${s.id}-${act.id}` : `${s.id}-${act.action_label}`;
                return !dismissedSubActions.includes(key);
            });
            if (visibleActions.length === 0) return false;
        }

        return true;
    });

    if (isLoading) {
        return (
            <div className="w-full">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                    <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>AI Suggestions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex flex-col p-5 rounded-2xl border ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white border-[#CFCFCF]"} animate-pulse h-[200px]`}>
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

    if (activeSuggestions.length === 0) {
        return null; // hide if no active suggestions
    }

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
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>AI Suggestions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeSuggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className={`group relative flex flex-col p-5 rounded-2xl border transition-all duration-200 ${isDark
                            ? "bg-[#252525] border-[#545454] hover:bg-white/10 hover:border-[#444]"
                            : "bg-white border-[#CFCFCF] hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"
                            } shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md`}
                    >
                        {/* Done Checklist functionality (hidden for multi-action cards and Quick Study Session) */}
                        {!suggestion.multiple_actions && suggestion.suggestion_type !== "short_study" && (
                            <button
                                onClick={(e) => handleDismiss(suggestion.id, e)}
                                className="absolute top-4 right-4 z-10 p-1 rounded-full text-[#BABABA] hover:text-[#252525] dark:hover:text-white transition-colors"
                                title="Mark as done"
                            >
                                <Circle className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}

                        <div className="flex items-start gap-3 mb-3 pr-6">
                            <div className={`p-2 rounded-xl shrink-0 ${isDark ? "bg-[#1A1A1A]" : "bg-[#F5F3EF]"}`}>
                                {getIcon(suggestion.suggestion_type)}
                            </div>
                            <h3 className={`font-semibold mt-1.5 leading-tight ${isDark ? "text-white" : "text-[#252525]"}`}>
                                {suggestion.title}
                            </h3>
                        </div>
                        <p className={`text-sm flex-1 leading-relaxed ${isDark ? "text-[#CFCFCF]" : "text-[#545454]"}`}>
                            {suggestion.description}
                        </p>
                        {suggestion.multiple_actions ? (
                            <div className="mt-5 flex flex-col gap-2">
                                {suggestion.multiple_actions
                                    .filter(act => {
                                        const key = act.id ? `${suggestion.id}-${act.id}` : `${suggestion.id}-${act.action_label}`;
                                        return !dismissedSubActions.includes(key);
                                    })
                                    .map((act, idx) => (
                                        <div key={idx} className="flex items-center gap-2 group/item">
                                            <button
                                                onClick={(e) => handleSubActionDismiss(suggestion.id, act.id, act.action_label, e)}
                                                className="shrink-0 text-[#BABABA] hover:text-[#252525] dark:hover:text-white transition-colors"
                                                title="Mark as done"
                                            >
                                                <Circle className="w-4 h-4" />
                                            </button>
                                            <Link
                                                href={act.action_type || "/"}
                                                className={`flex-1 min-w-0 inline-flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isDark
                                                    ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                                                    : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                                                    }`}
                                            >
                                                <span className="truncate pr-2">{act.action_label}</span>
                                                <ArrowRight className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/item:opacity-100" />
                                            </Link>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <Link
                                href={suggestion.action_type || "/"}
                                className={`mt-5 inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                    ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                                    : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                                    }`}
                            >
                                {suggestion.action_label}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
