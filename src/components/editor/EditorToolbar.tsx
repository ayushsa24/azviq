import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { createPortal } from "react-dom";
import {
    Bold, Italic, Underline, Link as LinkIcon,
    Sparkles, Highlighter, Rows, Columns,
    Plus, Minus, Trash2, Copy, ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef, useReducer } from "react";
import { AiPopover } from "./AiPopover";
import { MobileSelectionBar } from "./MobileSelectionBar";
import { LinkPopover } from "./LinkPopover";

interface EditorToolbarProps {
    editor: Editor | null;
    isQuotaExceeded?: boolean;
}

export function EditorToolbar({ editor, isQuotaExceeded = false }: EditorToolbarProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [toolbarPos, setToolbarPos] = useState<{ x: number; bottom: number } | null>(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiPos, setAiPos] = useState<{ x: number; bottom: number } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isError, setIsError] = useState(false);
    const isGeneratingRef = useRef(false);
    const suppressNextMouseUpRef = useRef(false);
    const [mobileHasSelection, setMobileHasSelection] = useState(false);
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    // Force re-render on every editor transaction so isActive() is always current
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    // ── Mobile detection ──────────────────────────────────────────────────────
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const toolbarRef = useRef<HTMLDivElement>(null);

    // ── Show toolbar on mouseup when text is selected (desktop only) ──────────
    useEffect(() => {
        if (!editor) return;

        const onMouseUp = (e: MouseEvent) => {
            // If the user is clicking inside the toolbar itself (like clicking "Bold"), 
            // do not recalculate the position, otherwise the toolbar jumps as text changes width.
            if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
                return;
            }

            // If AI just closed, skip this mouseup and reset flag
            if (suppressNextMouseUpRef.current) {
                suppressNextMouseUpRef.current = false;
                return;
            }
            // small delay so ProseMirror finishes updating selection state
            setTimeout(() => {
                const { selection } = editor.state;
                // Only show toolbar if: editor is editable (note not locked), text is selected, not mobile
                if (!editor.isEditable || selection.empty || isMobile) {
                    setToolbarPos(null);
                    return;
                }
                try {
                    const coords = editor.view.coordsAtPos(selection.to);
                    setToolbarPos({ x: coords.left, bottom: coords.bottom });
                } catch {
                    setToolbarPos(null);
                }
            }, 10);
        };

        // Hide toolbar when selection is cleared
        const onSelectionUpdate = () => {
            if (editor.state.selection.empty) {
                setToolbarPos(null);
                if (!isGeneratingRef.current) setIsAiOpen(false);
                setIsLinkOpen(false);
                // also hide mobile bar
                setMobileHasSelection(false);
            }
        };

        document.addEventListener("mouseup", onMouseUp);
        editor.on("selectionUpdate", onSelectionUpdate);

        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            editor.off("selectionUpdate", onSelectionUpdate);
        };
    }, [editor, isMobile]);

    // ── Mobile: detect selection via touchend + selectionchange ───────────────
    useEffect(() => {
        if (!editor || !isMobile) return;

        const checkMobileSelection = () => {
            // Give the browser a moment to update the selection
            setTimeout(() => {
                if (!editor.isEditable) { setMobileHasSelection(false); return; }
                const { selection } = editor.state;
                setMobileHasSelection(!selection.empty);
            }, 50);
        };

        // touchend fires after the user lifts their finger (drag-to-select)
        document.addEventListener("touchend", checkMobileSelection, { passive: true });
        // selectionchange fires when the browser's native selection changes
        document.addEventListener("selectionchange", checkMobileSelection, { passive: true });

        return () => {
            document.removeEventListener("touchend", checkMobileSelection);
            document.removeEventListener("selectionchange", checkMobileSelection);
        };
    }, [editor, isMobile]);

    // ── Re-render on editor transactions (debounced via rAF to prevent infinite loops) ──
    useEffect(() => {
        if (!editor) return;
        let rafId: number;
        const onTx = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => forceUpdate());
        };
        editor.on('transaction', onTx);
        return () => {
            editor.off('transaction', onTx);
            cancelAnimationFrame(rafId);
        };
    }, [editor]);

    if (!editor) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const prevent = (fn: () => void) => (e: React.MouseEvent) => {
        e.preventDefault();
        fn();
    };

    const isActive = (type: string) => editor.isActive(type);

    const btnBase = "p-1.5 rounded-md transition-all duration-100 text-[#7D7D7D] dark:text-[#7D7D7D]";
    const btnActive = "bg-[#252525] dark:bg-white text-white dark:text-[#252525] shadow-sm";

    const openAi = () => {
        if (isMobile) {
            // On mobile, anchor the popup to the bottom of the visual viewport
            const vvh = window.visualViewport?.height ?? window.innerHeight;
            setAiPos({ x: window.innerWidth / 2, bottom: vvh });
        } else if (toolbarPos) {
            setAiPos(toolbarPos);
        }
        setIsAiOpen(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Mobile bar */}
            <MobileSelectionBar
                editor={editor}
                onOpenAi={openAi}
                isVisible={isMobile && editor.isEditable && mobileHasSelection && !isAiOpen}
            />

            {/* Desktop selection toolbar — portal into body, fixed near last selected word */}
            {!isMobile && toolbarPos && !isAiOpen &&
                createPortal(
                    <div
                        ref={toolbarRef}
                        className="fixed z-[1000] flex items-center gap-1 bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-lg rounded-full px-3 py-1.5 pointer-events-auto animate-in fade-in duration-150"
                        style={{
                            // Clamp Y: if selection-end is near/below viewport bottom, cap at 70px from bottom
                            top: Math.min(toolbarPos.bottom + 8, window.innerHeight - 70),
                            // Clamp X: keep toolbar within viewport (account for ~150px toolbar half-width)
                            left: Math.max(80, Math.min(toolbarPos.x, window.innerWidth - 80)),
                            transform: "translateX(-50%)",
                            willChange: "transform",
                            isolation: "isolate",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {/* Ask AI */}
                        <button
                            onMouseDown={prevent(openAi)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white/90 rounded-full text-xs font-semibold shadow-sm transition-colors"
                        >
                            <Sparkles size={14} />
                            Ask AI
                            <ChevronDown size={12} />
                        </button>

                        <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />

                        {/* Bold */}
                        <button onMouseDown={prevent(() => editor.chain().focus().toggleBold().run())}
                            className={`${btnBase} ${isActive("bold") ? btnActive : ""}`}>
                            <Bold size={16} />
                        </button>
                        {/* Italic */}
                        <button onMouseDown={prevent(() => editor.chain().focus().toggleItalic().run())}
                            className={`${btnBase} ${isActive("italic") ? btnActive : ""}`}>
                            <Italic size={16} />
                        </button>
                        {/* Underline */}
                        <button onMouseDown={prevent(() => editor.chain().focus().toggleUnderline().run())}
                            className={`${btnBase} ${isActive("underline") ? btnActive : ""}`}>
                            <Underline size={16} />
                        </button>

                        <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />

                        {/* Highlight */}
                        <button onMouseDown={prevent(() => editor.chain().focus().toggleHighlight({ color: "#ffcc00" }).run())}
                            className={`${btnBase} ${isActive("highlight") ? btnActive : ""}`}>
                            <Highlighter size={16} />
                        </button>
                        {/* Link */}
                        <button onMouseDown={prevent(() => setIsLinkOpen(true))}
                            className={`${btnBase} ${isActive("link") ? btnActive : ""}`}>
                            <LinkIcon size={16} />
                        </button>
                    </div>,
                    document.body
                )
            }

            {/* Desktop Link Popover */}
            {!isMobile && isLinkOpen && toolbarPos &&
                createPortal(
                    <LinkPopover
                        editor={editor}
                        anchorPos={toolbarPos}
                        onClose={() => setIsLinkOpen(false)}
                    />,
                    document.body
                )
            }
            {/* AI commands popup */}
            {isAiOpen && aiPos &&
                createPortal(
                    <div
                        className="fixed z-[2000]"
                        style={isMobile ? {
                            // Mobile: bottom-sheet anchored just above the mobile toolbar
                            bottom: 80,
                            left: 0,
                            right: 0,
                            display: 'flex',
                            justifyContent: 'center',
                        } : {
                            // Desktop: positioned exactly where the EditorToolbar was (below text)
                            top: Math.min(aiPos.bottom + 8, window.innerHeight - 280),
                            left: Math.max(80, Math.min(aiPos.x, window.innerWidth - 80)),
                            transform: "translateX(-50%) translateZ(0)",
                            willChange: "transform",
                            isolation: "isolate",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        <AiPopover
                            editor={editor}
                            onClose={() => {
                                suppressNextMouseUpRef.current = true;
                                setIsAiOpen(false);
                                setToolbarPos(null);
                                setAiPos(null);
                                setMobileHasSelection(false);
                                // Collapse selection to cursor so no stale text range remains
                                try { editor.commands.setTextSelection(editor.state.selection.to); } catch {}
                            }}
                            onGenerating={(gen) => { setIsGenerating(gen); isGeneratingRef.current = gen; }}
                            onError={(err) => setIsError(err)}
                            isQuotaExceeded={isQuotaExceeded}
                        />
                    </div>,
                    document.body
                )
            }

            {/* Table controls (BubbleMenu only when cursor is inside a table) */}
            <BubbleMenu
                editor={editor}
                pluginKey="tableBubbleMenu"
                updateDelay={100}
                shouldShow={({ editor, state }) => {
                    return editor.isEditable && editor.isActive("table") && state.selection.empty;
                }}
                className="flex items-center gap-1 bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-lg rounded-lg px-2 py-1"
            >
                <div className="flex items-center gap-0.5 border-r border-[#E8E5E0] dark:border-[#3A3A3A] pr-1 mr-1">
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className={btnBase} title="Add Row Above">
                        <div className="relative"><Rows size={16} /><Plus size={8} className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full" /></div>
                    </button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className={btnBase} title="Add Row Below">
                        <div className="relative"><Rows size={16} /><Plus size={8} className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full" /></div>
                    </button>
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className={`${btnBase} hover:bg-red-50 hover:text-red-600`} title="Delete Row">
                        <div className="relative"><Rows size={16} /><Minus size={8} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" /></div>
                    </button>
                </div>

                <div className="flex items-center gap-0.5 border-r border-[#E8E5E0] dark:border-[#3A3A3A] pr-1 mr-1">
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className={btnBase} title="Add Column Before">
                        <div className="relative"><Columns size={16} /><Plus size={8} className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full" /></div>
                    </button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className={btnBase} title="Add Column After">
                        <div className="relative"><Columns size={16} /><Plus size={8} className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full" /></div>
                    </button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className={`${btnBase} hover:bg-red-50 hover:text-red-600`} title="Delete Column">
                        <div className="relative"><Columns size={16} /><Minus size={8} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" /></div>
                    </button>
                </div>

                <button onClick={() => editor.chain().focus().deleteTable().run()}
                    className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 text-xs font-medium" title="Delete Table">
                    <Trash2 size={16} />
                    <span className="hidden md:inline">Delete Table</span>
                </button>
            </BubbleMenu>
        </>
    );
}
