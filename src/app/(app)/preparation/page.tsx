"use client";

import React, { useState } from "react";
import { Search, Sparkles, Plus } from "lucide-react";

import ExerciseTab from "@/components/preparation/ExerciseTab";
import RevisionTab from "@/components/preparation/RevisionTab";
import PersonalAITab from "@/components/preparation/PersonalAITab";
import GenerateExerciseModal from "@/components/preparation/GenerateExerciseModal";
import TakeExercisePage from "@/components/preparation/TakeExercisePage";

type TabType = "exercise" | "revision" | "personal_ai";

const TABS: { id: TabType; label: string }[] = [
    { id: "exercise", label: "Exercise" },
    { id: "revision", label: "Revision" },
    { id: "personal_ai", label: "Personal AI" },
];

const tabCls = (active: boolean) =>
    `px-1 py-2.5 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${active
        ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
        : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
    }`;

export default function PreparationPage() {
    const [activeTab, setActiveTab] = useState<TabType>("exercise");
    const [search, setSearch] = useState("");
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Full-page quiz state — when set, replaces the whole tab content
    const [activeExercise, setActiveExercise] = useState<any | null>(null);

    // If an exercise is active, show the full-page quiz
    if (activeExercise) {
        return (
            <TakeExercisePage
                exercise={activeExercise}
                onBack={() => setActiveExercise(null)}
                onComplete={() => {
                    setRefreshKey(k => k + 1);
                    setActiveExercise(null);
                }}
            />
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#F5F3EF] dark:bg-[#1A1A1A]">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 scrollbar-hide">

                {/* Title row */}
                <div className="flex items-center justify-between pt-6 sm:pt-8 pb-4">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#161514] dark:text-[#CFCFCF]">
                        Preparation
                    </h1>
                </div>

                {/* Search & Actions Row */}
                <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-6">
                    {/* Search Bar - Responsive width */}
                    <div className="relative flex-1 md:max-w-md transition-all">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D7D7D]" size={16} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#333] rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#7D7D7D] transition-all text-[#252525] dark:text-[#CFCFCF] placeholder-[#9E9E9E]"
                        />
                    </div>

                    {/* Mobile-only Action Button */}
                    {activeTab === "exercise" && (
                        <div className="flex md:hidden items-center">
                            <button
                                onClick={() => setIsGenerateOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] rounded-full text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                            >
                                <Sparkles size={14} />
                                <span>Generate</span>
                            </button>
                        </div>
                    )}

                    {/* Laptop-only Pill Button (Generate Exercise) */}
                    {activeTab === "exercise" && (
                        <button
                            onClick={() => setIsGenerateOpen(true)}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:bg-[#1A1A1A] dark:hover:bg-white active:scale-[0.98] transition-all shadow-md ml-auto"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Exercise</span>
                        </button>
                    )}
                </div>

                {/* Tab nav */}
                <div className="relative flex border-b border-[#E8E5E0] dark:border-[#333] mb-6">
                    <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x flex-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={tabCls(activeTab === tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                {activeTab === "exercise" && (
                    <ExerciseTab
                        search={search}
                        onNeedGenerate={() => setIsGenerateOpen(true)}
                        refreshKey={refreshKey}
                        onStartExercise={(ex) => setActiveExercise(ex)}
                    />
                )}
                {activeTab === "revision" && <RevisionTab search={search} />}
                {activeTab === "personal_ai" && <PersonalAITab />}
            </div>

            {/* Generate Exercise modal (shared header button) */}
            <GenerateExerciseModal
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                onSuccess={(newExercise) => {
                    setIsGenerateOpen(false);
                    setActiveTab("exercise");
                    setRefreshKey(k => k + 1);
                    // Immediately open the new exercise in full-page mode
                    if (newExercise) setActiveExercise(newExercise);
                }}
            />
        </div>
    );
}
