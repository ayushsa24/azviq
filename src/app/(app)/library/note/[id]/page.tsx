"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { ArrowLeft, Loader2, Save, Lock, Unlock, Download, Undo, Redo, MoreVertical, Share2, FileDown, Trash2, SmilePlus } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import dynamic from 'next/dynamic';
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { SlashCommands, slashCommandSuggestionOptions } from "@/components/editor/slash-command";
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CodeBlockComponent } from '@/components/editor/CodeBlockComponent'
import { all, createLowlight } from 'lowlight'
import "highlight.js/styles/atom-one-dark.css";
import { AiTrigger } from '@/components/editor/AiTrigger';
import { AiInlineInput } from '@/components/editor/AiInlineInput';

const lowlight = createLowlight(all)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function NoteEditorPage() {
    const { id } = useParams() as { id: string };
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [title, setTitle] = useState("Untitled Note");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [mounted, setMounted] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = React.useRef<HTMLDivElement>(null);

    // Default to locked, unless the 'new' query parameter is present meaning we just created it
    const [isLocked, setIsLocked] = useState(searchParams.get("new") !== "true");

    const [aiInlinePos, setAiInlinePos] = useState<{ top: number; left: number; from: number } | null>(null);

    // Use a ref to keep track of the latest title for editor closures
    const titleRef = React.useRef(title);
    const isFetchingRef = React.useRef(true);

    useEffect(() => {
        titleRef.current = title;
    }, [title]);

    useEffect(() => {
        setMounted(true);
        // Suppress known Tiptap v2 + React 19 flushSync warning (harmless)
        const originalError = console.error;
        console.error = (...args: any[]) => {
            if (typeof args[0] === 'string' && args[0].includes('flushSync was called from inside a lifecycle method')) {
                return; // silently ignore
            }
            originalError.apply(console, args);
        };
        return () => { console.error = originalError; };
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Underline,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
            Table.configure({
                resizable: true,
            }).extend({
                draggable: true,
                addKeyboardShortcuts() {
                    return {
                        'Backspace': () => {
                            if (this.editor.isActive('table')) {
                                if (this.editor.state.selection.constructor.name === 'CellSelection') {
                                    return this.editor.commands.deleteRow() || this.editor.commands.deleteColumn();
                                }
                            }
                            return false;
                        },
                        'Delete': () => {
                            if (this.editor.isActive('table')) {
                                if (this.editor.state.selection.constructor.name === 'CellSelection') {
                                    return this.editor.commands.deleteRow() || this.editor.commands.deleteColumn();
                                }
                            }
                            return false;
                        },
                    }
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockComponent)
                }
            }).configure({
                lowlight,
            }),
            AiTrigger.configure({
                onTrigger: (pos) => {
                    let top = pos.top;
                    let left = pos.left;

                    if (typeof document !== 'undefined') {
                        const container = document.getElementById('editor-container-wrapper');
                        if (container) {
                            const rect = container.getBoundingClientRect();
                            top = pos.top - rect.top;
                            left = pos.left - rect.left;
                        }
                    }

                    setAiInlinePos({ ...pos, top, left });
                }
            }),
            Placeholder.configure({
                includeChildren: true,
                showOnlyCurrent: true,
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') {
                        return 'Heading'
                    }
                    if (node.type.name === 'paragraph') {
                        return "Press 'space' for AI, '/' for commands"
                    }
                    return ""
                },
            }),
            SlashCommands.configure({
                suggestion: slashCommandSuggestionOptions,
            }),
        ],
        immediatelyRender: false,
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base lg:prose-base xl:prose-lg prose-p:my-1 prose-headings:my-3 px-2 py-4 focus:outline-none dark:prose-invert max-w-none text-[#252525] dark:text-[#CFCFCF] min-h-[500px] cursor-text",
            },
            handleKeyDown: (view, event) => {
                if ((event.key === 'Backspace' || event.key === 'Delete') && editor) {
                    // Check if multiple cells are selected. 
                    // In ProseMirror/Tiptap, this is a CellSelection.
                    const { selection } = editor.state;
                    const isCellSelection = selection.constructor.name.includes('CellSelection') || 'anchorCell' in selection;

                    if (isCellSelection) {
                        // If it's a cell selection, we want backspace/delete to remove the rows/cols
                        editor.chain().focus().deleteRow().run() || editor.chain().focus().deleteColumn().run();
                        return true; // Prevent default backspace behavior
                    }
                }
                return false;
            },
        },
        onUpdate: ({ editor }) => {
            if (isFetchingRef.current) return;
            debouncedSave(editor.getHTML(), titleRef.current);
        },
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(!isLocked);
        }
    }, [isLocked, editor]);

    const handleDownload = () => {
        if (!editor) return;
        const content = editor.getText();
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title || 'note'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        async function fetchNote() {
            try {
                isFetchingRef.current = true;
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Failed to load note");
                const { note } = await res.json();

                titleRef.current = note.title;
                setTitle(note.title);
                if (editor && note.content) {
                    editor.commands.setContent(note.content, { emitUpdate: false });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
                // Allow a tiny delay to ensure setEditable or other hooks don't fire rogue onUpdate calls
                setTimeout(() => {
                    isFetchingRef.current = false;
                }, 100);
            }
        }

        if (id && editor) {
            fetchNote();
        }
    }, [id, editor]);

    const handleSave = async (contentToSave?: string, titleToSave?: string) => {
        if (!editor) return;
        setIsSaving(true);
        setSaveError("");

        try {
            const res = await fetch(`/api/notes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: titleToSave !== undefined ? titleToSave : title,
                    content: contentToSave !== undefined ? contentToSave : editor.getHTML(),
                }),
            });
            if (!res.ok) throw new Error("Failed to save note");
        } catch (err) {
            console.error(err);
            setSaveError("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const debouncedSave = useDebouncedCallback((content: string, titleContent: string) => {
        handleSave(content, titleContent);
    }, 1000);

    const handleShare = () => {
        if (typeof window === "undefined") return;
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("Note link copied to clipboard!");
        setShowMoreMenu(false);
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        try {
            const res = await fetch(`/api/notes/${id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete note");
            router.push("/library");
        } catch (err) {
            console.error(err);
            alert("Failed to delete note. Please try again.");
        }
    };

    // Handle clicking outside the menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
                setShowMoreMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#F5F5F5] dark:bg-[#1A1A1A]">
                <Loader2 className="animate-spin text-[#545454] dark:text-[#7D7D7D]" size={32} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-[#F5F5F5] dark:bg-[#1A1A1A] transition-colors relative">

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#F5F5F5]/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md border-b border-[#E0E0E0] dark:border-[#2A2A2A] transition-colors">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (window.history.length > 2) {
                                router.back();
                            } else {
                                router.push("/library");
                            }
                        }}
                        className="flex items-center text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <span className="text-xs text-[#7D7D7D] font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                        {isSaving ? "Saving..." : saveError ? saveError : ""}
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={isLocked || !editor?.can().undo()}
                        className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] hover:text-[#252525] dark:hover:text-[#CFCFCF] rounded-md transition-colors disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>

                    <button
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={isLocked || !editor?.can().redo()}
                        className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] hover:text-[#252525] dark:hover:text-[#CFCFCF] rounded-md transition-colors disabled:opacity-30"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={18} />
                    </button>

                    <div className="w-px h-5 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />

                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-1.5 rounded-md transition-colors ${isLocked
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                            }`}
                        title={isLocked ? "Unlock Note to Edit" : "Lock Note (Read-Only)"}
                    >
                        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>

                    <div className="w-px h-5 bg-[#E0E0E0] dark:bg-[#3A3A3A] hidden sm:block mx-1" />

                    {/* 3-DOT MENU */}
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] hover:text-[#252525] dark:hover:text-[#CFCFCF] rounded-md transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMoreMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#252525] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-xl rounded-xl overflow-hidden z-[60]">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#545454] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors"
                                >
                                    <Share2 size={16} />
                                    Share Note
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#545454] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] transition-colors"
                                >
                                    <FileDown size={16} />
                                    Download as Text
                                </button>
                                <div className="h-px bg-[#E0E0E0] dark:bg-[#3A3A3A]" />
                                <div className="h-px bg-[#E0E0E0] dark:bg-[#3A3A3A]" />
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Remove Note
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-12 pb-[50vh] flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                    <input
                        id="note-title-input"
                        type="text"
                        value={title}
                        disabled={isLocked}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            titleRef.current = e.target.value;
                            if (editor) debouncedSave(editor.getHTML(), e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                editor?.commands.focus();
                            }
                        }}
                        placeholder="Note Title"
                        className="flex-1 w-full text-4xl sm:text-5xl font-bold bg-transparent border-none outline-none text-[#252525] dark:text-[#CFCFCF] placeholder-[#CFCFCF] dark:placeholder-[#545454]"
                    />

                    <div className="relative">
                        <button
                            disabled={isLocked}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-3 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] hover:text-[#252525] dark:hover:text-[#CFCFCF] rounded-full transition-colors disabled:opacity-30"
                            title="Add Emoji"
                        >
                            <SmilePlus size={28} />
                        </button>

                        {showEmojiPicker && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowEmojiPicker(false)}
                                />
                                <div className="absolute top-14 right-0 z-50 shadow-2xl rounded-lg">
                                    <EmojiPicker
                                        theme={typeof document !== 'undefined' && document.documentElement.className.includes('dark') ? 'dark' as any : 'light' as any}
                                        onEmojiClick={(emojiData) => {
                                            const newTitle = title ? `${title} ${emojiData.emoji}` : emojiData.emoji;
                                            setTitle(newTitle);
                                            titleRef.current = newTitle;
                                            if (editor) debouncedSave(editor.getHTML(), newTitle);
                                            setShowEmojiPicker(false);
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div
                    id="editor-container-wrapper"
                    className="flex-1 min-h-[500px] cursor-text relative pb-[250px]"
                    onClick={(e) => {
                        // Prevent click if we're clicking inside the actual editor content (tiptap)
                        // This allows Tiptap to handle its own clicks normally
                        if (e.target !== e.currentTarget) return;

                        if (editor) {
                            // Focus at the end of the document
                            editor.commands.focus('end');

                            // If document is empty or ends with a block-node, insert a paragraph
                            const lastNode = editor.state.doc.lastChild;
                            if (lastNode && (lastNode.type.name === 'table' || lastNode.type.name === 'codeBlock')) {
                                editor.chain().focus().insertContentAt(editor.state.doc.content.size, { type: 'paragraph' }).run();
                            }
                        }
                    }}
                >
                    {editor && <EditorToolbar editor={editor} />}
                    {aiInlinePos && (
                        <AiInlineInput
                            initialTop={aiInlinePos.top}
                            initialLeft={aiInlinePos.left}
                            contextText={editor ? editor.getText() : ""}
                            onClose={() => {
                                setAiInlinePos(null);
                                editor?.commands.focus();
                            }}
                            onInsert={(htmlContent) => {
                                if (editor && aiInlinePos) {
                                    // Start position where AI first began typing
                                    const start = aiInlinePos.from;
                                    // Current cursor position is the end of the raw streamed text
                                    const end = editor.state.selection.to;

                                    editor.chain().focus().run(); // bring focus back gracefully

                                    try {
                                        // By appending the new HTML first and then deleting the old text,
                                        // we never temporarily leave the table cell completely empty,
                                        // which avoids Prosemirror's strict schema validation crash.
                                        editor.chain()
                                            .insertContentAt(end, htmlContent || "<p></p>")
                                            .deleteRange({ from: start, to: end })
                                            .run();
                                    } catch (err) {
                                        console.warn("AI rich text insertion violated schema (e.g. nested tables). Keeping the raw text instead.", err);
                                        // We swallow the error and leave the raw markdown streamed text in the editor
                                        // to prevent the entire page setup from crashing.
                                    }

                                    setAiInlinePos(null);
                                }
                            }}
                            onStreamChunk={(chunk) => {
                                if (editor) {
                                    editor.chain().insertContent(chunk).scrollIntoView().run();
                                }
                            }}
                        />
                    )}
                    {mounted && <EditorContent editor={editor} className="h-full" />}
                </div>
            </div>
        </div>
    );
}
