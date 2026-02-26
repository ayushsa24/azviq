"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { SlashCommands, slashCommandSuggestionOptions } from "@/components/editor/slash-command";
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CodeBlockComponent } from '@/components/editor/CodeBlockComponent'
import { all, createLowlight } from 'lowlight'
import "highlight.js/styles/atom-one-dark.css"; // Note: this gives a nice dark theme for code blocks

const lowlight = createLowlight(all)

export default function NoteEditorPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();

    const [title, setTitle] = useState("Untitled Note");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [mounted, setMounted] = useState(false);

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
            Table.configure({ resizable: true }),
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
            Placeholder.configure({
                placeholder: "Press '/' for commands or start typing...",
                emptyEditorClass: "is-editor-empty before:content-[attr(data-placeholder)] before:float-left before:text-[#A3A3A3] before:pointer-events-none h-full",
            }),
            SlashCommands.configure({
                suggestion: slashCommandSuggestionOptions,
            }),
        ],
        immediatelyRender: false,
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl prose-p:my-1 prose-headings:my-3 px-2 py-4 focus:outline-none dark:prose-invert max-w-none text-[#252525] dark:text-[#CFCFCF] min-h-[500px] cursor-text",
            },
        },
        onUpdate: ({ editor }) => {
            // Using a hack to get the latest title from the input by grabbing its value directly, 
            // since 'title' state might be stale in this closure
            const titleInput = document.getElementById('note-title-input') as HTMLInputElement;
            const currentTitle = titleInput ? titleInput.value : "Untitled Note";
            debouncedSave(editor.getHTML(), currentTitle);
        },
    });

    useEffect(() => {
        async function fetchNote() {
            try {
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Failed to load note");
                const { note } = await res.json();

                setTitle(note.title);
                if (editor && note.content) {
                    editor.commands.setContent(note.content);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
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
                <button
                    onClick={() => {
                        if (window.history.length > 2) {
                            router.back();
                        } else {
                            router.push("/library");
                        }
                    }}
                    className="flex items-center gap-2 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Back</span>
                </button>

                <div className="flex items-center gap-4">
                    <span className="text-xs text-[#7D7D7D]">
                        {isSaving ? "Saving..." : saveError ? saveError : "Saved"}
                    </span>
                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col">
                <input
                    id="note-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (editor) debouncedSave(editor.getHTML(), e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            editor?.commands.focus();
                        }
                    }}
                    placeholder="Note Title"
                    className="w-full text-4xl sm:text-5xl font-bold bg-transparent border-none outline-none text-[#252525] dark:text-[#CFCFCF] placeholder-[#CFCFCF] dark:placeholder-[#545454] mb-8"
                />

                <div
                    className="flex-1 min-h-[500px] cursor-text"
                    onClick={() => {
                        if (editor && !editor.isFocused) {
                            editor.commands.focus();
                        }
                    }}
                >
                    {editor && <EditorToolbar editor={editor} />}
                    {mounted && <EditorContent editor={editor} className="h-full" />}
                </div>
            </div>
        </div>
    );
}
