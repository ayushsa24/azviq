"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sparkles, ArrowRight, Loader2, Target, CalendarDays, BrainCircuit, Clock } from "lucide-react";
import Link from "next/link";

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
    multiple_actions?: { action_type: string; action_label: string; }[];
}

export default function AiSuggestions() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await fetch("/api/suggestions");
                if (res.ok) {
                    const data = await res.json();
                    setSuggestions(data.suggestions || []);
                }
            } catch (err) {
                console.error("Failed to fetch suggestions:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, []);

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#7D7D7D]" />
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null; // hide if no suggestions
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
        <div className="w-full mt-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>AI Suggestions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className={`flex flex-col p-5 rounded-2xl border transition-all duration-200 ${isDark
                            ? "bg-[#252525] border-[#545454] hover:border-[#7D7D7D]"
                            : "bg-white border-[#CFCFCF] hover:border-[#7D7D7D]"
                            }`}
                    >
                        <div className="flex items-start gap-3 mb-3">
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
                                {suggestion.multiple_actions.map((act, idx) => (
                                    <Link
                                        key={idx}
                                        href={act.action_type || "/"}
                                        className={`inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark
                                            ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                                            : "bg-[#F5F3EF] text-[#252525] hover:bg-[#E8E5E0]"
                                            }`}
                                    >
                                        <span className="truncate pr-2">{act.action_label}</span>
                                        <ArrowRight className="w-4 h-4 shrink-0" />
                                    </Link>
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
