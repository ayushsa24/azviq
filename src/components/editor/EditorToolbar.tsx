import { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
    Bold,
    Italic,
    Underline,
    Link as LinkIcon,
    Sparkles,
    MessageSquareQuote,
    Highlighter,
    Table as TableIcon,
    Rows,
    Columns,
    Plus,
    Minus,
    Trash2,
    ArrowUp,
    ArrowDown,
    Copy,
    ChevronDown,
    FileText,
    Wand2,
    CheckCheck,
    Minimize2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AiPopover } from "./AiPopover";

interface EditorToolbarProps {
    editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const [isAiOpen, setIsAiOpen] = useState(false);
    const [aiCoords, setAiCoords] = useState<{ top: number, left: number } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const isGeneratingRef = useRef(false);

    const handleOpenAi = () => {
        if (!editor) return;
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);

        // Find nearest relative parent to calculate absolute position
        const editorEl = editor.view.dom;
        const container = editorEl.closest('.relative');
        let absoluteTop = coords.top;
        let absoluteLeft = coords.left;

        if (container) {
            const rect = container.getBoundingClientRect();
            absoluteTop = coords.top - rect.top;
            absoluteLeft = coords.left - rect.left;
        }

        setAiCoords({ top: absoluteTop, left: absoluteLeft });
        setIsAiOpen(true);
    };

    useEffect(() => {
        if (!editor) return;

        const handleSelectionUpdate = () => {
            if (isGeneratingRef.current) return;
            setIsAiOpen(false);
        };

        editor.on('selectionUpdate', handleSelectionUpdate);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <>
            <BubbleMenu
                editor={editor}
                pluginKey="mainBubbleMenu"
                updateDelay={100}
                appendTo={() => document.body}
                shouldShow={({ editor, state, from, to }) => {
                    // Hide the standard bubble toolbar if AI menu is open
                    if (isAiOpen) return false;

                    const { doc, selection } = state;
                    const { empty } = selection;
                    const isEmptyTextBlock = doc.textBetween(from, to).length === 0;

                    return editor.isEditable && !empty && !isEmptyTextBlock;
                }}
                className="z-[1000] flex items-center gap-1 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-lg rounded-full px-3 py-1.5 backdrop-blur-md"
            >
                <button
                    onClick={handleOpenAi}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white/90 rounded-full text-xs font-semibold shadow-sm transition-all group"
                >
                    <Sparkles size={14} className="group-hover:animate-pulse" />
                    Ask AI
                    <ChevronDown size={14} className={`transition-transform ${isAiOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />

                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive("bold")
                        ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] text-[#252525] dark:text-white"
                        : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        }`}
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive("italic")
                        ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] text-[#252525] dark:text-white"
                        : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        }`}
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive("underline")
                        ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] text-[#252525] dark:text-white"
                        : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        }`}
                >
                    <Underline size={16} />
                </button>

                <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />

                <button
                    onClick={() => {
                        if (typeof window === "undefined") return;
                        const previousUrl = editor.getAttributes('link').href;
                        const url = window.prompt("URL", previousUrl);

                        if (url === null) return;
                        if (url === "") {
                            editor.chain().focus().extendMarkRange('link').unsetLink().run();
                            return;
                        }
                        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                    }}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive("link")
                        ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] text-[#252525] dark:text-white"
                        : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        }`}
                >
                    <LinkIcon size={16} />
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffcc00' }).run()}
                    className={`p-1.5 rounded-md transition-colors ${editor.isActive("highlight")
                        ? "bg-[#F0EDE8] dark:bg-[#3A3A3A] text-[#252525] dark:text-white"
                        : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        }`}
                >
                    <Highlighter size={16} />
                </button>
            </BubbleMenu>

            {isAiOpen && aiCoords && (
                <div
                    className={`z-[2000] drop-shadow-2xl ${isGenerating
                        ? 'fixed bottom-8 left-1/2 -translate-x-1/2'
                        : 'absolute shadow-2xl'
                        }`}
                    style={isGenerating ? {} : {
                        top: `${Math.max(0, aiCoords.top - 80)}px`,
                        left: `${Math.max(0, aiCoords.left - 50)}px`
                    }}
                >
                    <AiPopover
                        editor={editor}
                        onClose={() => setIsAiOpen(false)}
                        onGenerating={(gen) => { setIsGenerating(gen); isGeneratingRef.current = gen; }}
                    />
                </div>
            )}

            <BubbleMenu
                editor={editor}
                pluginKey="tableBubbleMenu"
                updateDelay={100}
                shouldShow={({ editor, state }) => {
                    const { selection } = state;
                    const { empty } = selection;
                    return editor.isEditable && editor.isActive('table') && empty;
                }}
                className="flex items-center gap-1 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-lg rounded-lg px-2 py-1 backdrop-blur-md"
            >
                <div className="flex items-center gap-0.5 border-r border-[#E8E5E0] dark:border-[#3A3A3A] pr-1 mr-1">
                    <button
                        onClick={() => editor.chain().focus().addRowBefore().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        title="Add Row Above"
                    >
                        <div className="relative">
                            <Rows size={16} />
                            <Plus size={8} className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full" />
                        </div>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        title="Add Row Below"
                    >
                        <div className="relative">
                            <Rows size={16} />
                            <Plus size={8} className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full" />
                        </div>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Row"
                    >
                        <div className="relative">
                            <Rows size={16} />
                            <Minus size={8} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" />
                        </div>
                    </button>
                </div>

                <div className="flex items-center gap-0.5 border-r border-[#E8E5E0] dark:border-[#3A3A3A] pr-1 mr-1">
                    <button
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        title="Add Column Before"
                    >
                        <div className="relative">
                            <Columns size={16} />
                            <Plus size={8} className="absolute -top-1 -left-1 bg-green-500 text-white rounded-full" />
                        </div>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                        title="Add Column After"
                    >
                        <div className="relative">
                            <Columns size={16} />
                            <Plus size={8} className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full" />
                        </div>
                    </button>
                    <button
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Column"
                    >
                        <div className="relative">
                            <Columns size={16} />
                            <Minus size={8} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" />
                        </div>
                    </button>
                </div>

                <button
                    onClick={() => {
                        const { state } = editor;
                        const { selection } = state;
                        editor.chain().focus().insertContentAt(selection.to, editor.getHTML().match(/<table>[\s\S]*?<\/table>/)?.[0] || '').run();
                    }}
                    className="p-1.5 rounded-md text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-white"
                    title="Duplicate Table"
                >
                    <Copy size={16} />
                </button>

                <button
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className="p-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 text-xs font-medium"
                >
                    <Trash2 size={16} />
                    Delete Table
                </button>
            </BubbleMenu >
        </>
    );
}
