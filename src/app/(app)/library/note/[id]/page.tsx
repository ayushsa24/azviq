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
import { DownloadCloud, Check, Sun, Moon, LogIn, FileDown, MoreVertical, Share2, FileText, PanelLeft, ArrowLeft, Undo, Redo, Lock, Unlock, Eye, EyeOff, Users, Loader2, FileJson, FileIcon, Save, Trash2, SmilePlus, Globe, Copy, Pencil, X, AlertCircle } from "lucide-react";
import { exportToPdf } from "@/lib/utils/pdf-export";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebouncedCallback } from "use-debounce";
import dynamic from 'next/dynamic';
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { SlashCommands, slashCommandSuggestionOptions } from "@/components/editor/slash-command";
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { CodeBlockComponent } from '@/components/editor/CodeBlockComponent'
import { all, createLowlight } from 'lowlight'
import "highlight.js/styles/atom-one-dark.css";
import { AiTrigger } from '@/components/editor/AiTrigger';
import { AiInlineInput } from '@/components/editor/AiInlineInput';
import { EmojiPicker, ICON_MAP } from '@/components/editor/EmojiPicker';
import { logRecentActivity } from '@/lib/logRecentActivity';
import { useStudyTracker } from '@/hooks/useStudyTracker';
import { useSidebar } from "@/contexts/SidebarContext";
import { supabase as supabaseClient } from "@/lib/supabase";
import { ImportersModal } from "@/components/modals/ImportersModal";

const lowlight = createLowlight(all)
const StandardEmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function NoteEditorPage() {
    const { id } = useParams() as { id: string };
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const router = useRouter();
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();
    const searchParams = useSearchParams();

    const [title, setTitle] = useState("Untitled Note");
    const [note, setNote] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [importers, setImporters] = useState<any[]>([]);
    const [showImporters, setShowImporters] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [isOwner, setIsOwner] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [shareMode, setShareMode] = useState<'private' | 'view' | 'edit'>('private');
    const [isTogglingShare, setIsTogglingShare] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [parentShareMode, setParentShareMode] = useState<'private' | 'view' | 'edit' | null>(null);
    const moreMenuRef = React.useRef<HTMLDivElement>(null);

    // Default to locked, unless the 'new' query parameter is present meaning we just created it
    const [isLocked, setIsLocked] = useState(searchParams.get("new") !== "true");
    const [isRevoked, setIsRevoked] = useState(false);

    const [aiInlinePos, setAiInlinePos] = useState<{ top: number; left: number; from: number } | null>(null);

    // Use a ref to keep track of the latest title for editor closures
    const titleRef = React.useRef(title);
    const isFetchingRef = React.useRef(true);
    const isOriginalUpdateRef = React.useRef(false); // Flag to prevent infinite loops during sync
    const isLocalUpdateRef = React.useRef(false); // Flag to prevent UI jumping when typing
    const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    useStudyTracker({ activityType: 'note', isEnabled: !isLoading, subject: "Note", topic: title });

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

    {/* Component for Reusable Picker Logic */}
    const PickerContent = () => (
        <EmojiPicker
            theme={typeof document !== 'undefined' && document.documentElement.className.includes('dark') ? 'dark' : 'light'}
            onSelectIcon={(iconName) => {
                const currentText = title.replace(/^\[\w+\]\s*/, "");
                const newTitle = iconName ? `[${iconName}] ${currentText}` : currentText;
                setTitle(newTitle);
                titleRef.current = newTitle;
                if (editor) debouncedSave(editor.getHTML(), newTitle);
                setShowEmojiPicker(false);
            }}
            onClose={() => setShowEmojiPicker(false)}
        />
    );

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
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
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
                class: "prose prose-sm sm:prose-base lg:prose-base xl:prose-lg prose-p:my-1 prose-headings:my-3 px-2 py-4 focus:outline-none dark:prose-invert max-w-none text-[#252525] dark:text-white min-h-[500px] cursor-text",
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
            if (isFetchingRef.current || isOriginalUpdateRef.current) return;
            
            // Mark that we are actively typing locally
            isLocalUpdateRef.current = true;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => { 
                isLocalUpdateRef.current = false; 
                typingTimeoutRef.current = null;
            }, 3000); // 3s cooldown for sync

            // The owner should always be able to trigger a save unless they explicitly locked it for themselves.
            // Importers are controlled by the parentShareMode.
            if (isLocked && note?.original_note_id) return;
            debouncedSave(editor.getHTML(), titleRef.current);
        },
    });

    useEffect(() => {
        if (editor) {
            editor.setEditable(!isLocked);
        }
    }, [isLocked, editor]);

    // Handle clicks outside the more menu / share panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
                setShowSharePanel(false);
            }
        }
        if (showMoreMenu || showSharePanel) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMoreMenu, showSharePanel]);

    const handleDownloadPdf = async () => {
        if (!editor) return;
        const html = editor.getHTML();
        const plainText = editor.getText();
        
        console.log("[PDF] Exporting HTML length:", html.length);
        console.log("[PDF] Exporting Text length:", plainText.trim().length);

        if (plainText.trim().length === 0 || isRevoked) {
            alert("Exporting is disabled for private or empty notes.");
            return;
        }

        setIsDownloadingPdf(true);
        try {
            await exportToPdf(html, title || 'Untitled Note');
        } catch (err) {
            console.error("PDF Export failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloadingPdf(false);
            setShowMoreMenu(false);
        }
    };

    useEffect(() => {
        async function fetchNote() {
            try {
                isFetchingRef.current = true;
                const res = await fetch(`/api/notes/${id}`);
                if (!res.ok) throw new Error("Failed to load note");
                const data = await res.json();
                const { note: noteData } = data;

                setNote(noteData);
                setImporters(data.importers || []);
                setIsOwner(data.isOwner);
                titleRef.current = noteData.title;
                setTitle(noteData.title);
                setWorkspaceId(noteData.workspace_id);
                setShareMode(noteData.share_mode ?? 'private');
                setIsRevoked(!!noteData.is_revoked);
                
                const pShareMode = data.parentShareMode;
                setParentShareMode(pShareMode);

                // If owner explicitly set original to view-only, lock the copies
                if (pShareMode === 'view') {
                    setIsLocked(true);
                }

                if (editor && noteData.content) {
                    editor.commands.setContent(noteData.content, { emitUpdate: false });
                }

                // Log this note open to recent activity
                logRecentActivity({
                    item_id: id,
                    item_type: "note",
                    title: noteData.title || "Untitled Note",
                    href: `/library/note/${id}`,
                });
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
                setTimeout(() => {
                    isFetchingRef.current = false;
                }, 100);
            }
        }

        if (id && editor) {
            fetchNote();
        }
    }, [id, editor]);

    // Real-Time Sync: Listen for changes on the source of truth
    useEffect(() => {
        if (!id || !editor || !note) return;

        // If I am a clone, I listen to my PARENT (original_note_id)
        // If I am the owner, I listen to MYSELF (id) for inbound collaborator changes
        const syncId = note.original_note_id || id;

        const channel = supabaseClient
            .channel(`sync-note-${syncId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notes',
                    filter: `id=eq.${syncId}`
                },
                (payload) => {
                    const updatedData = payload.new as any;
                    
                    // Mark this as an external update to avoid re-saving
                    isOriginalUpdateRef.current = true;
                    
                    // 1. Sync Title
                    if (updatedData.title && updatedData.title !== titleRef.current) {
                        setTitle(updatedData.title);
                        titleRef.current = updatedData.title;
                    }
                    
                    // 2. Sync Permissions & Security
                    if (note?.original_note_id && updatedData.share_mode !== undefined) {
                        setParentShareMode(updatedData.share_mode);
                        // Lock/Unlock the editor based on owner's decision
                        if (updatedData.share_mode === 'view' || updatedData.share_mode === 'private') {
                            setIsLocked(true);
                            if (updatedData.share_mode === 'private') {
                                setIsRevoked(true);
                                // The API handles content redaction on refresh, but for the session we can wipe it
                                editor.commands.setContent("<p>Access to this shared material has been restricted by the owner.</p>");
                            } else {
                                setIsRevoked(false);
                            }
                        } else if (updatedData.share_mode === 'edit') {
                            setIsLocked(false);
                            setIsRevoked(false);
                        }
                    }

                    // 3. Sync Content (Ignore if typing myself or if content is identical)
                    if (!isLocalUpdateRef.current && !isSaving && updatedData.content) {
                        const currentHtml = editor.getHTML();
                        if (currentHtml !== updatedData.content) {
                            const { from, to } = editor.state.selection;
                            editor.commands.setContent(updatedData.content, { emitUpdate: false });
                            // Try to preserve cursor position
                            try {
                                editor.commands.setTextSelection({ from, to });
                            } catch { /* pos might be invalid if content changed significantly */ }
                        }
                    }

                    setTimeout(() => {
                        isOriginalUpdateRef.current = false;
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            supabaseClient.removeChannel(channel);
        };
    }, [id, editor, note]);

    const handleSave = async (contentToSave?: string, titleToSave?: string) => {
        // If it's a clone (has original_note_id), respect the parent's view-only lock.
        // If it's the original, let them save unless they manually locked the editor UI.
        const isClone = !!note?.original_note_id;
        if (!editor || isOriginalUpdateRef.current) return;
        if (isClone && (isLocked || parentShareMode === 'view')) return;
        if (!isClone && isLocked) return;
        
        // Final guard: Don't save if we're just loading.
        if (isFetchingRef.current) return;

        // Cancel the previous save request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsSaving(true);
        setSaveError("");

        try {
            // 1. Save to local note (clone or original)
            const res = await fetch(`/api/notes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    title: titleToSave !== undefined ? titleToSave : title,
                    content: contentToSave !== undefined ? contentToSave : editor.getHTML(),
                }),
            });
            if (!res.ok) throw new Error("Failed to save note");

            // Sync recent activity display when title changes
            if (titleToSave !== undefined) {
                logRecentActivity({
                    item_id: id,
                    item_type: "note",
                    title: titleToSave,
                    href: `/library/note/${id}`,
                });
            } else {
                // Otherwise just trigger a refresh so any other changes (like icons) reflect
                window.dispatchEvent(new CustomEvent("recentActivityUpdated"));
            }

            // 2. Collaborative Sync: If this is an import, also update the original source
            // so the owner and other importers can see my changes in real-time.
            if (isClone && note.original_note_id && parentShareMode === 'edit') {
                await fetch(`/api/notes/${note.original_note_id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: contentToSave !== undefined ? contentToSave : editor.getHTML(),
                    }),
                });
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return; // Expected cancellation
            console.error(err);
            setSaveError("Failed to save. Please try again.");
        } finally {
            if (abortControllerRef.current === controller) {
                setIsSaving(false);
                abortControllerRef.current = null;
            }
        }
    };

    const debouncedSave = useDebouncedCallback((content: string, titleContent: string) => {
        handleSave(content, titleContent);
    }, 1000);

    const handleShare = () => {
        setShowSharePanel(true);
        setShowMoreMenu(false);
    };

    const handleSetShareMode = async (mode: 'private' | 'view' | 'edit') => {
        setIsTogglingShare(true);
        try {
            const res = await fetch(`/api/notes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ share_mode: mode }),
            });
            if (res.status === 401) {
                alert("Session expired. Please log out and log back in, then try again.");
                return;
            }
            if (!res.ok) throw new Error("Failed to update");
            setShareMode(mode);
        } catch (err) {
            console.error("[share] Failed to set share_mode:", err);
            alert("Failed to update sharing settings. Please try again.");
        } finally {
            setIsTogglingShare(false);
        }
    };

    const handleCopyLink = () => {
        if (typeof window === "undefined") return;
        const shareUrl = `${window.location.origin}/share/note/${id}`;
        navigator.clipboard.writeText(shareUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
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
            <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1E1E1E] transition-colors">
                {/* Clean Loading Header */}
                <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between px-4 h-14 bg-white dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E]">
                    <div className="flex items-center gap-1 sm:gap-3">
                        {!sidebarOpen && (
                            <button
                                onClick={toggleSidebar}
                                className="hidden md:flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300"
                            >
                                <PanelLeft size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => router.back()}
                            className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </div>

                {/* Skeleton Body */}
                <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-12 sm:pt-16 pb-32">
                    <div className="flex items-center justify-between mb-8">
                        <Skeleton className="w-3/4 h-12 sm:h-16 rounded-xl" />
                        <Skeleton className="w-12 h-12 rounded-full" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="w-full h-4 rounded-md" />
                        <Skeleton className="w-11/12 h-4 rounded-md" />
                        <Skeleton className="w-full h-4 rounded-md" />
                        <Skeleton className="w-10/12 h-4 rounded-md" />
                        <div className="py-4" />
                        <Skeleton className="w-full h-32 rounded-xl" />
                        <div className="py-4" />
                        <Skeleton className="w-full h-4 rounded-md" />
                        <Skeleton className="w-full h-4 rounded-md" />
                        <Skeleton className="w-3/4 h-4 rounded-md" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto bg-[#F5F3EF] dark:bg-[#1E1E1E] transition-colors relative">

            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-[60] flex shrink-0 items-center justify-between px-4 h-14 bg-white dark:bg-[#1A1A1A] border-b border-[#7D7D7D]/40 dark:border-[#2E2E2E] transition-colors">
                <div className="flex items-center gap-1 sm:gap-3">
                    {/* Sidebar Toggle - Only on Laptop + if sidebar is closed */}
                    {!sidebarOpen && (
                        <button
                            onClick={toggleSidebar}
                            className="hidden md:flex p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                            title="Open Sidebar"
                        >
                            <PanelLeft size={20} />
                        </button>
                    )}
 
                    {/* Always visible Back button */}
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <span className="text-xs text-[#7D7D7D] font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                        {isSaving ? "Saving..." : saveError ? saveError : ""}
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {!isRevoked && (
                        <>
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    editor?.chain().focus().undo().run();
                                }}
                                disabled={isLocked || !editor?.can().undo()}
                                className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30"
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo size={18} />
                            </button>
        
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    editor?.chain().focus().redo().run();
                                }}
                                disabled={isLocked || !editor?.can().redo()}
                                className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-30"
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo size={18} />
                            </button>
        
                            <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-1" />
        
                            <button
                                onClick={() => {
                                    if (parentShareMode === 'view') {
                                        alert("This note is view-only by the original owner's request.");
                                        return;
                                    }
                                    setIsLocked(!isLocked);
                                }}
                                className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 ${isLocked
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
                                    } ${parentShareMode === 'view' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={parentShareMode === 'view' ? "Locked by Owner" : isLocked ? "Unlock Note to Edit" : "Lock Note (Read-Only)"}
                            >
                                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                            </button>
                        </>
                    )}

                    <div className="w-px h-5 bg-[#E8E5E0] dark:bg-[#3A3A3A] hidden sm:block mx-1" />

                    {/* 3-DOT MENU */}
                    <div className="relative" ref={moreMenuRef}>
                        <button
                            onClick={() => setShowMoreMenu(!showMoreMenu)}
                            className="p-1.5 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white rounded-lg transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMoreMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-xl rounded-xl overflow-hidden z-[60]">
                                {/* Share & Publish — Only for Original Owners */}
                                {!note?.original_note_id && (
                                    <button
                                        onClick={handleShare}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#545454] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1E1E1E] transition-colors"
                                    >
                                        <Share2 size={16} />
                                        Share &amp; Publish
                                    </button>
                                )}
                                {!isRevoked && (
                                    <button
                                        onClick={handleDownloadPdf}
                                        disabled={isDownloadingPdf}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-[#545454] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1E1E1E] transition-colors border-t border-[#E8E5E0] dark:border-[#3A3A3A] disabled:opacity-50"
                                    >
                                        {isDownloadingPdf ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <FileText size={16} />
                                        )}
                                        Download as PDF
                                    </button>
                                )}
                                {/* Importers List — Only show if shared and I am owner */}
                                {isOwner && shareMode !== 'private' && (
                                    <button
                                        onClick={() => {
                                            setShowImporters(true);
                                            setShowMoreMenu(false);
                                        }}
                                        className="w-full h-10 flex items-center gap-2.5 px-4 py-2 text-sm text-[#545454] dark:text-[#A0A0A0] hover:bg-[#F0EDE8] dark:hover:bg-[#3A3A3A] transition-colors border-t border-[#E8E5E0] dark:border-[#3A3A3A]"
                                    >
                                        <Users size={16} />
                                        View Importers ({importers.length})
                                    </button>
                                )}
                                <div className="h-px bg-[#E8E5E0] dark:bg-[#3A3A3A]" />
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    Remove Note
                                </button>
                            </div>
                        )}

                        {/* SHARE PANEL - Now inside the moreMenuRef container */}
                        {showSharePanel && (
                            <div className="absolute right-0 top-12 w-60 bg-white dark:bg-[#1E1E1E] border border-[#E8E5E0] dark:border-[#2A2A2A] shadow-2xl rounded-2xl z-[80] p-2 flex flex-col gap-2">
                                <div className="px-1">
                                    <h3 className="font-bold text-xs text-[#252525] dark:text-white leading-tight">Share Note</h3>
                                    <p className="text-[9px] text-[#7D7D7D]">Control access via a public link.</p>
                                </div>

                                {/* Permission options - Compact List */}
                                <div className="flex flex-col gap-1">
                                    {[
                                        { id: 'private', label: 'Private', desc: 'Only you can access', icon: EyeOff },
                                        { id: 'view', label: 'View Only', desc: 'Anyone can read', icon: Globe },
                                        { id: 'edit', label: 'Can Edit', desc: 'Anyone can edit', icon: Pencil }
                                    ].map((mode) => {
                                        const Icon = mode.icon;
                                        const isActive = shareMode === mode.id;
                                        return (
                                            <button
                                                key={mode.id}
                                                onClick={() => handleSetShareMode(mode.id as any)}
                                                disabled={isTogglingShare}
                                                className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition-all ${
                                                    isActive 
                                                        ? 'bg-[#252525] border-[#252525] dark:bg-white dark:border-white' 
                                                        : 'bg-transparent border-transparent hover:bg-[#F5F3EF] dark:hover:bg-[#252525] hover:border-[#E8E5E0] dark:hover:border-[#3A3A3A]'
                                                }`}
                                            >
                                                <Icon size={12} className={isActive ? 'text-white dark:text-[#252525]' : 'text-[#7D7D7D]'} />
                                                <div className="flex-1">
                                                    <p className={`text-[11px] font-semibold ${isActive ? 'text-white dark:text-[#252525]' : 'text-[#252525] dark:text-white'}`}>{mode.label}</p>
                                                    <p className={`text-[8px] ${isActive ? 'text-white/60 dark:text-[#252525]/60' : 'text-[#BABABA]'}`}>{mode.desc}</p>
                                                </div>
                                                {isActive && !isTogglingShare && <Check size={10} className="text-white dark:text-[#252525]" />}
                                                {isActive && isTogglingShare && <Loader2 size={10} className="animate-spin text-white dark:text-[#252525]" />}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="h-px bg-[#E8E5E0] dark:bg-[#2A2A2A] mx-1" />

                                {/* Copy Link */}
                                <button
                                    onClick={handleCopyLink}
                                    disabled={shareMode === 'private'}
                                    className={`flex items-center justify-center gap-2 w-full py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                                        shareMode !== 'private'
                                            ? 'bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:opacity-90 active:scale-95'
                                            : 'bg-[#E8E5E0] dark:bg-[#252525] text-[#BABABA] cursor-not-allowed'
                                    }`}
                                >
                                    {linkCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Share Link</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Access Revoked Overlay for Importers (Restored to Full Page) */}
            {isRevoked && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-[#F0EDE8] dark:bg-white/5 rounded-full flex items-center justify-center mb-6 text-[#7D7D7D] dark:text-[#BABABA] shadow-inner">
                        <EyeOff size={40} />
                    </div>
                    
                    {/* Show the original title as requested */}
                    <div className="mb-4">
                        <span className="text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] bg-[#F0EDE8] dark:bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-widest mb-2 inline-block font-sans">Access Restricted</span>
                        <h2 className="text-3xl font-extrabold text-[#252525] dark:text-white leading-tight flex items-center gap-3">
                            {(() => {
                                const iconMatch = title.match(/^\[(\w+)\]/);
                                if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                    const IconComp = ICON_MAP[iconMatch[1]];
                                    return <IconComp size={32} strokeWidth={2} className="shrink-0 text-[#252525] dark:text-white" />;
                                }
                                return null;
                            })()}
                            <span>{title.replace(/^\[\w+\]\s*/, "")}</span>
                        </h2>
                    </div>

                    <p className="text-[#8B7E6D] dark:text-[#9E9E9E] max-w-sm mb-8 leading-relaxed text-sm">
                        The owner of this note has restricted access or stopped sharing this content. 
                        You can still view your local copy in your main library, but real-time updates and collaboration are currently paused.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={() => router.push('/library')}
                            className="px-6 py-3 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-xl font-semibold hover:opacity-90 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={18} />
                            Back to Library
                        </button>
                    </div>
                </div>
            )}

            {/* Main Editor Area */}
            <div className={`flex-1 max-w-4xl mx-auto w-full px-6 pt-4 sm:pt-10 pb-32 sm:pb-[50vh] flex flex-col ${isRevoked ? 'hidden' : 'block'}`}>
                <div className="flex flex-col gap-2 mb-10 min-w-0">
                    
                    <div className="flex items-center gap-3 w-full px-1">
                        {/* Selected Icon — Shows BIG on the LEFT */}
                        {(() => {
                            const iconMatch = title.match(/^\[(\w+)\]/);
                            if (iconMatch && ICON_MAP[iconMatch[1]]) {
                                const IconComp = ICON_MAP[iconMatch[1]];
                                return (
                                    <div className="relative shrink-0">
                                        <button
                                            disabled={isLocked}
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="w-20 h-20 flex items-center justify-center rounded-[24px] hover:bg-[#F0EDE8] dark:hover:bg-[#252525] transition-all duration-300 text-[#252525] dark:text-white border border-transparent hover:border-[#E8E5E0] dark:hover:border-[#3A3A3A]"
                                        >
                                            <IconComp size={60} strokeWidth={1} />
                                        </button>
                                        {showEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                                                <div className="absolute top-24 left-0 z-50">
                                                    <PickerContent />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <input
                            id="note-title-input"
                            type="text"
                            value={title.replace(/^\[\w+\]\s*/, "")}
                            disabled={isLocked || !!note?.original_note_id}
                            onChange={(e) => {
                                const iconMatch = title.match(/^\[(\w+)\]/);
                                const iconPrefix = iconMatch ? `[${iconMatch[1]}] ` : "";
                                const newTitle = `${iconPrefix}${e.target.value}`;
                                setTitle(newTitle);
                                titleRef.current = newTitle;
                                if (editor) debouncedSave(editor.getHTML(), newTitle);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    editor?.commands.focus();
                                }
                            }}
                            placeholder="Untitled"
                            className="flex-1 w-full text-5xl sm:text-6xl font-bold bg-transparent border-none outline-none text-[#252525] dark:text-white placeholder-[#E8E8E8] dark:placeholder-[#3A3A3A] transition-all duration-300"
                        />

                        {/* Empty State — Show SMALL on the RIGHT */}
                        {(() => {
                            const iconMatch = title.match(/^\[(\w+)\]/);
                            if (!iconMatch) {
                                return (
                                    <div className="relative shrink-0">
                                        <button
                                            disabled={isLocked}
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F0EDE8] dark:hover:bg-[#252525] transition-all duration-300 text-[#545454] dark:text-[#A3A3A3] hover:text-[#252525] dark:hover:text-white"
                                        >
                                            <SmilePlus size={24} className="opacity-30" strokeWidth={1.5} />
                                        </button>
                                        {showEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                                                <div className="absolute top-12 right-0 z-50">
                                                    <PickerContent />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                        {isRevoked && (
                            <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA] bg-[#F0EDE8] dark:bg-white/10 px-3 py-1.5 rounded-full shrink-0 animate-in fade-in duration-300 border border-[#E8E5E0] dark:border-white/10" title="Access Revoked">
                                <EyeOff size={18} />
                                <span className="text-[10px] font-bold hidden sm:inline uppercase tracking-wider">Private Access</span>
                            </div>
                        )}

                    {note?.original_note_id && (
                        <div className="flex items-center gap-2 text-[#7D7D7D] dark:text-[#BABABA] px-0.5 py-1">
                            <DownloadCloud size={16} className="text-blue-500" />
                            <span className="text-sm font-bold tracking-tight">
                                {note.original_note?.user?.name 
                                    ? `Imported from ${note.original_note.user.name}` 
                                    : "Imported from Original Owner"}
                            </span>
                        </div>
                    )}
                </div>

                <div
                    id="editor-container-wrapper"
                    className="flex-1 min-h-[500px] cursor-text relative pb-20 sm:pb-[250px]"
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
                            onDiscard={() => {
                                if (editor && aiInlinePos) {
                                    const start = aiInlinePos.from;
                                    const end = editor.state.selection.to;
                                    editor.chain().focus().deleteRange({ from: start, to: end }).run();
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
            {/* Importers Modal */}
            <ImportersModal
                isOpen={showImporters}
                onClose={() => setShowImporters(false)}
                type="note"
                id={id}
                theme={typeof document !== 'undefined' && document.documentElement.className.includes('dark') ? 'dark' : 'light'}
            />
        </div>
    );
}
