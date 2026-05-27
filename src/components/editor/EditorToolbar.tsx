import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { createPortal } from "react-dom";
import {
    Bold, Italic, Underline, Link as LinkIcon,
    Sparkles, Highlighter, Rows, Columns,
    Plus, Minus, Trash2, Copy, ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AiPopover } from "./AiPopover";
import { MobileSelectionBar } from "./MobileSelectionBar";

interface EditorToolbarProps {
    editor: Editor | null;
    isQuotaExceeded?: boolean;
}

export function EditorToolbar({ editor, isQuotaExceeded = false }: EditorToolbarProps) {
    const [isMobile, setIsMobile] = useState(false);
    // toolbar position: x = left, bottom = bottom-of-selection in viewport
    const [toolbarPos, setToolbarPos] = useState<{ x: number; bottom: number } | null>(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    // position where AI popup should appear (same as toolbar)
    const [aiPos, setAiPos] = useState<{ x: number; bottom: number } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isError, setIsError] = useState(false);
    const isGeneratingRef = useRef(false);
    // Suppresses the mouseup right after AI closes (prevent re-triggering toolbar)
    const suppressNextMouseUpRef = useRef(false);

    // ── Mobile detection ──────────────────────────────────────────────────────
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // ── Show toolbar on mouseup when text is selected (desktop only) ──────────
    useEffect(() => {
        if (!editor) return;

        const onMouseUp = () => {
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
            }
        };

        document.addEventListener("mouseup", onMouseUp);
        editor.on("selectionUpdate", onSelectionUpdate);

        return () => {
            document.removeEventListener("mouseup", onMouseUp);
            editor.off("selectionUpdate", onSelectionUpdate);
        };
    }, [editor, isMobile]);

    if (!editor) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const prevent = (fn: () => void) => (e: React.MouseEvent) => {
        e.preventDefault();
        fn();
    };

    const isActive = (type: string) => editor.isActive(type);

    const btnBase = "p-1.5 rounded-md transition-all text-[#545454] dark:text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white";
    const btnActive = "bg-[#252525] text-white dark:bg-white dark:text-[#252525]";

    const openAi = () => {
        // Capture current toolbar position so AI popup appears in the same spot
        if (toolbarPos) setAiPos(toolbarPos);
        setIsAiOpen(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Mobile bar */}
            <MobileSelectionBar
                editor={editor}
                onOpenAi={openAi}
                isVisible={isMobile && editor.isEditable && !editor.state.selection.empty && !isAiOpen}
            />

            {/* Desktop selection toolbar — portal into body, fixed near last selected word */}
            {!isMobile && toolbarPos && !isAiOpen &&
                createPortal(
                    <div
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
                        <button onMouseDown={prevent(() => {
                            const prev = editor.getAttributes("link").href;
                            const url = window.prompt("URL", prev);
                            if (url === null) return;
                            if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
                            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                        })}
                            className={`${btnBase} ${isActive("link") ? btnActive : ""}`}>
                            <LinkIcon size={16} />
                        </button>
                    </div>,
                    document.body
                )
            }

            {/* AI commands popup — same position as the toolbar, flips up when near bottom */}
            {isAiOpen && aiPos &&
                createPortal(
                    <div
                        className="fixed z-[2000]"
                        style={{
                            // If toolbar is in bottom half of screen, open popup UPWARD so it's never clipped
                            ...(aiPos.bottom > window.innerHeight / 2
                                ? { bottom: window.innerHeight - aiPos.bottom + 48 }
                                : { top: aiPos.bottom + 8 }
                            ),
                            left: Math.max(80, Math.min(aiPos.x, window.innerWidth - 80)),
                            transform: "translateX(-50%) translateZ(0)",
                            willChange: "transform",
                            isolation: "isolate",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <AiPopover
                            editor={editor}
                            onClose={() => {
                                suppressNextMouseUpRef.current = true; // block the mouseup from this button click
                                setIsAiOpen(false);
                                setToolbarPos(null);
                                setAiPos(null);
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
