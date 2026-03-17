"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Save, Download, Loader2, Undo2, Redo2,
    Pen, Eraser, Highlighter, Type, Layout, MousePointer2, ZoomIn, ZoomOut, PanelLeft
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { PdfDrawingOverlay, Annotation } from "@/components/pdf/PdfDrawingOverlay";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useSidebar } from "@/contexts/SidebarContext";
import { logRecentActivity } from "@/lib/logRecentActivity";
import { useStudyTracker } from "@/hooks/useStudyTracker";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

export default function PdfEditorPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();

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

    const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});
    // Ref to the header div for direct DOM manipulation (no re-render)
    const headerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    // Ref to the spacer div that compensates for the fixed header height on mobile
    const headerSpacerRef = useRef<HTMLDivElement>(null);
    const thumbnailSidebarRef = useRef<HTMLDivElement>(null); // Ref for thumbnail sidebar to sync scrolling

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
            // Correct the header position so it stays at the top of the visible area
            if (headerRef.current) {
                headerRef.current.style.top = `${vv.offsetTop}px`;
            }
            // Keyboard is considered open if viewport shrank by more than 120px
            const keyboardOpen = vv.height < initialHeight - 120;
            
            // Bring the tools bar up above the keyboard on mobile
            if (toolbarRef.current) {
                if (keyboardOpen && window.innerWidth < 640) {
                     toolbarRef.current.style.top = `${vv.offsetTop + vv.height - toolbarRef.current.offsetHeight}px`;
                } else {
                     toolbarRef.current.style.top = ''; // revert to native CSS flow
                }
            }
            
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

        // Observe all page containers
        Object.values(pageContainerRefs.current).forEach(ref => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [numPages, zoomLevel]); // Re-bind if page count or zoom (and thus heights) change

    // ── Live sync: scroll thumbnail sidebar to current page ───────────────────
    useEffect(() => {
        // Only trigger auto-scroll for mobile users; laptop users prefer a static sidebar
        if (!thumbnailSidebarRef.current || currentPage === 0 || window.innerWidth >= 640) return;
        
        const thumbElement = document.getElementById(`thumb-item-${currentPage}`);
        if (thumbElement) {
            thumbElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [currentPage]);
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
                alert("Could not load PDF file.");
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
        setHistoryIdx((prev) => prev + 1);
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
        setAnnotsByPage((prev) => {
            const updated = { ...prev, [pg]: [...(prev[pg] || []), annotation] };
            pushHistory(updated);
            return updated;
        });
    }, [pushHistory]);

    const eraseAt = useCallback((pg: number, coords: { x: number; y: number }) => {
        setAnnotsByPage((prev) => {
            const eraserRadius = strokeWidth * 3;
            const filtered = (prev[pg] || []).filter((ann) => {
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
            if (filtered.length === (prev[pg] || []).length) return prev;
            const updated = { ...prev, [pg]: filtered };
            return updated;
        });
    }, [strokeWidth]);

    const handleTextClick = (pg: number, x: number, y: number) => {
        // Did we hit an existing text annotation?
        const annots = annotsByPage[pg] || [];
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
                setAnnotsByPage(prev => {
                    const newAnnots = [...(prev[pg] || [])];
                    newAnnots.splice(hitIndex, 1);
                    return { ...prev, [pg]: newAnnots };
                });
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
        const container = pageContainerRefs.current[textInput.pageNum];
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
        if (!textInput || !textValue.trim()) {
            setTextInput(null);
            return;
        }
        addAnnotation(textInput.pageNum, {
            kind: "text",
            x: textInput.x,
            y: textInput.y,
            text: textValue,
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
            alert("PDF saved successfully!");
        } catch (error) {
            console.error(error);
            alert("Error saving PDF.");
        } finally {
            setIsSaving(false);
        }
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    const toolBtn = (tool: Tool, icon: React.ReactNode, label: string, extraClass = "") =>
        <button
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
        return (
            <div className="flex items-center justify-center h-full bg-[#F5F3EF] dark:bg-[#1A1A1A]">
                <Loader2 className="animate-spin text-[#545454] dark:text-[#7D7D7D]" size={32} />
            </div>
        );
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
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#161514] overflow-hidden">

            {/* Top Navigation Bar — fixed on mobile so keyboard can't push it off screen */}
            {/* On desktop (sm:) it reverts to normal static flow */}
            <div ref={headerRef} className="fixed top-0 left-0 right-0 sm:static flex flex-col bg-white/80 backdrop-blur-md dark:bg-[#24221F] border-b border-[#E8E5E0] dark:border-[#2A2A2A] shadow-sm z-50 transition-colors pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:pt-0">
                <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Sidebar Toggle - Only on Laptop + if sidebar is closed */}
                    {!sidebarOpen && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors"
                            title="Open Sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>
                    )}

                    {/* Always visible Back button */}
                    <button
                        onClick={() => router.back()}
                        className="p-2 transition-colors text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    {/* Mobile Thumbnail Toggle */}
                    <button
                        onClick={() => setShowThumbnails(!showThumbnails)}
                        className={`sm:hidden p-2 rounded-md transition-colors ${showThumbnails ? "bg-[#252525] text-white" : "text-[#545454] dark:text-[#7D7D7D] hover:bg-gray-100 dark:hover:bg-[#1A1A1A]"}`}
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
                        onClick={undo}
                        disabled={!canUndo}
                        className="inline-flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors disabled:opacity-30"
                        title="Undo"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="inline-flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors disabled:opacity-30"
                        title="Redo"
                    >
                        <Redo2 size={18} />
                    </button>

                    {/* Zoom Controls (Desktop only) */}
                    <div className="hidden sm:flex items-center mx-2 gap-1 bg-[#F5F3EF] dark:bg-[#1A1A1A] rounded-md p-0.5">
                        <button
                            onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.2))}
                            className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white hover:bg-white dark:hover:bg-[#2A2A2A] rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} />
                        </button>
                        <span className="text-xs font-medium text-[#545454] dark:text-[#7D7D7D] w-12 text-center select-none">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))}
                            className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white hover:bg-white dark:hover:bg-[#2A2A2A] rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} />
                        </button>
                    </div>

                    <div className="hidden sm:block w-px h-6 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />
                    <button
                        onClick={() => window.open(note.file_url, "_blank")}
                        className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 bg-transparent border border-[#E8E5E0] dark:border-[#3A3A3A] text-[#545454] dark:text-white hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] rounded-md text-sm font-medium transition-colors"
                        title="Download"
                    >
                        <Download size={16} />
                        <span className="hidden lg:inline ml-2">Download</span>
                    </button>
                    <button
                        onClick={handleSavePdf}
                        disabled={isSaving}
                        className="flex items-center justify-center p-2 sm:px-4 sm:py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
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
            <div ref={headerSpacerRef} className="sm:hidden flex-shrink-0" />

            {/* Main Content Area — vertical on mobile, horizontal on laptop */}
            <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden relative">
                
                {/* Mobile Overlay - Closes sidebar when tapped outside */}
                {showThumbnails && (
                    <div 
                        className="sm:hidden absolute inset-0 z-10 bg-black/50 transition-opacity backdrop-blur-sm"
                        onClick={() => setShowThumbnails(false)}
                    />
                )}

                {/* Left Sidebar - Thumbnails */}
                {/* Left Sidebar - Thumbnails: Always show on laptop, toggle on mobile as overlay */}
                <div 
                    ref={thumbnailSidebarRef}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`
                    flex-col w-40 flex-shrink-0 bg-white dark:bg-[#24221F] border-r border-[#E8E5E0] dark:border-[#2A2A2A] overflow-y-auto p-4 gap-4 custom-scrollbar transition-colors
                    ${showThumbnails ? 'flex absolute top-[calc(env(safe-area-inset-top,0px)+52px)] bottom-0 left-0 z-40 shadow-xl sm:static sm:inset-auto sm:z-auto sm:shadow-none' : 'hidden sm:flex sm:static'}
                `}>
                    <Document file={note.file_url} className="flex flex-col gap-4 items-center">
                    {Array.from(new Array(numPages), (_, index) => (
                        <div
                            key={`thumb_${index + 1}`}
                            id={`thumb-item-${index + 1}`}
                            className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-300 ${(currentPage === index + 1 && typeof window !== 'undefined' && window.innerWidth < 640) ? "border-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-[1.02]" : "border-transparent hover:border-[#E8E5E0] dark:hover:border-[#545454]"}`}
                            onClick={() => {
                                document.getElementById(`pdf-page-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                if (window.innerWidth < 640) setShowThumbnails(false);
                                
                                // Reset to select tool when navigating via sidebar to prevent accidental draws
                                setActiveTool("select");
                                // If user was typing text, finish it
                                if (textInput) commitText();
                            }}
                        >
                            <Page pageNumber={index + 1} width={120} renderAnnotationLayer={false} renderTextLayer={false} className="shadow-sm bg-white m-auto" />
                            <div className={`text-center py-1 text-xs font-medium transition-colors ${(currentPage === index + 1 && typeof window !== 'undefined' && window.innerWidth < 640) ? "text-[#3B82F6] bg-blue-50 dark:bg-blue-900/20" : "text-[#545454] dark:text-[#7D7D7D] bg-[#F5F3EF] dark:bg-[#1A1A1A]"}`}>{index + 1}</div>
                        </div>
                    ))}
                    </Document>
                </div>

                {/* Center Canvas Area - min-w-0 is crucial for flex-1 to not overflow siblings */}
                <div ref={documentContainerRef} className="flex-1 min-w-0 bg-[#E8E5E0] dark:bg-[#161514] overflow-auto overflow-x-hidden relative flex justify-center p-0 pt-[calc(env(safe-area-inset-top,0px)+52px)] sm:pt-12 sm:px-12 custom-scrollbar">
                    <Document
                        file={note.file_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="flex flex-col gap-4 sm:gap-8 pb-32 items-center"
                        loading={
                            <div className="flex items-center gap-2 text-[#545454] dark:text-[#7D7D7D]">
                                <Loader2 size={24} className="animate-spin" />
                                <span>Loading PDF…</span>
                            </div>
                        }
                    >
                        {Array.from(new Array(numPages), (_, index) => {
                            const pg = index + 1;
                            return (
                                <div
                                    key={`page_${index + 1}`}
                                    id={`pdf-page-${index + 1}`}
                                    ref={(el) => { pageContainerRefs.current[pg] = el; }}
                                    className="relative bg-white shadow-md sm:shadow-lg transition-all"
                                >
                                    <Page
                                        pageNumber={pg}
                                        width={containerWidth || undefined}
                                        scale={zoomLevel}
                                        className="bg-white pointer-events-none"
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        onRenderSuccess={(pageInfo) => {
                                            if (zoomLevel !== 1) return; // Only capture base layout dimensions at 100%
                                            setAllPageDims(prev => {
                                                if (prev[pg]) return prev;
                                                return {
                                                    ...prev,
                                                    [pg]: { width: pageInfo.width, height: pageInfo.height }
                                                };
                                            });
                                        }}
                                    />
                                    {allPageDims[pg] && (
                                        <PdfDrawingOverlay
                                            width={allPageDims[pg].width * zoomLevel}
                                            height={allPageDims[pg].height * zoomLevel}
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
                                    )}

                                    {/* Inline text input — rendered directly on the page */}
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
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#545454] dark:text-[#7D7D7D]"><path d="M5 9h14M5 15h14"/></svg>
                                                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-2" />
                                                <button
                                                    onClick={deleteActiveText}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    className="text-red-500 hover:text-red-600 pointer-events-auto transition-colors"
                                                    title="Delete Text"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                                </button>
                                            </div>

                                            <textarea
                                                ref={textareaRef}
                                                autoFocus
                                                value={textValue}
                                                onChange={(e) => setTextValue(e.target.value)}
                                                onBlur={(e) => {
                                                    // Only commit if clicking outside the drag handle
                                                    if (!e.relatedTarget || !(e.relatedTarget as Element).closest('.group')) {
                                                        commitText();
                                                    }
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
                                                    fontSize: textFontSize,
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
                                </div>
                            );
                        })}
                    </Document>
                </div>
                {/* Right Sidebar - Tools (Bottom on Mobile, Right on Desktop) */}
                {/* On mobile, if the keyboard is open, this docks above the keyboard. If closed, docks at bottom. */}
                <div ref={toolbarRef} className={`
                    flex-shrink-0 w-full sm:w-56 h-auto sm:h-full bg-white dark:bg-[#24221F] border-t sm:border-t-0 sm:border-l border-[#E8E5E0] dark:border-[#2A2A2A] py-2 px-4 pb-1 sm:pb-4 sm:p-4 flex-row sm:flex-col items-center sm:items-stretch gap-4 sm:gap-5 transition-all duration-500 overflow-x-auto sm:overflow-y-auto custom-scrollbar flex
                    ${activeTool === "select" ? 'sm:justify-start justify-center' : 'justify-start'}
                    ${isKeyboardOpen ? 'fixed left-0 right-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] !pb-3 bg-white/95 backdrop-blur-md sm:static sm:bg-white sm:backdrop-blur-none' : 'static'}
                `}>

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
                                <div className="relative w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 flex items-center justify-center overflow-hidden border-[#E8E5E0] dark:border-[#3A3A3A]">
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,purple,red)] opacity-80" />
                                    <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="absolute opacity-0 inset-[-20px] w-20 h-20 cursor-pointer" />
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
                                        onClick={() => setCurrentColor(color)}
                                        className={`w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 ${currentColor === color ? "border-[#252525] dark:border-white shadow-sm ring-1 ring-[#252525]/20 dark:ring-white/20" : "border-[#E8E5E0] dark:border-[#3A3A3A]"}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div className="relative w-8 h-8 rounded-full border transition-transform hover:scale-110 flex-shrink-0 flex items-center justify-center overflow-hidden border-[#E8E5E0] dark:border-[#3A3A3A]">
                                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,red,orange,yellow,green,blue,purple,red)] opacity-80" />
                                    <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} className="absolute opacity-0 inset-[-20px] w-20 h-20 cursor-pointer" />
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
                                <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-2">
                                    <select
                                        value={textFontFamily}
                                        onChange={(e) => setTextFontFamily(e.target.value)}
                                        className="text-[10px] sm:text-xs h-8 sm:h-9 w-[110px] sm:w-auto px-1 sm:px-2 flex-shrink-0 rounded-md border border-[#E8E5E0] dark:border-[#3A3A3A] bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#252525] dark:text-white outline-none"
                                    >
                                        {["Times New Roman", "Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS"].map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-3 flex-shrink-0">
                                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Style</span>
                                <div className="flex gap-1 border sm:border-0 border-[#E8E5E0] dark:border-[#3A3A3A] sm:border-transparent rounded-md p-0.5 sm:p-0">
                                    <button
                                        onClick={() => setTextBold(b => !b)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md font-bold text-sm transition-all ${textBold ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                    >B</button>
                                    <button
                                        onClick={() => setTextItalic(i => !i)}
                                        className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md italic text-sm transition-all ${textItalic ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                    >I</button>
                                    <button
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
                                            onClick={() => setTextAlign(align)}
                                            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md text-xs transition-all ${textAlign === align ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "bg-[#F5F3EF] dark:bg-[#1A1A1A] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                                        >
                                            {align === "left" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>}
                                            {align === "center" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>}
                                            {align === "right" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
