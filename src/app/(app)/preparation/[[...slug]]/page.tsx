"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { Search, Sparkles, LayoutGrid, List as ListIcon } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";

import ExerciseTab from "@/components/preparation/ExerciseTab";
import RevisionTab from "@/components/preparation/RevisionTab";
import PersonalAITab from "@/components/preparation/PersonalAITab";
import GenerateExerciseModal from "@/components/preparation/GenerateExerciseModal";
import CreateRevisionModal from "@/components/preparation/CreateRevisionModal";
import { logRecentActivity } from "@/lib/logRecentActivity";


type TabType = "exercise" | "revision" | "ai_teacher";

const TABS: { id: TabType; label: string }[] = [
    { id: "exercise", label: "Exercise" },
    { id: "revision", label: "Revision" },
    { id: "ai_teacher", label: "AI Teacher" },
];

const tabCls = (active: boolean) =>
    `relative px-1 py-2.5 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors outline-none ${active
        ? "text-[#252525] dark:text-white"
        : "text-[#545454] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white"
    }`;

export default function PreparationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const slug = params?.slug as string[] | undefined;
    
    // Read the tab from the URL path directly (defaults to "exercise")
    const activeTabFromUrl = (slug?.[0] as TabType) || "exercise";
    const [lastTab, setLastTab] = useState<TabType>("exercise");
    const activeTab = activeTabFromUrl;

    useEffect(() => {
        if (activeTabFromUrl && ["exercise", "revision", "ai_teacher"].includes(activeTabFromUrl)) {
            setLastTab(activeTabFromUrl);
        }
    }, [activeTabFromUrl]);

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [isFocusMode, setIsFocusMode] = useState(() => searchParams.get("fullscreen") === "true");
    const [isGenerateOpen, setIsGenerateOpen] = useState(false);
    const [isCreateRevisionOpen, setIsCreateRevisionOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("preparationViewMode");
            if (saved === "grid" || saved === "list") return saved;
        }
        return "grid";
    });

    const scrollContentRef = useRef<HTMLDivElement>(null);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem("preparationViewMode", viewMode);
    }, [viewMode]);

    // Update search if URL changes directly
    useEffect(() => {
        const querySearch = searchParams.get("search");
        if (querySearch) setSearch(querySearch);
    }, [searchParams]);

    // Handle tab changes (scroll to top)
    useEffect(() => {
        if (scrollContentRef.current) {
            scrollContentRef.current.scrollTo({ top: 0, behavior: "auto" });
        }
    }, [activeTab]);
    
    // Sync Focus Mode to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (isFocusMode) {
            params.set("fullscreen", "true");
        } else {
            params.delete("fullscreen");
        }
        
        const qs = params.toString() ? `?${params.toString()}` : "";
        const targetPath = activeTab === "exercise" ? "/preparation" : `/preparation/${activeTab}`;
        router.push(`${targetPath}${qs}`, { scroll: false });
    }, [isFocusMode]);

    // Change tab and update URL
    const handleTabChange = (tabId: TabType) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("tab");
        
        const qs = params.toString() ? `?${params.toString()}` : "";
        const targetPath = tabId === "exercise" ? "/preparation" : `/preparation/${tabId}`;
        router.push(`${targetPath}${qs}`, { scroll: false });
    };

    // Card click handlers — simply navigate to dedicated route pages
    const handleStartExercise = (ex: any) => {
        router.push(`/preparation/exercise/${ex.id}`);
    };

    const handleOpenRevision = (rev: any) => {
        router.push(`/preparation/revision/${rev.id}`);
    };

    const isExerciseTab = activeTab === "exercise";
    const isRevisionTab = activeTab === "revision";

    return (
        <div className="flex h-screen flex-col bg-transparent dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] overflow-hidden relative">
            <div className={`flex h-full flex-col overflow-hidden transition-all duration-300 ${isFocusMode ? 'pt-0' : ''}`}>
                {/* Fixed Header Section (Title + Search + Tabs) */}
                {!isFocusMode && (
                    <div 
                        className="sticky top-0 z-20 px-4 sm:px-6 bg-transparent dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] border-b border-transparent"
                    >
                        {/* Title Section */}
                        <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:pt-6 pb-2">
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#252525] dark:text-white z-10 opacity-60" size={16} />
                                <input
                                    type="text"
                                    placeholder={
                                        activeTab === "exercise" ? "Search Exercise" :
                                        activeTab === "revision" ? "Search Revision" :
                                        "Search AI Teacher"
                                    }
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#7D7D7D]/40 dark:border-[#545454] rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#BABABA] transition-all text-[#252525] dark:text-white placeholder-[#9E9E9E]"
                                />
                            </div>

                            {/* Mobile Action Buttons */}
                            {isExerciseTab && (
                                <div className="flex md:hidden items-center">
                                    <button
                                        onClick={() => setIsGenerateOpen(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-[11px] font-bold hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] active:scale-95 hover:scale-105 transition-all shadow-sm whitespace-nowrap"
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
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-[11px] font-bold hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] active:scale-95 hover:scale-105 transition-all shadow-sm whitespace-nowrap"
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
                                    className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] hover:scale-105 active:scale-[0.98] transition-all shadow-md ml-auto"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Generate Exercise</span>
                                </button>
                            )}
                            {isRevisionTab && (
                                <button
                                    onClick={() => setIsCreateRevisionOpen(true)}
                                    className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] hover:scale-105 active:scale-[0.98] transition-all shadow-md ml-auto"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Create Revision</span>
                                </button>
                            )}
                        </div>

                        <div className="relative flex border-b border-[#7D7D7D]/40 dark:border-[#333] mb-2 justify-between items-end">
                            <LayoutGroup id="prepTabs">
                                <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x flex-1 pr-10">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={tabCls(activeTab === tab.id)}
                                        >
                                            <span className="relative z-10">{tab.label}</span>
                                            {activeTab === tab.id && (
                                                <motion.div
                                                    layoutId="activeTabUnderline"
                                                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#252525] dark:bg-white"
                                                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </LayoutGroup>

                            {/* View Mode Toggle */}
                            {(activeTab === "exercise" || activeTab === "revision") && (
                                <div className="flex gap-1 pb-1.5 shrink-0">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${viewMode === "grid"
                                            ? "bg-[#252525]/5 dark:bg-white/10 text-[#252525] dark:text-white"
                                            : "text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
                                            }`}
                                        title="Grid View"
                                    >
                                        <LayoutGrid size={17} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${viewMode === "list"
                                            ? "bg-[#252525]/5 dark:bg-white/10 text-[#252525] dark:text-white"
                                            : "text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
                                            }`}
                                        title="List View"
                                    >
                                        <ListIcon size={17} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div
                    ref={scrollContentRef}
                    className={`flex-1 flex flex-col ${activeTab === 'ai_teacher' ? 'overflow-hidden' : 'overflow-y-auto'} custom-scrollbar min-h-0 transition-all duration-300 ${isFocusMode ? 'px-0 mt-0' : 'px-4 sm:px-6 mt-2'}`}
                >
                    <div
                        className={`flex-1 flex flex-col ${activeTab === 'ai_teacher' ? 'overflow-hidden' : ''}`}
                    >
                        {activeTab === "exercise" && (
                            <ExerciseTab
                                search={search}
                                onNeedGenerate={() => setIsGenerateOpen(true)}
                                refreshKey={refreshKey}
                                onStartExercise={handleStartExercise}
                                viewMode={viewMode}
                            />
                        )}
                        {activeTab === "revision" && (
                            <RevisionTab
                                search={search}
                                refreshKey={refreshKey}
                                onOpenRevision={handleOpenRevision}
                                viewMode={viewMode}
                            />
                        )}
                        {activeTab === "ai_teacher" && (
                            <PersonalAITab 
                                isFocusMode={isFocusMode}
                                onFocusModeChange={setIsFocusMode}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <GenerateExerciseModal
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                onSuccess={(newExercise) => {
                    setIsGenerateOpen(false);
                    handleTabChange("exercise");
                    setRefreshKey(k => k + 1);
                    if (newExercise) {
                        logRecentActivity({
                            item_id: newExercise.id,
                            item_type: "exercise",
                            title: newExercise.title || "Untitled Exercise",
                            href: `/preparation/exercise/${newExercise.id}`,
                        });
                        router.push(`/preparation/exercise/${newExercise.id}`);
                    }
                }}
            />
            <CreateRevisionModal
                isOpen={isCreateRevisionOpen}
                onClose={() => setIsCreateRevisionOpen(false)}
                onSuccess={(revision) => {
                    setIsCreateRevisionOpen(false);
                    handleTabChange("revision");
                    setRefreshKey(k => k + 1);
                    logRecentActivity({
                        item_id: revision.id,
                        item_type: "revision",
                        title: revision.title || "Untitled Revision",
                        href: `/preparation/revision/${revision.id}`,
                    });
                    router.push(`/preparation/revision/${revision.id}`);
                }}
            />
        </div>
    );
}
