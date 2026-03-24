"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Sparkles, LayoutGrid, List as ListIcon } from "lucide-react";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";

import ExerciseTab from "@/components/preparation/ExerciseTab";
import RevisionTab from "@/components/preparation/RevisionTab";
import PersonalAITab from "@/components/preparation/PersonalAITab";
import GenerateExerciseModal from "@/components/preparation/GenerateExerciseModal";
import CreateRevisionModal from "@/components/preparation/CreateRevisionModal";
import TakeExercisePage from "@/components/preparation/TakeExercisePage";
import TakeRevisionPage from "@/components/preparation/TakeRevisionPage";
import { logRecentActivity } from "@/lib/logRecentActivity";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

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
    const router = useRouter();
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
    const [isAutoLoading, setIsAutoLoading] = useState(false);
    const processedIdRef = useRef<string | null>(null);

    const scrollContentRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    // Deep-link: auto-open exercise or revision from URL params (e.g. from Recent Activity)
    useEffect(() => {
        const tabParam = searchParams.get("tab") as TabType | null;
        const idParam = searchParams.get("id");

        // Only react if the ID in the URL actually changed
        if (idParam === processedIdRef.current) return;
        processedIdRef.current = idParam;

        if (tabParam && ["exercise", "revision", "personal_ai"].includes(tabParam)) {
            setActiveTab(tabParam);
        }

        if (!idParam) {
            setActiveExercise(null);
            setActiveRevision(null);
            return;
        }

        // Clear existing views so the new one can take over
        if (!activeExercise || activeExercise.id !== idParam) setActiveExercise(null);
        if (!activeRevision || activeRevision.id !== idParam) setActiveRevision(null);

        async function autoOpen() {
            if (activeExercise?.id === idParam || activeRevision?.id === idParam) return;
            
            setIsAutoLoading(true);
            if (tabParam === "exercise") {
                try {
                    const res = await fetch(`/api/exercises/${idParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.exercise) {
                            setActiveExercise(data.exercise);
                            logRecentActivity({
                                item_id: data.exercise.id,
                                item_type: "exercise",
                                title: data.exercise.title || "Untitled Exercise",
                                href: `/preparation?tab=exercise&id=${data.exercise.id}`,
                            });
                        }
                    }
                } catch (e) { console.error("Failed to load exercise", e); }
            } else if (tabParam === "revision") {
                try {
                    const res = await fetch(`/api/revision/${idParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.revision) {
                            setActiveRevision(data.revision);
                            logRecentActivity({
                                item_id: data.revision.id,
                                item_type: "revision",
                                title: data.revision.title || "Untitled Revision",
                                href: `/preparation?tab=revision&id=${data.revision.id}`,
                            });
                        }
                    }
                } catch (e) { console.error("Failed to load revision", e); }
            }
            setIsAutoLoading(false);
        }

        autoOpen();
    }, [searchParams]);

    // Reset scroll to top when tab changes
    useEffect(() => {
        if (scrollContentRef.current) {
            scrollContentRef.current.scrollTo({ top: 0, behavior: "auto" });
        }
    }, [activeTab]);

    // URL sync happens via the useEffect deep-link logic at the top.
    // Standard router navigation now handles hardware back buttons.

    const handleStartExercise = (ex: any) => {
        setActiveExercise(ex);
        processedIdRef.current = ex.id;
        logRecentActivity({
            item_id: ex.id,
            item_type: "exercise",
            title: ex.title || "Untitled Exercise",
            href: `/preparation?tab=exercise&id=${ex.id}`,
        });
        router.push(`/preparation?tab=exercise&id=${ex.id}`);
    };

    const handleOpenRevision = (rev: any) => {
        setActiveRevision(rev);
        processedIdRef.current = rev.id;
        logRecentActivity({
            item_id: rev.id,
            item_type: "revision",
            title: rev.title || "Untitled Revision",
            href: `/preparation?tab=revision&id=${rev.id}`,
        });
        router.push(`/preparation?tab=revision&id=${rev.id}`);
    };

    const handleBack = () => {
        // If we are in a full-page view, simply close it and return to the list
        if (activeExercise || activeRevision || searchParams.get("id")) {
            setActiveExercise(null);
            setActiveRevision(null);
            processedIdRef.current = null;
            // Also clean up the URL if there was an ID param
            if (searchParams.get("id")) {
                router.push("/preparation", { scroll: false });
            }
            return;
        }

        // Standard fallback for general navigation
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push("/preparation");
        }
    };

    const isExerciseTab = activeTab === "exercise";
    const isRevisionTab = activeTab === "revision";
    const isFullPageOpen = !!activeExercise || !!activeRevision || !!searchParams.get("id");

    return (
        <div className="flex h-full flex-col bg-transparent dark:bg-[#1A1A1A] overflow-hidden relative">
            {/* Full-page views rendered as absolute overlays to keep main list mounted */}
            {activeRevision && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-[#1A1A1A]">
                    <TakeRevisionPage
                        revision={activeRevision}
                        onBack={handleBack}
                    />
                </div>
            )}
            {activeExercise && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-[#1A1A1A]">
                    <TakeExercisePage
                        exercise={activeExercise}
                        onBack={handleBack}
                        onComplete={() => {
                            setRefreshKey(k => k + 1);
                        }}
                    />
                </div>
            )}

            {/* Deep-link Loading Loader Overlays */}
            {isAutoLoading && (
                <div className="absolute inset-0 z-[101] bg-white dark:bg-[#1A1A1A] flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-full border-2 border-t-transparent animate-spin ${activeRevision ? 'border-white/20 border-t-white' : 'border-[#252525]/10 border-t-[#252525]'}`} />
                        <Sparkles className={`w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${activeRevision ? 'text-white' : 'text-[#252525] dark:text-white'}`} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#BABABA] animate-pulse">
                        {searchParams.get("tab") === "exercise" ? "Preparing Exercise..." : "Preparing Revision..."}
                    </p>
                </div>
            )}

            <div className={`flex h-full flex-col ${isFullPageOpen ? 'hidden' : 'flex'}`}>
                {/* Fixed Header Section (Title + Search + Tabs) */}
                <div className="sticky top-0 z-20 px-4 sm:px-6 bg-transparent dark:bg-[#1A1A1A] border-b border-transparent">
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#BABABA]" size={16} />
                            <input
                                type="text"
                                placeholder={
                                    activeTab === "exercise" ? "Search Exercise" :
                                    activeTab === "revision" ? "Search Revision" :
                                    "Search Personal AI"
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
                    <div className="relative flex border-b border-[#7D7D7D]/40 dark:border-[#333] mb-2 justify-between items-end">
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
                    className="flex-1 overflow-y-auto px-4 sm:px-6 pb-0 mt-2 scrollbar-hide"
                >
                    {/* Tab content - rendered always but hidden when inactive to preserve state/prevent re-loads */}
                <div className={activeTab === "exercise" ? "block" : "hidden"}>
                    <ExerciseTab
                        search={search}
                        onNeedGenerate={() => setIsGenerateOpen(true)}
                        refreshKey={refreshKey}
                        onStartExercise={handleStartExercise}
                        viewMode={viewMode}
                    />
                </div>
                <div className={activeTab === "revision" ? "block" : "hidden"}>
                    <RevisionTab
                        search={search}
                        refreshKey={refreshKey}
                        onOpenRevision={handleOpenRevision}
                        viewMode={viewMode}
                    />
                </div>
                {activeTab === "personal_ai" && <PersonalAITab />}
            </div>
            </div>

            {/* Modals */}
            <GenerateExerciseModal
                isOpen={isGenerateOpen}
                onClose={() => setIsGenerateOpen(false)}
                onSuccess={(newExercise) => {
                    setIsGenerateOpen(false);
                    setActiveTab("exercise");
                    setRefreshKey(k => k + 1);
                    if (newExercise) {
                        setActiveExercise(newExercise);
                        logRecentActivity({
                            item_id: newExercise.id,
                            item_type: "exercise",
                            title: newExercise.title || "Untitled Exercise",
                            href: `/preparation?tab=exercise&id=${newExercise.id}`,
                        });
                    }
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
                    logRecentActivity({
                        item_id: revision.id,
                        item_type: "revision",
                        title: revision.title || "Untitled Revision",
                        href: `/preparation?tab=revision&id=${revision.id}`,
                    });
                }}
            />
        </div>
    );
}
