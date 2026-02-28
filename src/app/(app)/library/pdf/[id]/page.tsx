"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Download, Loader2, Undo2, Redo2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { PdfDrawingOverlay, Stroke } from "@/components/pdf/PdfDrawingOverlay";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the PDF.js worker using an unpkg CDN for reliability
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfEditorPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [note, setNote] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Layout & Drawing State
    const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [strokesByPage, setStrokesByPage] = useState<Record<number, Stroke[]>>({});

    // Tools State
    const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
    const [currentColor, setCurrentColor] = useState<string>("#252525");
    const [strokeWidth, setStrokeWidth] = useState<number>(3);

    useEffect(() => {
        const fetchNote = async () => {
            try {
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Failed to fetch note");
                const data = await res.json();
                setNote(data.note);
            } catch (error) {
                console.error("Error fetching note:", error);
                alert("Could not load PDF file.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchNote();
    }, [id]);

    const handleSavePdf = async () => {
        if (!note || !note.file_url) return;
        setIsSaving(true);
        try {
            // 1. Fetch original PDF
            const existingPdfBytes = await fetch(note.file_url).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();

            // 2. Iterate and draw strokes for each page
            Object.keys(strokesByPage).forEach((pageNumStr) => {
                const pageNum = parseInt(pageNumStr);
                const strokes = strokesByPage[pageNum];
                if (!strokes || strokes.length === 0) return;

                const page = pages[pageNum - 1]; // 0-indexed in pdf-lib
                const { width, height } = page.getSize();

                // To correctly scale strokes drawn on the canvas to the PDF size,
                // we need the ratio between canvas dimensions and PDF dimensions.
                const scaleX = pageDimensions ? width / pageDimensions.width : 1;
                const scaleY = pageDimensions ? height / pageDimensions.height : 1;

                strokes.forEach(stroke => {
                    if (stroke.path.length < 2) return;

                    // Parse color (assuming #RRGGBB)
                    let r = 0, g = 0, b = 0;
                    if (stroke.color.startsWith('#') && stroke.color.length === 7) {
                        r = parseInt(stroke.color.slice(1, 3), 16) / 255;
                        g = parseInt(stroke.color.slice(3, 5), 16) / 255;
                        b = parseInt(stroke.color.slice(5, 7), 16) / 255;
                    }

                    // Build SVG path string mapping canvas coordinates to PDF coordinates
                    let svgPath = `M ${stroke.path[0].x * scaleX} ${stroke.path[0].y * scaleY}`;
                    for (let i = 1; i < stroke.path.length; i++) {
                        // PDF-lib's drawSvgPath draws using SVG coords where origin is top-left and Y extends down.
                        // BUT it places this SVG coordinate origin at the PDF (0,0) which is bottom-left!
                        // To fix this, we will pass `y: height` into drawSvgPath options so the origin is at the top-left of the PDF page.
                        svgPath += ` L ${stroke.path[i].x * scaleX} ${stroke.path[i].y * scaleY}`;
                    }

                    // Draw the path
                    page.drawSvgPath(svgPath, {
                        x: 0,
                        y: height,
                        borderColor: rgb(r, g, b),
                        borderWidth: stroke.width * scaleX,
                        color: undefined, // no fill
                    });
                });
            });

            // 3. Save PDF and Upload
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const formData = new FormData();
            formData.append("file", blob, `note_${id}.pdf`);

            const res = await fetch(`/api/notes/${id}/pdf`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Failed to upload updated PDF");
            const data = await res.json();

            // Optionally update state to clear unsaved drawing overlay if we assume it's burned in
            setNote(data.note);
            setStrokesByPage({});

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#F5F5F5] dark:bg-[#1A1A1A]">
                <Loader2 className="animate-spin text-[#545454] dark:text-[#7D7D7D]" size={32} />
            </div>
        );
    }

    if (!note || !note.file_url) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF]">
                <p>PDF file not found.</p>
                <button onClick={() => router.back()} className="text-[#252525] dark:text-[#CFCFCF] hover:bg-gray-200 dark:hover:bg-[#252525] p-3 rounded-full transition-all" title="Go Back">
                    <ArrowLeft size={24} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F5F5F5] dark:bg-[#161514] overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#FFFFFF] dark:bg-[#24221F] border-b border-[#E0E0E0] dark:border-[#2A2A2A] shadow-sm z-10 transition-colors">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.history.length > 2) {
                                router.back();
                            } else {
                                router.push("/library");
                            }
                        }}
                        className="p-2 transition-colors text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-semibold text-[#252525] dark:text-[#CFCFCF] max-w-[200px] sm:max-w-md truncate">
                        {note.title}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <button className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors" title="Undo">
                        <Undo2 size={18} />
                    </button>
                    <button className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md transition-colors" title="Redo">
                        <Redo2 size={18} />
                    </button>
                    <div className="w-px h-6 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1"></div>
                    <button
                        onClick={() => window.open(note.file_url, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-[#E0E0E0] dark:border-[#3A3A3A] text-[#545454] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md text-sm font-medium transition-colors"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Download</span>
                    </button>
                    <button
                        onClick={handleSavePdf}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save PDF
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Thumbnails */}
                <div className="hidden lg:flex w-64 flex-col bg-[#FFFFFF] dark:bg-[#24221F] border-r border-[#E0E0E0] dark:border-[#2A2A2A] overflow-y-auto p-4 gap-4 custom-scrollbar transition-colors">
                    <Document file={note.file_url} className="flex flex-col gap-4">
                        {Array.from(new Array(numPages), (el, index) => (
                            <div
                                key={`thumb_${index + 1}`}
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${pageNumber === index + 1 ? 'border-[#252525] dark:border-[#CFCFCF] shadow-md ring-2 ring-[#252525]/20 dark:ring-[#CFCFCF]/20' : 'border-transparent hover:border-[#E0E0E0] dark:hover:border-[#545454]'}`}
                                onClick={() => {
                                    setPageNumber(index + 1);
                                    document.getElementById(`pdf-page-${index + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                            >
                                <Page
                                    pageNumber={index + 1}
                                    width={120}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                    className="shadow-sm bg-white m-auto"
                                />
                                <div className="text-center py-1 text-xs text-[#545454] dark:text-[#7D7D7D] bg-[#F5F5F5] dark:bg-[#1A1A1A]">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </Document>
                </div>

                {/* Center Canvas Area */}
                <div className="flex-1 bg-[#E8E5E0] dark:bg-[#161514] overflow-auto relative flex justify-center p-8 custom-scrollbar">
                    <Document
                        file={note.file_url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        className="flex flex-col items-center gap-6 relative"
                        loading={
                            <div className="flex items-center gap-2 text-[#545454] dark:text-[#7D7D7D]">
                                <Loader2 size={24} className="animate-spin" />
                                <span>Loading PDF...</span>
                            </div>
                        }
                    >
                        {Array.from(new Array(numPages), (_, index) => {
                            const pg = index + 1;
                            return (
                                <div key={`page_${pg}`} id={`pdf-page-${pg}`} className="relative shadow-2xl bg-white select-none">
                                    <Page
                                        pageNumber={pg}
                                        className="bg-white pointer-events-none"
                                        renderAnnotationLayer={false}
                                        renderTextLayer={false}
                                        onRenderSuccess={(pageInfo) => {
                                            setPageDimensions({
                                                width: pageInfo.width,
                                                height: pageInfo.height
                                            });
                                        }}
                                    />
                                    {pageDimensions && (
                                        <PdfDrawingOverlay
                                            width={pageDimensions.width}
                                            height={pageDimensions.height}
                                            activeTool={activeTool}
                                            currentColor={currentColor}
                                            strokeWidth={strokeWidth}
                                            strokes={strokesByPage[pg] || []}
                                            setStrokes={(newStrokes) => {
                                                setStrokesByPage((prev) => ({
                                                    ...prev,
                                                    [pg]: typeof newStrokes === 'function' ? newStrokes(prev[pg] || []) : newStrokes
                                                }));
                                            }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </Document>
                </div>

                {/* Right Sidebar - Tools */}
                <div className="w-16 sm:w-64 flex-shrink-0 bg-[#FFFFFF] dark:bg-[#24221F] border-l border-[#E0E0E0] dark:border-[#2A2A2A] p-4 flex flex-col items-center sm:items-stretch gap-6 transition-colors overflow-y-auto custom-scrollbar">

                    {/* Tool Selection */}
                    <div className="flex sm:flex-row flex-col gap-2 w-full">
                        <button
                            onClick={() => setActiveTool('pen')}
                            className={`flex-1 flex justify-center items-center py-2 sm:py-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-[#252525]/10 dark:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] ring-1 ring-[#252525] dark:ring-[#CFCFCF]' : 'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A]'}`}
                            title="Pen Tool"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                        </button>
                        <button
                            onClick={() => setActiveTool('eraser')}
                            className={`flex-1 flex justify-center items-center py-2 sm:py-3 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500' : 'bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A]'}`}
                            title="Eraser Tool"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path><path d="M22 21H7"></path><path d="m5 11 9 9"></path></svg>
                        </button>
                    </div>

                    <div className="w-full h-px bg-[#E0E0E0] dark:bg-[#3A3A3A]"></div>

                    {/* Size Selector */}
                    <div className="flex flex-col gap-3 w-full opacity-100 transition-opacity" style={{ opacity: activeTool === 'pen' ? 1 : 0.5 }}>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Size</span>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            {[2, 4, 6, 8, 12].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setStrokeWidth(size)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${strokeWidth === size ? 'bg-[#E0E0E0] dark:bg-[#3A3A3A]' : 'hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A]'}`}
                                >
                                    <div className="bg-[#252525] dark:bg-white rounded-full" style={{ width: size, height: size }}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full h-px bg-[#E0E0E0] dark:bg-[#3A3A3A]"></div>

                    {/* Color Swatches */}
                    <div className="flex flex-col gap-3 w-full opacity-100 transition-opacity" style={{ opacity: activeTool === 'pen' ? 1 : 0.5 }}>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#7D7D7D] hidden sm:block">Color</span>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
                            {[
                                '#1E1E1E', '#757575', '#E0E0E0', '#FFFFFF',
                                '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
                                '#8B5CF6', '#EC4899', '#14B8A6', '#84CC16'
                            ].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => {
                                        setCurrentColor(color);
                                        setActiveTool('pen');
                                    }}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === color && activeTool === 'pen' ? 'border-[#252525] dark:border-[#CFCFCF] shadow-md ring-2 ring-[#252525]/20 dark:ring-[#CFCFCF]/20' : 'border-[#E0E0E0] dark:border-[#3A3A3A]'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}
