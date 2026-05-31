"use client";

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Save, Download, Loader2, Undo2, Redo2,
    Pen, Eraser, Highlighter, Type, Layout, MousePointer2, ZoomIn, ZoomOut, PanelLeft
} from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import { PdfDrawingOverlay, Annotation } from "@/components/pdf/PdfDrawingOverlay";
import { useSidebar } from "@/contexts/SidebarContext";
import { logRecentActivity } from "@/lib/logRecentActivity";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAppDialog } from "@/components/ui/AppDialog";

const CanvasSkeleton = () => (
    <div className="w-full h-full min-h-[60vh] flex flex-col items-center p-8 bg-[#F5F3EF] dark:bg-[#1E1E1E]">
        <Skeleton className="w-full max-w-[800px] h-full sm:h-[1000px] bg-white dark:bg-[#1C1C1C] rounded-t-md shadow-2xl animate-pulse" />
    </div>
);

const PdfSkeleton = () => {
    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1E1E1E] overflow-hidden relative">
            {/* Elegant Header Skeleton */}
            <div className="relative sm:static flex shrink-0 items-center justify-between px-4 h-14 bg-white dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E] z-50 transition-colors pt-[calc(env(safe-area-inset-top,0px)+2px)] sm:pt-0">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl opacity-40 animate-pulse" />
                        <div className="flex flex-col gap-1.5 ml-1">
                            <Skeleton className="w-28 sm:w-48 h-4 rounded-md opacity-40 animate-pulse" />
                            <Skeleton className="w-16 sm:w-24 h-2.5 rounded-md opacity-30 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Undo / Redo */}
                        <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg opacity-40 animate-pulse" />
                        <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg opacity-40 animate-pulse" />
                        <div className="hidden sm:block w-px h-6 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />
                        {/* Download / Save */}
                        <Skeleton className="w-8 h-8 sm:w-24 sm:h-9 rounded-lg opacity-40 animate-pulse" />
                        <Skeleton className="w-8 h-8 sm:w-20 sm:h-9 rounded-lg opacity-40 animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Main body area */}
            <div className="flex flex-row flex-1 min-h-0 overflow-hidden relative">
                {/* Left Sidebar - Thumbnails */}
                <div className="hidden sm:flex flex-col w-64 bg-white dark:bg-[#24221F] border-r border-[#E8E5E0] dark:border-[#2A2A2A] p-4 gap-4 flex-shrink-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-2 items-center">
                            <Skeleton className="w-40 h-56 rounded-lg opacity-30 animate-pulse border border-[#E8E5E0] dark:border-[#3A3A3A]" />
                            <Skeleton className="w-8 h-3 rounded opacity-30 animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Center Canvas Area */}
                <div className="flex-1 min-w-0 bg-[#F5F3EF] dark:bg-[#1E1E1E] overflow-hidden flex justify-center p-4 pt-4 sm:pt-12 sm:px-12">
                    <div className="w-full max-w-[800px] h-[85vh] bg-white dark:bg-[#1A1A1A] rounded-t-md shadow-lg border border-[#E8E5E0] dark:border-[#2E2E2E] p-8 flex flex-col gap-6 animate-pulse">
                        <Skeleton className="w-3/4 h-6 rounded-md opacity-30" />
                        <div className="space-y-3">
                            <Skeleton className="w-full h-4 rounded-md opacity-20" />
                            <Skeleton className="w-full h-4 rounded-md opacity-20" />
                            <Skeleton className="w-5/6 h-4 rounded-md opacity-20" />
                        </div>
                        <div className="space-y-3 pt-6">
                            <Skeleton className="w-full h-4 rounded-md opacity-20" />
                            <Skeleton className="w-4/5 h-4 rounded-md opacity-20" />
                            <Skeleton className="w-full h-4 rounded-md opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Tools */}
                <div className="hidden sm:flex flex-col w-60 bg-white dark:bg-[#24221F] border-l border-[#E8E5E0] dark:border-[#2A2A2A] p-4 gap-5 flex-shrink-0">
                    {/* Tool Grid */}
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="w-16 h-3 rounded-md opacity-35 animate-pulse" />
                        <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 rounded-xl opacity-30 animate-pulse" />
                            ))}
                        </div>
                    </div>
                    <div className="w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />
                    {/* Size selector */}
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="w-12 h-3 rounded-md opacity-35 animate-pulse" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4 rounded-full opacity-35 animate-pulse" />
                            <Skeleton className="flex-1 h-2 rounded opacity-30 animate-pulse" />
                            <Skeleton className="w-3 h-3 rounded-full opacity-35 animate-pulse" />
                        </div>
                    </div>
                    <div className="w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />
                    {/* Colors */}
                    <div className="flex flex-col gap-2.5">
                        <Skeleton className="w-16 h-3 rounded-md opacity-35 animate-pulse" />
                        <div className="grid grid-cols-5 gap-2">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <Skeleton key={i} className="w-8 h-8 rounded-full opacity-35 animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Toolbar Skeleton */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#24221F]/90 backdrop-blur-xl border-t border-[#E8E5E0] dark:border-[#2A2A2A] p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] flex justify-around gap-2 z-50 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="w-14 h-11 rounded-xl opacity-30" />
                ))}
            </div>
        </div>
    );
};

// Dynamically import PdfViewerWrapper to prevent pdfjs-dist from running through
// Next.js SSR Webpack (which causes the 'Object.defineProperty' crash)
const PdfViewerWrapper = dynamic(() => import("@/components/pdf/PdfViewerWrapper"), {
    ssr: false,
    loading: () => <CanvasSkeleton />,
});

type Tool = "select" | "pen" | "eraser" | "highlight" | "text";

interface TextInput {
    pageNum: number;
    x: number;
    y: number;
    isDragging?: boolean;
    dragStartX?: number;
    dragStartY?: number;
    initialX?: number;
    initialY?: number;
}

const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
        hex = hex.split("").map(c => c + c).join("");
    }
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) {
            h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
            h = (b - r) / d + 2;
        } else if (max === b) {
            h = (r - g) / d + 4;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
};

const CustomColorPicker = ({
    color,
    onChange,
    position
}: {
    color: string;
    onChange: (hex: string) => void;
    position: { top: number; left: number };
}) => {
    const { h, s, l } = hexToHsl(color);

    return (
        <div
            className="custom-color-picker fixed z-[200] bg-white dark:bg-[#1C1C1B] border border-[#E8E5E0] dark:border-[#2E2E2E] shadow-xl rounded-2xl p-3.5 w-[195px] space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D] dark:text-[#8D8D8C]">Color Picker</span>
                <div className="flex items-center gap-1.5">
                    <div
                        className="w-5 h-5 rounded-full border border-black/10 dark:border-white/10 shadow-sm"
                        style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] font-bold font-mono uppercase text-[#252525] dark:text-[#E8E5E0]">
                        {color}
                    </span>
                </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
                {/* Hue */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider font-bold text-[#7D7D7D]">
                        <span>Hue</span>
                        <span>{h}°</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={h}
                        onChange={(e) => {
                            const newH = Number(e.target.value);
                            // If base color is grayscale/black/white, boost saturation and normalize lightness
                            let newS = s;
                            let newL = l;
                            if (s <= 10) {
                                newS = 85;
                            }
                            if (l <= 15 || l >= 90) {
                                newL = 50;
                            }
                            onChange(hslToHex(newH, newS, newL));
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/30 [&::-moz-range-thumb]:appearance-none"
                        style={{
                            background: 'linear-gradient(to right, red, #ff0, #0f0, #0ff, #00f, #f0f, red)',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider font-bold text-[#7D7D7D]">
                        <span>Saturation</span>
                        <span>{s}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={s}
                        onChange={(e) => {
                            const newS = Number(e.target.value);
                            onChange(hslToHex(h, newS, l));
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/30 [&::-moz-range-thumb]:appearance-none"
                        style={{
                            background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`,
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Lightness */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[9px] uppercase tracking-wider font-bold text-[#7D7D7D]">
                        <span>Lightness</span>
                        <span>{l}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={l}
                        onChange={(e) => {
                            const newL = Number(e.target.value);
                            onChange(hslToHex(h, s, newL));
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/30 [&::-moz-range-thumb]:appearance-none"
                        style={{
                            background: `linear-gradient(to right, black, hsl(${h}, ${s}%, 50%), white)`,
                            outline: 'none'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default function PdfEditorPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();
    const dialog = useAppDialog();

    const [note, setNote] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [allPageDims, setAllPageDims] = useState<Record<number, { width: number; height: number }>>({});

    // Unified annotation model: per-page list
    const [annotsByPage, setAnnotsByPage] = useState<Record<number, Annotation[]>>({});

    // Undo/Redo history — each entry is a snapshot of annotsByPage
    const [history, setHistory] = useState<Record<number, Annotation[]>[]>([{}]);
    const [historyIdx, setHistoryIdx] = useState(0);

    // Tools
    const [activeTool, setActiveTool] = useState<Tool>("select");
    const [currentColor, setCurrentColor] = useState<string>("#1E1E1E");
    const [strokeWidth, setStrokeWidth] = useState<number>(3);
    const [highlightColor, setHighlightColor] = useState<string>("#FBBF24");

    // Rich text formatting state
    const [textFontFamily, setTextFontFamily] = useState("Times New Roman");
    const [textFontSize, setTextFontSize] = useState(14);
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [textUnderline, setTextUnderline] = useState(false);
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
    const [showFontMenu, setShowFontMenu] = useState(false);

    // Pending text input
    const [textInput, setTextInput] = useState<TextInput | null>(null);
    const [textValue, setTextValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showThumbnails, setShowThumbnails] = useState(false);
    const documentContainerRef = useRef<HTMLDivElement>(null);
    // Initialize exactly to viewport size so React-PDF doesn't default to 800px and stretch the layout
    const [containerWidth, setContainerWidth] = useState<number>(
        typeof window !== 'undefined' ? (window.innerWidth < 640 ? window.innerWidth : (window.innerWidth - 300) * 0.6) : 800
    );
    const [zoomLevel, setZoomLevel] = useState(1); // Manage desktop PDF zoom
    const [currentPage, setCurrentPage] = useState(1); // Track current active page for sidebar highlighting
    const fontButtonRef = useRef<HTMLButtonElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
    // Ref to the header div for direct DOM manipulation (no re-render)
    const headerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    // Ref to the spacer div that compensates for the fixed header height on mobile
    const headerSpacerRef = useRef<HTMLDivElement>(null);
    const thumbnailSidebarRef = useRef<HTMLDivElement>(null); // Ref for thumbnail sidebar to sync scrolling
    const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
    const textValueRef = useRef("");
    const textInputRef = useRef<any>(null);
    const annotsByPageRef = useRef<Record<number, Annotation[]>>({});
    const [showColorPicker, setShowColorPicker] = useState<"pen" | "highlight" | null>(null);
    const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleOutsideClick = (e: PointerEvent) => {
            if (!showColorPicker) return;
            const target = e.target as HTMLElement;
            if (!target.closest(".custom-color-picker") && !target.closest(".rainbow-picker-btn")) {
                setShowColorPicker(null);
            }
        };
        document.addEventListener("pointerdown", handleOutsideClick, true);
        return () => document.removeEventListener("pointerdown", handleOutsideClick, true);
    }, [showColorPicker]);

    useLayoutEffect(() => {
        textValueRef.current = textValue;
    }, [textValue]);

    useLayoutEffect(() => {
        textInputRef.current = textInput;
    }, [textInput]);

    useLayoutEffect(() => {
        annotsByPageRef.current = annotsByPage;
    }, [annotsByPage]);

    // Worker is managed inside PdfViewerWrapper — no setup needed here

    // Keep spacer height in sync with actual header height (handles text toolbar appearing/disappearing)
    useEffect(() => {
        const header = headerRef.current;
        const spacer = headerSpacerRef.current;
        if (!header || !spacer) return;

        // Only apply on mobile (< 640px)
        const syncHeight = () => {
            if (window.innerWidth < 640) {
                spacer.style.height = `${header.offsetHeight}px`;
            } else {
                spacer.style.height = '0px';
            }
        };

        const ro = new ResizeObserver(syncHeight);
        ro.observe(header);
        syncHeight(); // run immediately
        return () => ro.disconnect();
    }, []);

    // ── Body scroll lock: prevents window from scrolling when keyboard opens ────
    // We directly mutate body styles on mount/unmount (no React state = no re-renders)
    useEffect(() => {
        const body = document.body;
        const originalPosition = body.style.position;
        const originalTop = body.style.top;
        const originalWidth = body.style.width;
        const scrollY = window.scrollY;

        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';

        return () => {
            body.style.position = originalPosition;
            body.style.top = originalTop;
            body.style.width = originalWidth;
            window.scrollTo(0, scrollY);
        };
    }, []);

    // ── Keyboard open detection + header pinning (iOS Safari fix) ─────────────
    // On iOS, when keyboard opens, visualViewport scrolls (offsetTop > 0).
    // position:fixed elements move with this scroll — so we manually correct
    // the header's top to counteract it using direct DOM style mutation.
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const initialHeight = vv.height;

        const update = () => {
            // Header is no longer fixed, so it doesn't need counter-scrolling
            // Keyboard is considered open if viewport shrank by more than 120px
            const keyboardOpen = vv.height < initialHeight - 120;

            // Bring the tools bar up above the keyboard on mobile
            // Toolbar position is now handled by CSS fixed bottom-0 when keyboard is open
            // No manual top adjustment needed to prevent JS-induced bounce

            setIsKeyboardOpen(keyboardOpen);
        };

        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    // ── Intersection Observer to track the "Active" page for sidebar highlighting ──
    useEffect(() => {
        const container = documentContainerRef.current;
        if (!container || numPages === 0) return;

        const handleIntersect = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
                    const pageId = entry.target.id;
                    const pageNum = parseInt(pageId.replace('pdf-page-', ''));
                    if (!isNaN(pageNum)) {
                        setCurrentPage(pageNum);
                    }
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersect, {
            root: container,
            threshold: 0.5, // Page must be at least 50% visible in the viewport area
            rootMargin: '-20% 0px -20% 0px' // Focus on the middle 60% of the viewport
        });

        // Observe all page containers in the DOM
        const pageElements = container.querySelectorAll('[id^="pdf-page-"]');
        pageElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [numPages, zoomLevel]); // Re-bind if page count or zoom (and thus heights) change

    // ── Auto-scroll the thumbnail sidebar to keep the current page in view ──
    useEffect(() => {
        if (!showThumbnails && window.innerWidth < 640) return;
        
        const scrollActiveThumb = () => {
            const thumb = document.getElementById(`thumb-item-${currentPage}`);
            if (thumb) {
                // 'auto' scroll is extremely resilient on mobile browsers, preventing animations from getting aborted
                thumb.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
        };

        // Run immediately if DOM is already fully rendered
        scrollActiveThumb();

        // Multi-stage fallbacks to handle mounting delays, layout paint ticks, and cold loads
        const t1 = setTimeout(scrollActiveThumb, 100);
        const t2 = setTimeout(scrollActiveThumb, 300);
        const t3 = setTimeout(scrollActiveThumb, 600);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [currentPage, showThumbnails]);
    // Observe container width for responsive PDF pages
    useEffect(() => {
        if (!documentContainerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // On mobile, we want the PDF to be as wide as possible
                const isMobile = window.innerWidth < 640;
                // For mobile, subtract minimal padding (8px each side) or 0 if we want flush
                // For desktop, margin guarantees a clear gap (96px total = 48px each side)
                const margin = isMobile ? 0 : 96;
                // Set the default "100%" scale for desktop to be physically 60% of the available area 
                // as requested for ideal readability
                const availableWidth = entry.contentRect.width - margin;
                const finalWidth = isMobile ? availableWidth : availableWidth * 0.6;

                // Math.max(10, ...) ensures React-PDF doesn't crash from 0 width, but allows full shrinking
                setContainerWidth(Math.max(10, finalWidth));
            }
        });

        resizeObserver.observe(documentContainerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useStudyTracker({ activityType: "pdf", isEnabled: !isLoading, subject: "PDF", topic: note?.title || "Untitled PDF" });

    useEffect(() => {
        const fetchNote = async () => {
            try {
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Failed to fetch note");
                const data = await res.json();
                setNote(data.note);
                logRecentActivity({
                    item_id: id,
                    item_type: "pdf",
                    title: data.note.title || "Untitled PDF",
                    href: `/library/pdf/${id}`,
                });
            } catch {
                dialog.showAlert("Could not load PDF file.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        fetchNote();
    }, [id]);

    // Force focus when text box spawns/moves
    useEffect(() => {
        if (textInput && textareaRef.current) {
            // A quick timeout ensures the DOM has fully processed
            // the transition from the active canvas pointer capture
            setTimeout(() => {
                // Save scroll position before focus
                const container = documentContainerRef.current;
                const scrollTop = container?.scrollTop ?? 0;

                // preventScroll: true stops iOS Safari from auto-scrolling
                // the PDF area to bring the textarea into view.
                // This prevents the header from appearing to scroll away.
                textareaRef.current?.focus({ preventScroll: true });

                // Restore scroll position after iOS may have changed it
                if (container) {
                    requestAnimationFrame(() => {
                        container.scrollTop = scrollTop;
                    });
                }
            }, 10);
        }
    }, [textInput]);

    // ── History helpers ────────────────────────────────────────────────────────
    const pushHistory = useCallback((newAnnots: Record<number, Annotation[]>) => {
        setHistory((prev) => {
            const sliced = prev.slice(0, historyIdx + 1);
            return [...sliced, newAnnots];
        });
        setHistoryIdx(historyIdx + 1);
    }, [historyIdx]);

    const undo = () => {
        if (historyIdx <= 0) return;
        const newIdx = historyIdx - 1;
        setHistoryIdx(newIdx);
        setAnnotsByPage(history[newIdx]);
    };

    const redo = () => {
        if (historyIdx >= history.length - 1) return;
        const newIdx = historyIdx + 1;
        setHistoryIdx(newIdx);
        setAnnotsByPage(history[newIdx]);
    };

    // ── Annotation helpers ─────────────────────────────────────────────────────
    const addAnnotation = useCallback((pg: number, annotation: Annotation) => {
        const current = annotsByPageRef.current;
        const updated = { ...current, [pg]: [...(current[pg] || []), annotation] };
        setAnnotsByPage(updated);
        pushHistory(updated);
    }, [pushHistory]);

    const eraseAt = useCallback((pg: number, coords: { x: number; y: number }) => {
        const current = annotsByPageRef.current;
        const eraserRadius = strokeWidth * 3;
        const filtered = (current[pg] || []).filter((ann) => {
            if (ann.kind === "stroke") {
                return !ann.path.some(
                    (p) => Math.sqrt((p.x - coords.x) ** 2 + (p.y - coords.y) ** 2) < eraserRadius
                );
            }
            if (ann.kind === "text") {
                return Math.abs(ann.x - coords.x) > 60 || Math.abs(ann.y - coords.y) > 20;
            }
            return true;
        });
        if (filtered.length === (current[pg] || []).length) return;
        const updated = { ...current, [pg]: filtered };
        setAnnotsByPage(updated);
        pushHistory(updated);
    }, [strokeWidth, pushHistory]);

    const handleTextClick = (pg: number, x: number, y: number) => {
        // Did we hit an existing text annotation?
        const current = annotsByPageRef.current;
        const annots = current[pg] || [];
        let hitIndex = -1;
        for (let i = 0; i < annots.length; i++) {
            const ann = annots[i];
            if (ann.kind === "text") {
                const pxPerChar = ann.fontSize * 0.6;
                const w = ann.text.length * pxPerChar;
                let left = ann.x;
                if (ann.textAlign === "center") left = ann.x - w / 2;
                if (ann.textAlign === "right") left = ann.x - w;
                const right = left + w;
                const top = ann.y - ann.fontSize;
                const bottom = ann.y + ann.fontSize * 0.3;
                if (x >= left - 5 && x <= right + 5 && y >= top - 5 && y <= bottom + 5) {
                    hitIndex = i;
                    break;
                }
            }
        }

        if (hitIndex !== -1) {
            // Edit existing text
            const hit = annots[hitIndex];
            if (hit.kind === "text") {
                setCurrentColor(hit.color);
                setTextFontSize(hit.fontSize);
                setTextFontFamily(hit.fontFamily || "Times New Roman");
                setTextBold(hit.bold || false);
                setTextItalic(hit.italic || false);
                setTextUnderline(hit.underline || false);
                setTextAlign(hit.textAlign || "left");

                setTextInput({ pageNum: pg, x: hit.x, y: hit.y });
                setTextValue(hit.text);

                // Remove from canvas temporarily while editing
                const newAnnots = [...annots];
                newAnnots.splice(hitIndex, 1);
                setAnnotsByPage({ ...current, [pg]: newAnnots });
                return;
            }
        }

        // Create new
        setTextInput({ pageNum: pg, x, y });
        setTextValue("");
    };

    const handleDragPointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setTextInput(prev => prev ? {
            ...prev,
            isDragging: true,
            dragStartX: e.clientX,
            dragStartY: e.clientY,
            initialX: prev.x,
            initialY: prev.y
        } : null);
    };

    const handleDragPointerMove = (e: React.PointerEvent) => {
        if (!textInput?.isDragging) return;
        const container = document.getElementById(`pdf-page-${textInput.pageNum}`);
        const pageDims = allPageDims[textInput.pageNum];
        if (container && pageDims) {
            const rect = container.getBoundingClientRect();
            const scaleX = pageDims.width / rect.width;
            const scaleY = pageDims.height / rect.height;
            const dx = e.clientX - (textInput.dragStartX || 0);
            const dy = e.clientY - (textInput.dragStartY || 0);
            setTextInput(prev => prev ? {
                ...prev,
                x: prev.initialX! + dx * scaleX,
                y: prev.initialY! + dy * scaleY
            } : null);
        }
    };

    const handleDragPointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setTextInput(prev => prev ? { ...prev, isDragging: false } : null);
    };

    const deleteActiveText = (e: React.MouseEvent) => {
        e.stopPropagation();
        setTextInput(null);
        setTextValue("");
    };

    const commitText = () => {
        const val = textValueRef.current;
        const input = textInputRef.current;
        if (!input || !val.trim()) {
            setTextInput(null);
            setTextValue("");
            return;
        }
        addAnnotation(input.pageNum, {
            kind: "text",
            x: input.x,
            y: input.y,
            text: val,
            color: currentColor,
            fontSize: textFontSize,
            bold: textBold,
            italic: textItalic,
            underline: textUnderline,
            fontFamily: textFontFamily,
            textAlign: textAlign,
        });
        setTextInput(null);
        setTextValue("");
    };

    // ── Save PDF ───────────────────────────────────────────────────────────────
    const handleSavePdf = async () => {
        if (!note || !note.file_url) return;
        setIsSaving(true);
        try {
            const existingPdfBytes = await fetch(note.file_url).then((r) => r.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();

            for (const [pageNumStr, annotations] of Object.entries(annotsByPage)) {
                const pageNum = parseInt(pageNumStr);
                if (!annotations || annotations.length === 0) continue;
                const pageDims = allPageDims[pageNum];
                const page = pages[pageNum - 1];
                const { width, height } = page.getSize();
                const scaleX = pageDims ? width / pageDims.width : 1;
                const scaleY = pageDims ? height / pageDims.height : 1;

                for (const ann of annotations) {
                    if (ann.kind === "stroke" && ann.path.length >= 2) {
                        let r = 0, g = 0, b = 0, a = ann.opacity;
                        if (ann.color.startsWith("#") && ann.color.length === 7) {
                            r = parseInt(ann.color.slice(1, 3), 16) / 255;
                            g = parseInt(ann.color.slice(3, 5), 16) / 255;
                            b = parseInt(ann.color.slice(5, 7), 16) / 255;
                        }
                        let svgPath = `M ${ann.path[0].x * scaleX} ${ann.path[0].y * scaleY}`;
                        for (let i = 1; i < ann.path.length; i++) {
                            svgPath += ` L ${ann.path[i].x * scaleX} ${ann.path[i].y * scaleY}`;
                        }
                        page.drawSvgPath(svgPath, {
                            x: 0,
                            y: height,
                            borderColor: rgb(r, g, b),
                            borderWidth: ann.width * scaleX,
                            borderOpacity: a,
                            color: undefined,
                        });
                    } else if (ann.kind === "text") {
                        let r = 0, g = 0, b = 0;
                        if (ann.color.startsWith("#") && ann.color.length === 7) {
                            r = parseInt(ann.color.slice(1, 3), 16) / 255;
                            g = parseInt(ann.color.slice(3, 5), 16) / 255;
                            b = parseInt(ann.color.slice(5, 7), 16) / 255;
                        }
                        page.drawText(ann.text, {
                            x: ann.x * scaleX,
                            y: height - ann.y * scaleY,
                            size: ann.fontSize * scaleX,
                            color: rgb(r, g, b),
                        });
                    }
                }
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            const formData = new FormData();
            formData.append("file", blob, `note_${id}.pdf`);

            const res = await fetch(`/api/notes/${id}/pdf`, { method: "POST", body: formData });
            if (!res.ok) throw new Error("Failed to upload updated PDF");
            const data = await res.json();
            setNote(data.note);
            setAnnotsByPage({});
            setHistory([{}]);
            setHistoryIdx(0);
            dialog.showAlert("PDF saved successfully!", "success");
        } catch (error) {
            console.error(error);
            dialog.showAlert("Error saving PDF.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const toolBtn = (tool: Tool, icon: React.ReactNode, label: string, extraClass = "") =>
        <button
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveTool(tool)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-medium transition-all ${extraClass} ${activeTool === tool
                ? "bg-[#252525] text-white shadow-md"
                : "bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A]"
                }`}
            title={label}
        >
            <div className="transition-transform duration-200">{icon}</div>
            <span className="hidden sm:block">{label}</span>
        </button>;

    if (isLoading) {
        return <PdfSkeleton />;
    }

    if (!note || !note.file_url) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#252525] dark:text-white">
                <p>PDF file not found.</p>
                <button onClick={() => router.back()} className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-[#252525] transition-all">
                    <ArrowLeft size={24} />
                </button>
            </div>
        );
    }

    const canUndo = historyIdx > 0;
    const canRedo = historyIdx < history.length - 1;

    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1E1E1E] sm:bg-white sm:dark:bg-[#1A1A1A] transition-colors overflow-hidden">

            {/* Top Navigation Bar — fixed on mobile so keyboard can't push it off screen */}
            {/* On desktop (sm:) it reverts to normal static flow */}
            <div
                ref={headerRef}
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                    // If we're editing text and click header (but not a tool button which is separate), commit it
                    if (textInputRef.current) {
                        commitText();
                    }
                }}
                className="relative sm:static flex shrink-0 items-center justify-between px-4 h-14 bg-white dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E] z-50 transition-colors pt-[calc(env(safe-area-inset-top,0px)+2px)] sm:pt-0"
            >
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1 sm:gap-2">
                        {/* Sidebar Toggle - Only on Laptop + if sidebar is closed */}
                        {!sidebarOpen && (
                            <button
                                onClick={toggleSidebar}
                                className="hidden md:flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                                title="Open Sidebar"
                            >
                                <PanelLeft size={20} />
                            </button>
                        )}

                        {/* Always visible Back button */}
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                            title="Back"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        {/* Mobile Thumbnail Toggle */}
                        <button
                            onClick={() => setShowThumbnails(!showThumbnails)}
                            className={`sm:hidden p-2 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 ${showThumbnails ? "bg-[#252525] text-white" : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"}`}
                            title="Toggle Thumbnails"
                        >
                            <Layout size={20} />
                        </button>
                        <span className="text-sm font-semibold text-[#252525] dark:text-white max-w-[120px] sm:max-w-md truncate">
                            {note.title}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onPointerDown={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={undo}
                            disabled={!canUndo}
                            className="inline-flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30"
                            title="Undo"
                        >
                            <Undo2 size={18} />
                        </button>
                        <button
                            onPointerDown={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={redo}
                            disabled={!canRedo}
                            className="inline-flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30"
                            title="Redo"
                        >
                            <Redo2 size={18} />
                        </button>
                        <div className="hidden sm:block w-px h-6 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />
                        <button
                            onClick={() => window.open(note.file_url, "_blank")}
                            className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 bg-transparent border border-[#E8E5E0] dark:border-[#3A3A3A] text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 text-sm font-medium"
                            title="Download"
                        >
                            <Download size={16} />
                            <span className="hidden lg:inline ml-2">Download</span>
                        </button>
                        <button
                            onClick={handleSavePdf}
                            disabled={isSaving}
                            className="flex items-center justify-center p-2 sm:px-4 sm:py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#3A3A3A] dark:hover:bg-[#F5F3EF] rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 text-sm font-medium disabled:opacity-50 shadow-sm"
                            title="Save PDF"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span className="hidden sm:inline ml-2">Save</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed header on mobile — height is set dynamically via ResizeObserver */}
            {/* This ensures content is never hidden behind the header regardless of header height */}


            {/* Main Content Area — vertical on mobile, horizontal on laptop */}
            <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden relative">

                {/* Mobile Overlay - Closes sidebar when tapped outside */}
                {showThumbnails && (
                    <div
                        className="sm:hidden absolute inset-0 z-40 bg-black/60 transition-opacity backdrop-blur-sm"
                        onClick={() => setShowThumbnails(false)}
                    />
                )}

                {/* Left Sidebar - Thumbnails */}
                {/* Left Sidebar - Thumbnails: Always show on laptop, toggle on mobile as overlay */}
                <div
                    ref={thumbnailSidebarRef}
                    onClick={(e) => {
                        // If we're editing text and click sidebar (but not a tool button which is separate), commit it
                        if (textInputRef.current) {
                            commitText();
                        }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`
                    flex-col w-44 sm:w-64 flex-shrink-0 bg-white dark:bg-[#24221F] overflow-y-auto custom-scrollbar transition-colors
                    ${showThumbnails ? 'flex absolute top-0 bottom-0 left-0 z-50 shadow-xl sm:static sm:inset-auto sm:z-auto sm:shadow-none' : 'hidden sm:flex sm:static'}
                `}>
                    <div className="flex flex-col gap-4 py-4">
                        <PdfViewerWrapper
                            fileUrl={note.file_url}
                            mode="thumbnails"
                            currentPage={currentPage}
                            onNumPagesLoaded={(total) => setNumPages(total)}
                            onLoadError={() => {
                                dialog.showAlert(
                                    "Failed to fetch PDF file. It may have been deleted from storage or your internet connection is unstable.",
                                    "error"
                                );
                            }}
                            onThumbnailClick={(pg) => {
                                document.getElementById(`pdf-page-${pg}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                if (window.innerWidth < 640) setShowThumbnails(false);
                                setActiveTool("select");
                                if (textInput) commitText();
                            }}
                        />
                    </div>
                </div>

                {/* Center Canvas Area - min-w-0 is crucial for flex-1 to not overflow siblings */}
                <div
                    ref={documentContainerRef}
                    onClick={(e) => {
                        // If we're editing text and click outside the editor group, commit it
                        if (textInputRef.current && !(e.target as Element).closest('.group')) {
                            commitText();
                        }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex-1 min-w-0 bg-[#F5F3EF] dark:bg-[#1E1E1E] overflow-x-hidden relative flex justify-center p-0 pt-0 sm:pt-12 sm:px-12 custom-scrollbar select-none touch-none-callout ${showThumbnails ? 'overflow-hidden' : 'overflow-auto'}`}
                    style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
                >
                    <PdfViewerWrapper
                        fileUrl={note.file_url}
                        mode="full"
                        scale={zoomLevel}
                        width={containerWidth || undefined}
                        onNumPagesLoaded={(total) => setNumPages(total)}
                        onLoadError={() => {
                            dialog.showAlert(
                                "Failed to fetch PDF file. It may have been deleted from storage or your internet connection is unstable.",
                                "error"
                            );
                        }}
                        onPageDimLoaded={(pg, dim) => {
                            setAllPageDims(prev => {
                                if (prev[pg]) return prev;
                                return { ...prev, [pg]: dim };
                            });
                        }}
                        renderOverlay={(pg, dim) => (
                            <>
                                <PdfDrawingOverlay
                                    width={dim.width * zoomLevel}
                                    height={dim.height * zoomLevel}
                                    scale={zoomLevel}
                                    activeTool={activeTool}
                                    currentColor={activeTool === "highlight" ? highlightColor : currentColor}
                                    strokeWidth={strokeWidth}
                                    annotations={annotsByPage[pg] || []}
                                    onAnnotationAdd={(ann) => addAnnotation(pg, ann)}
                                    onEraseAt={(coords) => eraseAt(pg, coords)}
                                    onTextClick={(x, y) => handleTextClick(pg, x, y)}
                                    onStrokeWidthChange={(w) => setStrokeWidth(w)}
                                />
                                {textInput && textInput.pageNum === pg && allPageDims[pg] && (
                                    <div
                                        className="absolute z-30 flex flex-col items-start gap-1 group pointer-events-auto select-text"
                                        style={{
                                            left: textInput.x,
                                            top: textInput.y - textFontSize - 28,
                                            transform: `translateX(${textAlign === "center" ? "-50%" : textAlign === "right" ? "-100%" : "0"})`,
                                        }}
                                    >
                                        {/* Drag Handle & Controls */}
                                        <div
                                            className="flex items-center bg-white/95 dark:bg-[#1A1A1A]/95 border border-[#3B82F6] rounded-md shadow-md px-2 py-1 cursor-grab active:cursor-grabbing backdrop-blur-sm self-center transition-opacity opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                                            onPointerDown={handleDragPointerDown}
                                            onPointerMove={handleDragPointerMove}
                                            onPointerUp={handleDragPointerUp}
                                            onPointerCancel={handleDragPointerUp}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#545454] dark:text-[#7D7D7D]"><path d="M5 9h14M5 15h14" /></svg>
                                            <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-2" />
                                            <button
                                                onClick={deleteActiveText}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                className="text-red-500 hover:text-red-600 pointer-events-auto transition-colors"
                                                title="Delete Text"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            </button>
                                        </div>

                                        <textarea
                                            ref={textareaRef}
                                            autoFocus
                                            value={textValue}
                                            onChange={(e) => setTextValue(e.target.value)}
                                            onFocus={() => {
                                                if (commitTimerRef.current) {
                                                    clearTimeout(commitTimerRef.current);
                                                    commitTimerRef.current = null;
                                                }
                                            }}
                                            onBlur={(e) => {
                                                // On mobile, relatedTarget is often null.
                                                // We use a small timeout to see if focus comes back (e.g. after clicking a formatting button)
                                                commitTimerRef.current = setTimeout(() => {
                                                    // Only commit if we haven't refocused already
                                                    if (document.activeElement !== textareaRef.current) {
                                                        const groupElement = (e.relatedTarget as Element)?.closest?.('.group');
                                                        if (!e.relatedTarget || !groupElement) {
                                                            commitText();
                                                        }
                                                    }
                                                }, 150);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitText(); }
                                                if (e.key === "Escape") { deleteActiveText(e as any); }
                                            }}
                                            placeholder="Insert text here…"
                                            rows={1}
                                            className="bg-transparent border-0 border-b-2 border-dashed border-[#3B82F6] focus:border-solid outline-none resize-none overflow-hidden leading-tight p-0 mt-[-4px] select-text pointer-events-auto"
                                            style={{
                                                color: currentColor,
                                                fontSize: `${textFontSize}px`,
                                                fontFamily: textFontFamily,
                                                fontWeight: textBold ? "bold" : "normal",
                                                fontStyle: textItalic ? "italic" : "normal",
                                                textDecoration: textUnderline ? "underline" : "none",
                                                textAlign: textAlign,
                                                minWidth: 120,
                                                width: "auto",
                                                caretColor: currentColor,
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    />
                </div>
                {/* Right Sidebar - Tools (Bottom on Mobile, Right on Desktop) */}
                {/* On mobile, if the keyboard is open, this docks above the keyboard. If closed, docks at bottom. */}
                <div
                    ref={toolbarRef}
                    onPointerDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName !== "INPUT" && target.tagName !== "SELECT" && target.tagName !== "TEXTAREA") {
                            e.preventDefault();
                        }
                    }}
                    style={{ touchAction: 'manipulation' }}
                    className={`
                        flex-shrink-0 w-full sm:w-60 h-auto sm:h-full bg-white dark:bg-[#24221F] border-t sm:border-t-0 sm:border-l border-[#E8E5E0] dark:border-[#2A2A2A] py-2 px-4 pb-1 sm:pb-4 sm:p-4 flex-row sm:flex-col items-center sm:items-stretch gap-4 sm:gap-5 transition-all duration-500 overflow-x-auto sm:overflow-y-auto custom-scrollbar flex
                        ${activeTool === "select" ? 'sm:justify-start justify-center' : 'justify-start'}
                        ${isKeyboardOpen ? 'fixed left-0 right-0 bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] !pb-3 bg-white/95 backdrop-blur-md sm:static sm:bg-white sm:backdrop-blur-none' : 'static'}
                    `}
                >

                    {/* Tool Selection */}
                    <div className="flex flex-row sm:grid sm:grid-cols-2 gap-3 sm:gap-2 flex-shrink-0">
                        {toolBtn("select", <MousePointer2 size={22} />, "Select", "sm:hidden")}
                        {toolBtn("pen", <Pen size={22} />, "Pen")}
                        {toolBtn("highlight", <Highlighter size={22} />, "Highlight")}
                        {toolBtn("text", <Type size={22} />, "Text")}
                        {toolBtn("eraser", <Eraser size={22} />, "Eraser")}
                    </div>

                    <div className="hidden sm:block w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />
                    <div className="sm:hidden w-px h-8 bg-[#E8E5E0] dark:bg-[#3A3A3A]" />

                    {/* Stroke Size (pen/eraser only) */}
                    {(activeTool === "pen" || activeTool === "eraser") && (
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 flex-shrink-0 w-32 sm:w-full sm:pr-0">
                            <div className="flex justify-between w-full hidden sm:flex">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D]">Size</span>
                                <span className="text-[10px] sm:text-xs font-medium text-[#252525] dark:text-[#7D7D7D]">{strokeWidth}px</span>
                            </div>
                            <div className="flex flex-row items-center gap-2 w-full h-8 sm:h-auto">
                                <div className="hidden sm:block bg-[#7D7D7D] rounded-full flex-shrink-0" style={{ width: 4, height: 4 }} />
                                <input
                                    type="range"
                                    min="1"
                                    max="32"
                                    value={strokeWidth}
                                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                                    className="flex-1 w-24 sm:w-full cursor-pointer accent-[#252525] dark:accent-white"
                                    style={{ padding: 0 }}
                                />
                                <div className="hidden sm:block bg-[#252525] dark:bg-white rounded-full flex-shrink-0" style={{ width: 12, height: 12 }} />
                            </div>
                        </div>
                    )}

                    {/* Highlight Color picker */}
                    {activeTool === "highlight" && (
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 flex-shrink-0 pr-4 sm:pr-0">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Colors</span>

                            {/* Desktop: Show full grid */}
                            <div className="hidden sm:grid sm:grid-cols-5 gap-2 w-full">
                                {["#FEF08A", "#FDE047", "#FBBF24", "#A7F3D0", "#34D399", "#BFDBFE", "#60A5FA", "#FECACA", "#F87171"].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setHighlightColor(color)}
                                        className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 ${highlightColor === color ? "border-[#252525] dark:border-white ring-1 ring-[#252525]/20 dark:ring-white/20 shadow-sm" : "border-[#E8E5E0] dark:border-[#3A3A3A]"}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div
                                    className="rainbow-picker-btn relative w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 cursor-pointer border-[#E8E5E0] dark:border-[#3A3A3A] overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setColorPickerPosition({
                                            top: rect.bottom + window.scrollY + 8,
                                            left: Math.max(8, rect.left + window.scrollX - 160)
                                        });
                                        setShowColorPicker(showColorPicker === "highlight" ? null : "highlight");
                                    }}
                                >
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,purple,red)] opacity-80" />
                                </div>
                            </div>

                            {/* Mobile: Show only ONE color dot */}
                            <div className="sm:hidden relative w-8 h-8 rounded-full border-2 border-[#E8E5E0] dark:border-[#3A3A3A] overflow-hidden shadow-sm flex-shrink-0" style={{ backgroundColor: highlightColor }}>
                                <input
                                    type="color"
                                    value={highlightColor}
                                    onChange={(e) => setHighlightColor(e.target.value)}
                                    className="absolute opacity-0 inset-[-20px] w-16 h-16 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* Pen / Text Color */}
                    {(activeTool === "pen" || activeTool === "text") && (
                        <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 flex-shrink-0 pr-4 sm:pr-0">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Colors</span>

                            {/* Desktop: Show full grid */}
                            <div className="hidden sm:grid sm:grid-cols-5 gap-2 w-full">
                                {[
                                    "#1E1E1E", "#757575", "#E0E0E0", "#FFFFFF", "#EF4444",
                                    "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#10B981",
                                    "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
                                ].map((color) => (
                                    <button
                                        key={color}
                                        onPointerDown={(e) => e.preventDefault()}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setCurrentColor(color)}
                                        className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 ${currentColor === color ? "border-[#252525] dark:border-white shadow-sm ring-1 ring-[#252525]/20 dark:ring-white/20" : "border-[#E8E5E0] dark:border-[#3A3A3A]"}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div
                                    className="rainbow-picker-btn relative w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 cursor-pointer border-[#E8E5E0] dark:border-[#3A3A3A] overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setColorPickerPosition({
                                            top: rect.bottom + window.scrollY + 8,
                                            left: Math.max(8, rect.left + window.scrollX - 160)
                                        });
                                        setShowColorPicker(showColorPicker === "pen" ? null : "pen");
                                    }}
                                >
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,purple,red)] opacity-80" />
                                </div>
                            </div>

                            {/* Mobile: Show only ONE color dot */}
                            <div className="sm:hidden relative w-8 h-8 rounded-full border-2 border-[#E8E5E0] dark:border-[#3A3A3A] overflow-hidden shadow-sm flex-shrink-0" style={{ backgroundColor: currentColor }}>
                                <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => setCurrentColor(e.target.value)}
                                    className="absolute opacity-0 inset-[-20px] w-16 h-16 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}

                    {/* Text Formatting (Text Tool Only) */}
                    {activeTool === "text" && (
                        <>
                            <div className="hidden sm:block w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A] mt-2" />
                            <div className="sm:hidden w-px h-8 flex-shrink-0 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />

                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 w-auto sm:w-full flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Typography</span>
                                <div className={`flex flex-row sm:flex-col items-center sm:items-stretch gap-2 transition-all ${showFontMenu ? 'relative z-[110]' : 'relative'}`}>
                                    <button
                                        ref={fontButtonRef}
                                        onPointerDown={(e) => e.preventDefault()}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            if (!showFontMenu) {
                                                const rect = fontButtonRef.current?.getBoundingClientRect();
                                                if (rect) {
                                                    setMenuPos({
                                                        top: rect.top,
                                                        left: rect.left,
                                                        width: rect.width
                                                    });
                                                }
                                            }
                                            setShowFontMenu(!showFontMenu);
                                        }}
                                        className={`text-[10px] sm:text-xs h-8 sm:h-9 w-[110px] sm:w-auto px-2 flex-shrink-0 rounded-md border text-[#252525] dark:text-white flex items-center justify-between gap-1 transition-all active:scale-95
                                            ${showFontMenu
                                                ? 'border-[#3B82F6] bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-[#E8E5E0] dark:border-[#3A3A3A] bg-[#F5F3EF] dark:bg-[#1A1A1A]'
                                            }
                                        `}
                                    >
                                        <span className="truncate" style={{ fontFamily: textFontFamily }}>{textFontFamily}</span>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-200 ${showFontMenu ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Font Size Adjustments */}
                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Size</span>
                                <div className="flex gap-1 border sm:border-0 border-[#E8E5E0] dark:border-[#3A3A3A] sm:border-transparent rounded-md p-0.5 sm:p-0">
                                    <button
                                        onPointerDown={(e) => e.preventDefault()}
                                        onClick={() => setTextFontSize(s => Math.max(8, s - 2))}
                                        title="Decrease font size"
                                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white transition-all active:scale-90"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M4 20l5-15h2l5 15M6 15h8M18 12h5" />
                                        </svg>
                                    </button>
                                    <button
                                        onPointerDown={(e) => e.preventDefault()}
                                        onClick={() => setTextFontSize(s => Math.min(128, s + 2))}
                                        title="Increase font size"
                                        className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white transition-all active:scale-95"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M4 20l5-15h2l5 15M6 15h8M18 12h6M21 9v6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Style</span>
                                <div className="flex gap-1 border sm:border-0 border-[#E8E5E0] dark:border-[#3A3A3A] sm:border-transparent rounded-md p-0.5 sm:p-0">
                                    <button
                                        onPointerDown={(e) => e.preventDefault()}
                                        onClick={() => setTextBold(b => !b)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md font-bold text-sm transition-all ${textBold ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                    >B</button>
                                    <button
                                        onPointerDown={(e) => e.preventDefault()}
                                        onClick={() => setTextItalic(i => !i)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md italic text-sm transition-all ${textItalic ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                    >I</button>
                                    <button
                                        onPointerDown={(e) => e.preventDefault()}
                                        onClick={() => setTextUnderline(u => !u)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md underline text-sm transition-all ${textUnderline ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                    >U</button>
                                </div>
                            </div>

                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 flex-shrink-0 pr-4 sm:pr-0">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Alignment</span>
                                <div className="flex gap-1 border sm:border-0 border-[#E8E5E0] dark:border-[#3A3A3A] sm:border-transparent rounded-md p-0.5 sm:p-0">
                                    {(["left", "center", "right"] as const).map((align) => (
                                        <button
                                            key={align}
                                            onPointerDown={(e) => e.preventDefault()}
                                            onClick={() => setTextAlign(align)}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md text-xs transition-all ${textAlign === align ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                        >
                                            {align === "left" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>}
                                            {align === "center" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>}
                                            {align === "right" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* Global Font Menu Overlay */}
            {showFontMenu && (
                <div
                    className="fixed inset-0 z-[100]"
                    onPointerDown={(e) => {
                        e.preventDefault();
                        setShowFontMenu(false);
                    }}
                >
                    <div
                        className="fixed bg-white dark:bg-[#2A2A2A] border border-gray-200 dark:border-[#444] rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-[101]"
                        style={{
                            // Check if it should be above or below based on screen height
                            top: menuPos.top > window.innerHeight / 2
                                ? 'auto'
                                : `${menuPos.top + (window.innerWidth < 640 ? 36 : 40)}px`,
                            bottom: menuPos.top > window.innerHeight / 2
                                ? `${window.innerHeight - menuPos.top + 8}px`
                                : 'auto',
                            left: `${menuPos.left}px`,
                            width: `${Math.max(140, menuPos.width)}px`
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {["Times New Roman", "Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS"].map(f => (
                            <button
                                key={f}
                                onPointerDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    setTextFontFamily(f);
                                    setShowFontMenu(false);
                                }}
                                style={{ fontFamily: f }}
                                className={`w-full text-left px-2.5 py-1.5 text-[13px] transition-colors ${textFontFamily === f ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "text-[#252525] dark:text-white hover:bg-gray-50 dark:hover:bg-[#333]"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {showColorPicker && (
                <CustomColorPicker
                    color={showColorPicker === "pen" ? currentColor : highlightColor}
                    onChange={(hex) => {
                        if (showColorPicker === "pen") {
                            setCurrentColor(hex);
                        } else {
                            setHighlightColor(hex);
                        }
                    }}
                    position={colorPickerPosition}
                />
            )}
        </div>
    );
}
