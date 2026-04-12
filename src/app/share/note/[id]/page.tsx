"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { CodeBlockComponent } from "@/components/editor/CodeBlockComponent";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { SlashCommands, slashCommandSuggestionOptions } from "@/components/editor/slash-command";
import { AiTrigger } from "@/components/editor/AiTrigger";
import { AiPopover } from "@/components/editor/AiPopover";
import { AiInlineInput } from "@/components/editor/AiInlineInput";
import { all, createLowlight } from "lowlight";
import "highlight.js/styles/atom-one-dark.css";
import { useDebouncedCallback } from "use-debounce";
import { Skeleton } from "@/components/ui/Skeleton";
import { Loader2, Lock, FileText, Pencil, Eye, Check, Sun, Moon, LogIn, DownloadCloud } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const lowlight = createLowlight(all);

export default function SharedNotePage() {
    const { id } = useParams() as { id: string };
    const [note, setNote] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const [contentLoaded, setContentLoaded] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { data: session } = useSession();
    const router = useRouter();

    // AI Trigger State
    const [aiInlinePos, setAiInlinePos] = useState<{ top: number; left: number; from: number } | null>(null);

    const canEdit = false; // Public shared pages are now strictly view-only. Import to edit.

    useEffect(() => {
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
            StarterKit.configure({ codeBlock: false }),
            Underline,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Link.configure({ openOnClick: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockComponent);
                },
            }).configure({ lowlight }),
            Placeholder.configure({
                includeChildren: true,
                showOnlyCurrent: true,
                placeholder: ({ node }) => {
                    if (node.type.name === 'heading') return 'Heading';
                    if (node.type.name === 'paragraph') return "Press 'space' for AI, '/' for commands";
                    return "";
                },
            }),
            SlashCommands.configure({
                suggestion: slashCommandSuggestionOptions,
            }),
            AiTrigger.configure({
                onTrigger: (pos) => {
                    let top = pos.top;
                    let left = pos.left;

                    if (typeof document !== 'undefined') {
                        const container = document.getElementById('share-editor-container');
                        if (container) {
                            const rect = container.getBoundingClientRect();
                            top = pos.top - rect.top;
                            left = pos.left - rect.left;
                        }
                    }

                    setAiInlinePos({ ...pos, top, left });
                }
            }),
        ],
        editable: false,
        immediatelyRender: false,
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-sm sm:prose-base lg:prose-base xl:prose-lg prose-p:my-1 prose-headings:my-3 px-2 py-4 focus:outline-none dark:prose-invert max-w-none text-[#252525] dark:text-white min-h-[500px] cursor-text",
            },
        },
        onUpdate: ({ editor }) => {
            // No public updates allowed. Import to library to edit.
        },
    });

    // Dark Mode Sync
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDark]);

    // Fetch Note
    useEffect(() => {
        async function fetchNote() {
            try {
                const res = await fetch(`/api/share/note/${id}`);
                if (!res.ok) { setIsPrivate(true); setIsLoading(false); return; }
                const data = await res.json();
                setNote(data.note);
            } catch {
                setIsPrivate(true);
            } finally {
                setIsLoading(false);
            }
        }
        fetchNote();
    }, [id]);

    // Initialize Editor Content
    useEffect(() => {
        if (editor && note && !contentLoaded) {
            // Use setTimeout to avoid flushSync warning during render/lifecycle
            const timer = setTimeout(() => {
                if (note.content) {
                    editor.commands.setContent(note.content, { emitUpdate: false });
                }
                editor.setEditable(false);
                setContentLoaded(true);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [editor, note, contentLoaded]);

    const debouncedSave = useDebouncedCallback(async (content: string) => {
        setIsSaving(true);
        setSavedOk(false);
        try {
            await fetch(`/api/share/note/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2000);
        } catch { /* silent */ }
        finally { setIsSaving(false); }
    }, 1500);

    const handleImport = async () => {
        if (!session) {
            signIn(undefined, { callbackUrl: window.location.href });
            return;
        }

        setIsImporting(true);
        try {
            const res = await fetch(`/api/share/note/${id}/import`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to import note");
            const data = await res.json();
            
            // Redirect to the newly created note in the user's library
            router.push(`/library/note/${data.noteId}`);
        } catch (err) {
            console.error(err);
            alert("Failed to import note. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full min-h-screen bg-[#F5F3EF] dark:bg-[#161514] transition-colors">
                {/* Clean Loading Header */}
                <div className="sticky top-0 z-10 h-[52px] bg-[#F5F3EF]/80 dark:bg-[#161514]/80 backdrop-blur-md border-b border-[#E8E5E0] dark:border-[#2E2A26]" />

                {/* Skeleton Content */}
                <div className="flex flex-col items-center w-full">
                    <div className="w-full max-w-3xl px-4 sm:px-8 pt-10 pb-24">
                        {/* Title Skeleton */}
                        <Skeleton className="w-3/4 h-12 sm:h-16 rounded-xl mb-8" />
                        
                        {/* Toolbar Placeholder */}
                        <div className="mb-6 flex gap-2">
                            <Skeleton className="w-10 h-8 rounded-md" />
                            <Skeleton className="w-10 h-8 rounded-md" />
                            <Skeleton className="w-10 h-8 rounded-md" />
                            <Skeleton className="w-24 h-8 rounded-md ml-auto" />
                        </div>
                        
                        {/* Content Skeleton */}
                        <div className="space-y-4">
                            <Skeleton className="w-full h-4 rounded-md" />
                            <Skeleton className="w-11/12 h-4 rounded-md" />
                            <Skeleton className="w-full h-4 rounded-md" />
                            <Skeleton className="w-10/12 h-4 rounded-md" />
                            <div className="py-2" />
                            <Skeleton className="w-full h-40 rounded-xl" />
                            <div className="py-2" />
                            <Skeleton className="w-full h-4 rounded-md" />
                            <Skeleton className="w-full h-4 rounded-md" />
                            <Skeleton className="w-3/4 h-4 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isPrivate || !note) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F3EF] dark:bg-[#161514] gap-5 px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E8E5E0] dark:bg-[#252525] flex items-center justify-center">
                    <Lock size={28} className="text-[#545454] dark:text-[#7D7D7D]" />
                </div>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-[#252525] dark:text-white">This note is private</h1>
                    <p className="text-sm text-[#7D7D7D] dark:text-[#7D7D7D] mt-1">The owner hasn&apos;t shared this note publicly.</p>
                </div>
                <a href="/" className="px-6 py-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-full text-sm font-semibold hover:opacity-90 transition-colors">
                    Go to Azviq
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F3EF] dark:bg-[#161514] transition-colors duration-200">

            <div className="sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-8 py-3 bg-[#F5F3EF]/80 dark:bg-[#161514]/80 backdrop-blur-md border-b border-[#E8E5E0] dark:border-[#2E2A26] transition-colors duration-200">
                <div className="w-8 h-8 rounded-lg bg-[#E8E5E0] dark:bg-[#252525] flex items-center justify-center shrink-0">
                    <FileText size={15} className="text-[#545454] dark:text-[#7D7D7D]" />
                </div>
                
                <span className="font-bold text-[#252525] dark:text-white truncate">{note.title}</span>

                {canEdit && (
                    <span className="text-xs text-[#BABABA] flex items-center gap-1 shrink-0 ml-2">
                        {isSaving
                            ? <><Loader2 size={11} className="animate-spin text-blue-500" /> Saving…</>
                            : savedOk
                                ? <><Check size={11} className="text-green-500" /> Saved</>
                                : null}
                    </span>
                )}

                <div className="flex-1" />

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 bg-[#F0EDE8] dark:bg-[#252525] text-[#7D7D7D] dark:text-[#7D7D7D] border border-[#E8E5E0] dark:border-[#3A3A3A]`}>
                    <Eye size={11} />
                    View Only
                </div>

                <button
                    onClick={() => setIsDark(d => !d)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E8E5E0] dark:border-[#3A3A3A] bg-white dark:bg-[#252525] text-[#545454] dark:text-[#BABABA] hover:bg-[#F0EDE8] dark:hover:bg-[#1A1A1A] transition-colors shrink-0"
                    title={isDark ? "Switch to Light" : "Switch to Dark"}
                >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>

                <div className="w-px h-4 bg-[#E8E5E0] dark:bg-[#3A3A3A] hidden sm:block" />

                <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:opacity-90 active:scale-95 rounded-full text-xs font-bold transition-all shadow-lg disabled:opacity-50"
                >
                    {isImporting ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : session ? (
                        <DownloadCloud size={14} />
                    ) : (
                        <LogIn size={14} />
                    )}
                    {session ? "Import to Library" : "Sign in to Import"}
                </button>

                <div className="w-px h-4 bg-[#E8E5E0] dark:bg-[#3A3A3A] hidden sm:block" />
                <span className="text-xs text-[#BABABA] shrink-0 hidden sm:block">Shared via Azviq</span>
            </div>

            <div className="flex flex-col items-center w-full">
                <div className="w-full max-w-3xl px-4 sm:px-8 pt-10 pb-24">

                    <h1 className="text-4xl sm:text-5xl font-bold text-[#252525] dark:text-white mb-8 leading-tight">
                        {note.title}
                    </h1>

                    <div id="share-editor-container" className="relative">
                        <EditorToolbar editor={editor} />

                        {aiInlinePos && canEdit && (
                            <AiInlineInput
                                initialTop={aiInlinePos.top}
                                initialLeft={aiInlinePos.left}
                                contextText={editor ? editor.getText() : ""}
                                onClose={() => {
                                    setAiInlinePos(null);
                                    editor?.commands.focus();
                                }}
                                onStreamChunk={(chunk) => {
                                    if (editor) {
                                        editor.chain().focus().insertContent(chunk).run();
                                    }
                                }}
                                onInsert={(htmlContent) => {
                                    if (editor && aiInlinePos) {
                                        const start = aiInlinePos.from;
                                        const end = editor.state.selection.to;
                                        editor.chain().focus().run();
                                        try {
                                            editor.chain()
                                                .insertContentAt(end, htmlContent || "<p></p>")
                                                .deleteRange({ from: start, to: end })
                                                .run();
                                        } catch (err) {
                                            console.warn("AI rich text insertion failed schema validation.", err);
                                        }
                                        setAiInlinePos(null);
                                    }
                                }}
                                onDiscard={() => {
                                    if (editor && aiInlinePos) {
                                        const start = aiInlinePos.from;
                                        const end = editor.state.selection.to;
                                        editor.chain().focus().deleteRange({ from: start, to: end }).run();
                                        setAiInlinePos(null);
                                    }
                                }}
                            />
                        )}

                        <EditorContent
                            editor={editor}
                            className="h-full [&_.tableWrapper]:overflow-x-auto"
                        />
                    </div>

                    <div className="mt-12 pt-6 border-t border-[#E8E5E0] dark:border-[#2E2A26] text-xs text-[#BABABA] text-center transition-colors">
                        Shared via{" "}
                        <a href="/" className="font-semibold text-[#545454] dark:text-[#7D7D7D] hover:underline">Azviq</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
