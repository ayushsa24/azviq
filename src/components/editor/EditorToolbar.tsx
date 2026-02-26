import { BubbleMenu, Editor } from "@tiptap/react";
import {
    Bold,
    Italic,
    Underline,
    Link as LinkIcon,
    Sparkles,
    MessageSquareQuote,
    Highlighter
} from "lucide-react";
import { useState, useEffect } from "react";
import { AiPopover } from "./AiPopover";

interface EditorToolbarProps {
    editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
    const [isAiOpen, setIsAiOpen] = useState(false);

    useEffect(() => {
        if (!editor) return;

        const handleSelectionUpdate = () => {
            setIsAiOpen(false);
        };

        editor.on('selectionUpdate', handleSelectionUpdate);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
        };
    }, [editor]);

    if (!editor) return null;

    return (
        <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className={`flex items-center gap-1 ${isAiOpen ? '' : 'bg-white dark:bg-[#252525] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-lg rounded-full px-3 py-1.5 backdrop-blur-md'}`}
        >
            {isAiOpen ? (
                <AiPopover editor={editor} onClose={() => setIsAiOpen(false)} />
            ) : (
                <>
                    <button
                        onClick={() => setIsAiOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white rounded-full text-xs font-semibold shadow-sm transition-all"
                    >
                        <Sparkles size={14} />
                        Ask AI
                    </button>

                    <div className="w-px h-5 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />

                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-1.5 rounded-md transition-colors ${editor.isActive("bold")
                            ? "bg-[#E0E0E0] dark:bg-[#3A3A3A] text-[#252525] dark:text-[#CFCFCF]"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-1.5 rounded-md transition-colors ${editor.isActive("italic")
                            ? "bg-[#E0E0E0] dark:bg-[#3A3A3A] text-[#252525] dark:text-[#CFCFCF]"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`p-1.5 rounded-md transition-colors ${editor.isActive("underline")
                            ? "bg-[#E0E0E0] dark:bg-[#3A3A3A] text-[#252525] dark:text-[#CFCFCF]"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                    >
                        <Underline size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />

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
                            ? "bg-[#E0E0E0] dark:bg-[#3A3A3A] text-[#252525] dark:text-[#CFCFCF]"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                    >
                        <LinkIcon size={16} />
                    </button>

                    <button
                        onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffcc00' }).run()}
                        className={`p-1.5 rounded-md transition-colors ${editor.isActive("highlight")
                            ? "bg-[#E0E0E0] dark:bg-[#3A3A3A] text-[#252525] dark:text-[#CFCFCF]"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                    >
                        <Highlighter size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />

                    <button
                        onClick={() => setIsAiOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] text-[#545454] dark:text-[#CFCFCF] rounded-full text-xs font-semibold transition-all"
                    >
                        <MessageSquareQuote size={14} />
                        Explain
                    </button>
                </>
            )}
        </BubbleMenu>
    );
}
