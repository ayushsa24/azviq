"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, File as FileIcon, Clock, BookOpen, ClipboardCheck, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import useSWR from "swr";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

type RecentItem = {
    id: string;
    item_id: string;
    title: string;
    item_type: "note" | "pdf" | "exercise" | "revision";
    opened_at: string;
    href: string;
    original_note_id?: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText }> = {
    note: { label: "Note", icon: FileText },
    pdf: { label: "PDF", icon: FileIcon },
    exercise: { label: "Exercise", icon: ClipboardCheck },
    revision: { label: "Revision", icon: BookOpen },
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RecentItemsScroll() {
    const { data, isLoading, error } = useSWR("/api/recent-activity");
    const items = (data?.items || []) as RecentItem[];
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftArrow(scrollLeft > 10);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [items]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const container = scrollRef.current;
            const scrollAmount = container.clientWidth * 0.9; // Scroll 90% of the visible area
            
            container.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            });
        }
    };

    const handleClick = (item: RecentItem) => {
        setNavigatingId(item.id);
        // Migrate old ?tab=exercise&id= / ?tab=revision&id= URLs to new route format
        let href = item.href;
        const oldExerciseMatch = href.match(/preparation\?tab=exercise&id=([^&]+)/);
        const oldRevisionMatch = href.match(/preparation\?tab=revision&id=([^&]+)/);
        if (oldExerciseMatch) href = `/preparation/exercise/${oldExerciseMatch[1]}`;
        else if (oldRevisionMatch) href = `/preparation/revision/${oldRevisionMatch[1]}`;
        router.push(href);
    };

    if (isLoading) {
        return (
            <div className="mb-4">
                <SectionHeader />
                <div className="w-full flex gap-3 overflow-x-auto pb-3 scrollbar-hide px-1">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="min-w-[200px] h-[72px] bg-[#E8E5E0] dark:bg-[#2C2C2C] animate-pulse rounded-2xl shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="relative group/recent">
            <SectionHeader />

            {/* ── Left Arrow ── */}
            <div className={`hidden lg:flex absolute left-[-12px] top-[60%] -translate-y-1/2 z-10 transition-all duration-300 
                ${showLeftArrow ? "group-hover/recent:opacity-100 group-hover/recent:translate-x-0" : "pointer-events-none"} 
                opacity-0 -translate-x-2`}
            >
                <button 
                    onClick={() => scroll("left")}
                    className="w-8 h-8 rounded-full bg-white/80 dark:bg-[#252525]/80 backdrop-blur-md border border-[#E8E5E0] dark:border-[#545454] shadow-md flex items-center justify-center text-[#545454] dark:text-[#BABABA] hover:bg-white dark:hover:bg-[#333] hover:scale-110 active:scale-95 transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* ── Right Arrow ── */}
            <div className={`hidden lg:flex absolute right-[-12px] top-[60%] -translate-y-1/2 z-10 transition-all duration-300 
                ${showRightArrow ? "group-hover/recent:opacity-100 group-hover/recent:translate-x-0" : "pointer-events-none"} 
                opacity-0 translate-x-2`}
            >
                <button 
                    onClick={() => scroll("right")}
                    className="w-8 h-8 rounded-full bg-white/80 dark:bg-[#252525]/80 backdrop-blur-md border border-[#E8E5E0] dark:border-[#545454] shadow-md flex items-center justify-center text-[#545454] dark:text-[#BABABA] hover:bg-white dark:hover:bg-[#333] hover:scale-110 active:scale-95 transition-all"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* ── Horizontal scroll — all screen sizes ── */}
            <div 
                ref={scrollRef}
                onScroll={checkScroll}
                className="w-full flex gap-4 overflow-x-auto pb-3 scrollbar-hide px-1 snap-x snap-mandatory"
            >
                {items.map((item) => {
                    const config = TYPE_CONFIG[item.item_type] || TYPE_CONFIG.note;
                    const Icon = config.icon;
                    const isNavigating = navigatingId === item.id;

                    return (
                        <button
                            key={`${item.item_type}-${item.id}`}
                            onClick={() => handleClick(item)}
                            disabled={isNavigating}
                            className={`group min-w-[240px] max-w-[240px] sm:min-w-[260px] sm:max-w-[260px] bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-2xl px-4 py-3.5 shrink-0 text-left transition-all duration-200 flex items-center gap-3 cursor-pointer snap-start
                                hover:bg-[#F9F8F6] dark:hover:bg-white/5 hover:border-[#D1D1D1] dark:hover:border-[#444] shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
                                ${isNavigating ? "opacity-60 scale-[0.98]" : ""}
                            `}
                        >
                            {/* Icon — left */}
                            <div className="w-10 h-10 rounded-xl bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center flex-shrink-0 text-[#545454] dark:text-[#BABABA]">
                                {(() => {
                                    const iconMatch = item.title.match(/^\[(\w+)\]/);
                                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                        const IconComp = ICON_MAP[iconMatch[1]];
                                        return <IconComp className="w-5 h-5" strokeWidth={1.5} />;
                                    }
                                    return <Icon className="w-5 h-5" />;
                                })()}
                            </div>

                            {/* Title + time — center */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[15px] font-semibold text-[#252525] dark:text-white truncate group-hover:text-[#1A1A1A] dark:group-hover:text-white transition-colors leading-tight">
                                        {item.title.replace(/^\[\w+\]\s*/, "")}
                                    </p>
                                </div>
                                <p className="text-xs text-[#7D7D7D] dark:text-[#545454] mt-0.5">
                                    {timeAgo(item.opened_at)}
                                </p>
                            </div>

                            {/* Type badge — right */}
                            <span className="text-xs font-medium text-[#7D7D7D] dark:text-[#BABABA] bg-[#F0EDE8] dark:bg-[#333] px-2.5 py-1 rounded-full flex-shrink-0 self-start mt-0.5">
                                {item.item_type === "note" && item.original_note_id ? "Imported" : config.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SectionHeader() {
    return (
        <div className="flex items-center gap-2 mb-2 px-1 sm:px-2">
            <Clock className="w-4 h-4 text-[#545454] dark:text-[#BABABA]" />
            <h3 className="text-sm font-bold text-[#545454] dark:text-[#BABABA] uppercase tracking-wider">
                Recent Activity
            </h3>
        </div>
    );
}
