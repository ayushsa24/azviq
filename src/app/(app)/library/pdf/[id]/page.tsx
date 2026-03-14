"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Save, Download, Loader2, Undo2, Redo2,
    Pen, Eraser, Highlighter, Type
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { PdfDrawingOverlay, Annotation } from "@/components/pdf/PdfDrawingOverlay";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { logRecentActivity } from "@/lib/logRecentActivity";
import { useStudyTracker } from "@/hooks/useStudyTracker";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Tool = "pen" | "eraser" | "highlight" | "text";

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

    const [note, setNote] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

    // Unified annotation model: per-page list
    const [annotsByPage, setAnnotsByPage] = useState<Record<number, Annotation[]>>({});

    // Undo/Redo history — each entry is a snapshot of annotsByPage
    const [history, setHistory] = useState<Record<number, Annotation[]>[]>([{}]);
    const [historyIdx, setHistoryIdx] = useState(0);

    // Tools
    const [activeTool, setActiveTool] = useState<Tool>("pen");
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

    const pageContainerRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
        if (container && pageDimensions) {
            const rect = container.getBoundingClientRect();
            const scaleX = pageDimensions.width / rect.width;
            const scaleY = pageDimensions.height / rect.height;
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
                const page = pages[pageNum - 1];
                const { width, height } = page.getSize();
                const scaleX = pageDimensions ? width / pageDimensions.width : 1;
                const scaleY = pageDimensions ? height / pageDimensions.height : 1;

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
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all ${activeTool === tool
                ? "bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white ring-1 ring-[#252525] dark:ring-white"
                : `bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] ${extraClass}`
            }`}
            title={label}
        >
            {icon}
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
            {/* Floating text input */}


            {/* Top Navigation Bar */}
            <div className="flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-md dark:bg-[#24221F] border-b border-[#E8E5E0] dark:border-[#2A2A2A] shadow-sm z-10 transition-colors">
                <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.history.length > 2 ? router.back() : router.push("/library")}
                        className="p-2 transition-colors text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-semibold text-[#252525] dark:text-white max-w-[200px] sm:max-w-md truncate">
                        {note.title}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={undo}
                        disabled={!canUndo}
                        className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors disabled:opacity-30"
                        title="Undo"
                    >
                        <Undo2 size={18} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={!canRedo}
                        className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors disabled:opacity-30"
                        title="Redo"
                    >
                        <Redo2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />
                    <button
                        onClick={() => window.open(note.file_url, "_blank")}
                        className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-[#E8E5E0] dark:border-[#3A3A3A] text-[#545454] dark:text-white hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] rounded-md text-sm font-medium transition-colors"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                        onClick={handleSavePdf}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white/90 rounded-md text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save PDF
                    </button>
                </div>
                </div>

                {/* Text Formatting Toolbar — only visible when text tool is active */}
                {activeTool === "text" && (
                    <div className="flex items-center gap-1 px-4 py-2 border-t border-[#E8E5E0] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1C19] overflow-x-auto">
                        {/* Font Family */}
                        <select
                            value={textFontFamily}
                            onChange={(e) => setTextFontFamily(e.target.value)}
                            className="text-xs h-7 px-2 rounded border border-[#E8E5E0] dark:border-[#3A3A3A] bg-white dark:bg-[#252525] text-[#252525] dark:text-white outline-none"
                        >
                            {["Times New Roman", "Arial", "Georgia", "Courier New", "Verdana", "Trebuchet MS"].map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>

                        {/* Font Size */}
                        <select
                            value={textFontSize}
                            onChange={(e) => setTextFontSize(Number(e.target.value))}
                            className="text-xs h-7 w-14 px-1 rounded border border-[#E8E5E0] dark:border-[#3A3A3A] bg-white dark:bg-[#252525] text-[#252525] dark:text-white outline-none"
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>

                        <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1 flex-shrink-0" />

                        {/* Bold */}
                        <button
                            onClick={() => setTextBold(b => !b)}
                            className={`w-7 h-7 flex items-center justify-center rounded font-bold text-sm transition-colors ${textBold ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                            title="Bold"
                        >B</button>

                        {/* Italic */}
                        <button
                            onClick={() => setTextItalic(i => !i)}
                            className={`w-7 h-7 flex items-center justify-center rounded italic text-sm transition-colors ${textItalic ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                            title="Italic"
                        >I</button>

                        {/* Underline */}
                        <button
                            onClick={() => setTextUnderline(u => !u)}
                            className={`w-7 h-7 flex items-center justify-center rounded underline text-sm transition-colors ${textUnderline ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                            title="Underline"
                        >U</button>

                        <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1 flex-shrink-0" />

                        {/* Text Color */}
                        <label className="flex items-center gap-1 cursor-pointer text-xs text-[#545454] dark:text-[#7D7D7D]" title="Text Color">
                            <span>A</span>
                            <input
                                type="color"
                                value={currentColor}
                                onChange={(e) => setCurrentColor(e.target.value)}
                                className="w-6 h-6 cursor-pointer rounded border-0 p-0 bg-transparent"
                            />
                        </label>

                        <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1 flex-shrink-0" />

                        {/* Alignment */}
                        {(["left", "center", "right"] as const).map((align) => (
                            <button
                                key={align}
                                onClick={() => setTextAlign(align)}
                                title={`Align ${align}`}
                                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${textAlign === align ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525]" : "hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] text-[#252525] dark:text-white"}`}
                            >
                                {align === "left" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>}
                                {align === "center" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>}
                                {align === "right" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Thumbnails */}
                <div className="hidden lg:flex w-64 flex-col bg-white dark:bg-[#24221F] border-r border-[#E8E5E0] dark:border-[#2A2A2A] overflow-y-auto p-4 gap-4 custom-scrollbar transition-colors">
                    <Document file={note.file_url} className="flex flex-col gap-4">
                        {Array.from(new Array(numPages), (_, index) => (
                            <div
                                key={`thumb_${index + 1}`}
                                className="cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:border-[#E8E5E0] dark:hover:border-[#545454] border-transparent"
                                onClick={() => document.getElementById(`pdf-page-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                            >
                                <Page pageNumber={index + 1} width={120} renderAnnotationLayer={false} renderTextLayer={false} className="shadow-sm bg-white m-auto" />
                                <div className="text-center py-1 text-xs text-[#545454] dark:text-[#7D7D7D] bg-[#F5F3EF] dark:bg-[#1A1A1A]">{index + 1}</div>
                            </div>
                        ))}
                    </Document>
                </div>

                {/* Center Canvas Area */}
                <div className="flex-1 bg-[#E8E5E0] dark:bg-[#161514] overflow-auto relative flex justify-center p-8 custom-scrollbar">
                    <Document
                        file={note.file_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="flex flex-col items-center gap-6"
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
                                    key={`page_${pg}`}
                                    id={`pdf-page-${pg}`}
                                    ref={(el) => { pageContainerRefs.current[pg] = el; }}
                                    className="relative shadow-2xl bg-white select-none"
                                >
                                    <Page
                                        pageNumber={pg}
                                        className="bg-white pointer-events-none"
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        onRenderSuccess={(pageInfo) => {
                                            setPageDimensions({ width: pageInfo.width, height: pageInfo.height });
                                        }}
                                    />
                                    {pageDimensions && (
                                        // Disable canvas pointer events while a text box is open on this page
                                        <div className={textInput?.pageNum === pg ? "pointer-events-none" : ""}>
                                            <PdfDrawingOverlay
                                                width={pageDimensions.width}
                                                height={pageDimensions.height}
                                                activeTool={activeTool}
                                                currentColor={activeTool === "highlight" ? highlightColor : currentColor}
                                                strokeWidth={strokeWidth}
                                                annotations={annotsByPage[pg] || []}
                                                onAnnotationAdd={(ann) => addAnnotation(pg, ann)}
                                                onEraseAt={(coords) => eraseAt(pg, coords)}
                                                onTextClick={(x, y) => handleTextClick(pg, x, y)}
                                            />
                                        </div>
                                    )}

                                    {/* Inline text input — rendered directly on the page */}
                                    {textInput && textInput.pageNum === pg && pageDimensions && (
                                        <div
                                            className="absolute z-30 flex flex-col items-start gap-1 group"
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
                                                className="bg-transparent border-0 border-b-2 border-dashed border-[#3B82F6] focus:border-solid outline-none resize-none overflow-hidden leading-tight p-0 mt-[-4px]"
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

                {/* Right Sidebar - Tools */}
                <div className="w-16 sm:w-64 flex-shrink-0 bg-white dark:bg-[#24221F] border-l border-[#E8E5E0] dark:border-[#2A2A2A] p-4 flex flex-col items-center sm:items-stretch gap-5 transition-colors overflow-y-auto custom-scrollbar">

                    {/* Tool Selection */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                        {toolBtn("pen", <Pen size={18} />, "Pen")}
                        {toolBtn("highlight", <Highlighter size={18} />, "Highlighter")}
                        {toolBtn("text", <Type size={18} />, "Text")}
                        {toolBtn("eraser", <Eraser size={18} />, "Eraser")}
                    </div>

                    <div className="w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />

                    {/* Stroke Size (pen/eraser only) */}
                    {(activeTool === "pen" || activeTool === "eraser") && (
                        <div className="flex flex-col gap-3 w-full">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Size</span>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                {[2, 4, 6, 8, 12].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setStrokeWidth(size)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${strokeWidth === size ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] ring-1 ring-[#252525] dark:ring-white" : "hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A]"}`}
                                    >
                                        <div className="bg-[#252525] dark:bg-white rounded-full" style={{ width: size, height: size }} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Highlight Color picker */}
                    {activeTool === "highlight" && (
                        <div className="flex flex-col gap-3 w-full">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Highlight Color</span>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                {["#FBBF24", "#34D399", "#60A5FA", "#F87171", "#C084FC", "#FB923C"].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setHighlightColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${highlightColor === color ? "border-[#252525] dark:border-white ring-2 ring-[#252525]/20 dark:ring-white/20 shadow-md" : "border-[#E8E5E0] dark:border-[#3A3A3A]"}`}
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pen / Text Color */}
                    {(activeTool === "pen" || activeTool === "text") && (
                        <>
                            <div className="w-full h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />
                            <div className="flex flex-col gap-3 w-full">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Color</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        "#1E1E1E", "#757575", "#E0E0E0", "#FFFFFF",
                                        "#EF4444", "#F59E0B", "#10B981", "#3B82F6",
                                        "#8B5CF6", "#EC4899", "#14B8A6", "#84CC16",
                                    ].map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setCurrentColor(color)}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color ? "border-[#252525] dark:border-white shadow-md ring-2 ring-[#252525]/20 dark:ring-white/20" : "border-[#E8E5E0] dark:border-[#3A3A3A]"}`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
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
