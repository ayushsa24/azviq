"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Sparkles, LayoutGrid, List as ListIcon } from "lucide-react";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";

import ExerciseTab from "@/components/preparation/ExerciseTab";
import RevisionTab from "@/components/preparation/RevisionTab";
import PersonalAITab from "@/components/preparation/PersonalAITab";
import GenerateExerciseModal from "@/components/preparation/GenerateExerciseModal";
import CreateRevisionModal from "@/components/preparation/CreateRevisionModal";
import TakeExercisePage from "@/components/preparation/TakeExercisePage";
import TakeRevisionPage from "@/components/preparation/TakeRevisionPage";

type TabType = "exercise" | "revision" | "personal_ai";

const TABS: { id: TabType; label: string }[] = [
    { id: "exercise", label: "Exercise" },
    { id: "revision", label: "Revision" },
    { id: "personal_ai", label: "Personal AI" },
];

const tabCls = (active: boolean) =>
    `px-1 py-2.5 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${active
        ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
        : "border-transparent text-[#545454] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white"
    }`;

export default function PreparationPage() {
    const [activeTab, setActiveTab] = useState<TabType>("exercise");
    const [search, setSearch] = useState("");
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [isCreateRevisionOpen, setIsCreateRevisionOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem('preparationViewMode');
            if (saved === "grid" || saved === "list") return saved;
        }
        return "grid";
    });

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('preparationViewMode', viewMode);
    }, [viewMode]);

    // Full-page exercise state
    const [activeExercise, setActiveExercise] = useState<any | null>(null);
    // Full-page revision state
    const [activeRevision, setActiveRevision] = useState<any | null>(null);

    const scrollContentRef = useRef<HTMLDivElement>(null);

    // Reset scroll to top when tab changes
    useEffect(() => {
        if (scrollContentRef.current) {
            scrollContentRef.current.scrollTo({ top: 0, behavior: "auto" });
        }
    }, [activeTab]);

    // Trap hardware back button on mobile
    useEffect(() => {
        if (activeExercise || activeRevision) {
            // Push a state so "back" triggers popstate
            window.history.pushState({ subview: "preparation" }, "");

            const handlePopState = (e: PopStateEvent) => {
                // When hardware back is pressed
                setActiveExercise(null);
                setActiveRevision(null);
                setRefreshKey(k => k + 1);
            };

            window.addEventListener("popstate", handlePopState);
            return () => {
                window.removeEventListener("popstate", handlePopState);
            };
        }
    }, [activeExercise, activeRevision]);

    const handleBack = () => {
        // If we have our dummy state in history, go back to clear it
        if (window.history.state?.subview === "preparation") {
            window.history.back();
        } else {
            // Fallback if state was somehow lost
            setActiveExercise(null);
            setActiveRevision(null);
            setRefreshKey(k => k + 1);
        }
    };

    // If a revision is active, show TakeRevisionPage full-page
    if (activeRevision) {
        return (
            <TakeRevisionPage
                revision={activeRevision}
                onBack={handleBack}
            />
        );
    }

    // If an exercise is active, show the full-page quiz
    if (activeExercise) {
        return (
            <TakeExercisePage
                exercise={activeExercise}
                onBack={handleBack}
                onComplete={() => {
                    setRefreshKey(k => k + 1);
                }}
            />
        );
    }

    const isExerciseTab = activeTab === "exercise";
    const isRevisionTab = activeTab === "revision";

    return (
        <div className="flex h-full flex-col bg-[#F5F3EF] dark:bg-[#1A1A1A] overflow-hidden">
            {/* Fixed Header Section (Title + Search + Tabs) */}
            <div className="sticky top-0 z-20 px-4 sm:px-6 bg-[#F5F3EF] dark:bg-[#1A1A1A] border-b border-transparent">
                {/* Title Section */}
                <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] sm:pt-6 pb-2">
                    <SidebarToggleButton />
                    <div>
                        <h1 className="text-[23px] sm:text-2xl font-extrabold tracking-tight text-[#161514] dark:text-white">
                            Preparation
                        </h1>
                        <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA] mt-0.5">Practice exercises &amp; revision</p>
                    </div>
                </div>
                {/* Search & Actions Row */}
                <div className="flex items-center gap-2 sm:gap-3 mb-2 md:mb-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 sm:w-80 md:max-w-md transition-all">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#BABABA]" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#BABABA] transition-all text-[#252525] dark:text-white placeholder-[#9E9E9E]"
                        />
                    </div>

                    {/* Mobile Action Buttons */}
                    {isExerciseTab && (
                        <div className="flex md:hidden items-center">
                            <button
                                onClick={() => setIsGenerateOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                            >
                                <Sparkles size={14} />
                                <span>Generate</span>
                            </button>
                        </div>
                    )}
                    {isRevisionTab && (
                        <div className="flex md:hidden items-center">
                            <button
                                onClick={() => setIsCreateRevisionOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                            >
                                <Sparkles size={14} />
                                <span>Create</span>
                            </button>
                        </div>
                    )}

                    {/* Desktop Pill Buttons */}
                    {isExerciseTab && (
                        <button
                            onClick={() => setIsGenerateOpen(true)}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:bg-[#1A1A1A] dark:hover:bg-white active:scale-[0.98] transition-all shadow-md ml-auto"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Exercise</span>
                        </button>
                    )}
                    {isRevisionTab && (
                        <button
                            onClick={() => setIsCreateRevisionOpen(true)}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:bg-[#1A1A1A] dark:hover:bg-white active:scale-[0.98] transition-all shadow-md ml-auto"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Create Revision</span>
                        </button>
                    )}
                </div>

                {/* Tab nav */}
                <div className="relative flex border-b border-[#E8E5E0] dark:border-[#333] mb-2 justify-between items-end">
                    <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x flex-1 pr-10">
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

                    {/* View Mode Toggle */}
                    {(activeTab === "exercise" || activeTab === "revision") && (
                        <div className="flex gap-1 pb-1.5 shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === "grid"
                                    ? "bg-[#252525]/5 dark:bg-white/10 text-[#252525] dark:text-white"
                                    : "text-[#BABABA] hover:bg-[#252525]/5 dark:hover:bg-white/5"
                                    }`}
                                title="Grid View"
                            >
                                <LayoutGrid size={17} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === "list"
                                    ? "bg-[#252525]/5 dark:bg-white/10 text-[#252525] dark:text-white"
                                    : "text-[#BABABA] hover:bg-[#252525]/5 dark:hover:bg-white/5"
                                    }`}
                                title="List View"
                            >
                                <ListIcon size={17} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div
                ref={scrollContentRef}
                className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 mt-2 scrollbar-hide"
            >
                {/* Tab content */}
                {activeTab === "exercise" && (
                    <ExerciseTab
                        search={search}
                        onNeedGenerate={() => setIsGenerateOpen(true)}
                        refreshKey={refreshKey}
                        onStartExercise={(ex) => setActiveExercise(ex)}
                        viewMode={viewMode}
                    />
                )}
                {activeTab === "revision" && (
                    <RevisionTab
                        search={search}
                        refreshKey={refreshKey}
                        onOpenRevision={(rev) => setActiveRevision(rev)}
                        viewMode={viewMode}
                    />
                )}
                {activeTab === "personal_ai" && <PersonalAITab />}
            </div>

            {/* Modals */}
            <GenerateExerciseModal
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                onSuccess={(newExercise) => {
                    setIsGenerateOpen(false);
                    setActiveTab("exercise");
                    setRefreshKey(k => k + 1);
                    if (newExercise) setActiveExercise(newExercise);
                }}
            />
            <CreateRevisionModal
                isOpen={isCreateRevisionOpen}
                onClose={() => setIsCreateRevisionOpen(false)}
                onSuccess={(revision) => {
                    setIsCreateRevisionOpen(false);
                    setActiveTab("revision");
                    setRefreshKey(k => k + 1);
                    // Immediately open the new revision full-page
                    setActiveRevision(revision);
                }}
            />
        </div >
    );
}
