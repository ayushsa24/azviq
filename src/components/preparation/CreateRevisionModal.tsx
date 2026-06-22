"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { FileText, Sparkles, Loader2, Search, Check, ChevronDown, File as FileIcon, AlertCircle, AlertTriangle, Plus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ICON_MAP } from "@/components/editor/EmojiPicker";
import { motion } from "framer-motion";

interface CreateRevisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (revision: any) => void;
}

export default function CreateRevisionModal({ isOpen, onClose, onSuccess }: CreateRevisionModalProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [notes, setNotes] = useState<any[]>([]);
    const [isFetchingNotes, setIsFetchingNotes] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedNoteId("");
            setError("");
            const fetchData = async () => {
                setIsFetchingNotes(true);
                try {
                    const [notesRes, wsRes] = await Promise.all([
                        fetch("/api/notes?all=true"),
                        fetch("/api/workspaces")
                    ]);
                    if (notesRes.ok) {
                        const data = await notesRes.json();
                        setNotes(data.notes || []);
                    }
                    if (wsRes.ok) {
                        const wsData = await wsRes.json();
                        setWorkspaces(wsData.workspaces || []);
                    }
                } catch { /* ignore */ } finally {
                    setIsFetchingNotes(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!selectedNoteId) return;
        setIsGenerating(true);
        setError("");
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const res = await fetch("/api/revision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteId: selectedNoteId }),
                signal: controller.signal
            });
            const data = await res.json();
            if (controller.signal.aborted) return;
            if (!res.ok) { 
                const errorMsg = typeof data.error === "string" ? data.error : (data.error?.message || "Failed to generate revision");
                setError(errorMsg); 
                return; 
            }
            onSuccess(data.revision);
        } catch (err: any) {
            if (err.name === "AbortError") return;
            setError("Network error. Please try again.");
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };

    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        onClose();
    };

    const renderIcon = (title: string, fileUrl?: string | null, size = 16) => {
        const iconMatch = title.match(/^\[(\w+)\]/);
        if (iconMatch && ICON_MAP[iconMatch[1]]) {
            const IconComp = ICON_MAP[iconMatch[1]];
            return <IconComp size={size} className="shrink-0" />;
        }
        return fileUrl ? (
            <FileIcon size={size} className="shrink-0" />
        ) : (
            <FileText size={size} className="shrink-0" />
        );
    };

    const cleanTitle = (title: string) => title.replace(/^\[\w+\]\s*/, "");

    const selectedNote = notes.find(n => n.id === selectedNoteId);
    const lowContentWarning = selectedNote ? (() => {
        const isPdf = !!(selectedNote.file_url);
        const rawContent = selectedNote.content || "";
        
        // Strip block tags and convert them to newlines, then strip remaining HTML tags
        const plainText = rawContent
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<\/div>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/h[1-6]>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&\w+;/g, "");

        const nonEmptyLines = plainText.split("\n").filter((l: string) => l.trim().length > 0);
        if (isPdf && nonEmptyLines.length === 0) return "This PDF appears to have no extractable text content.";
        if (nonEmptyLines.length === 0) return "This note is empty. Add some content before generating a revision.";
        if (nonEmptyLines.length < 6) return `This ${isPdf ? "PDF" : "note"} has very little content (${nonEmptyLines.length} line${nonEmptyLines.length === 1 ? "" : "s"}). The revision may not be very useful.`;
        return null;
    })() : null;

    return (
        <Modal open={isOpen} onClose={handleClose} title="Create Revision">
            <div className="space-y-5 pb-2">
                {!isGenerating ? (
                    <>
                        {/* Info card */}
                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? "bg-[#252525] border-[#545454]" : "bg-[#F0EDE8] border-[#DEDBD6]"}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-[#333] border border-[#545454]" : "bg-white border border-[#DEDBD6]"}`}>
                                <img src={isDark ? "/icon-dark.png" : "/icon-light.png"} alt="AI" className="w-7 h-7 object-contain" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-[#252525] dark:text-white">AI-Powered Revision</h3>
                                <p className="text-xs text-[#545454] dark:text-[#BABABA]">Generates a summary, key terms & Q&A practice from your note.</p>
                            </div>
                        </div>

                        {/* Note selector */}
                        <div>
                            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-[#545454] dark:text-[#BABABA]">Source Note or PDF</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border outline-none font-medium text-sm transition-all ${isDark
                                        ? "bg-[#1A1A1A] border-[#333] text-white hover:bg-[#252525]"
                                        : "bg-[#F0EDE8] border-[#E8E5E0] text-[#252525] hover:bg-[#E8E5E1]"}`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedNoteId ? (() => {
                                            const fact = notes.find(n => n.id === selectedNoteId);
                                            if (!fact) return "Empty";
                                            const ws = workspaces.find(w => w.id === fact.workspace_id);
                                            return (
                                                <>
                                                    {renderIcon(fact.title, fact.file_url)}
                                                    <span className="truncate">
                                                        {ws ? `[${ws.name}] ` : ""}{cleanTitle(fact.title)}
                                                    </span>
                                                </>
                                            );
                                        })() : "Choose a Note or PDF"}
                                    </div>
                                    <ChevronDown className="w-4 h-4 text-[#BABABA] ml-2" />
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute top-12 left-0 w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[110] flex flex-col max-h-[400px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-2 border-b border-[#E8E5E0] dark:border-[#444] bg-gray-50/50 dark:bg-[#1A1A1A]/50">
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" />
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    placeholder="Search material..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#444] rounded-lg text-sm py-2 pl-9 pr-3 outline-none transition-all text-black dark:text-white"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>

                                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                                            {notes.filter(n => !n.is_revoked && n.title.toLowerCase().includes(searchQuery.toLowerCase())).map((n) => {
                                                const ws = workspaces.find((w) => w.id === n.workspace_id);
                                                const isPdf = !!(n.file_url && (!n.content || n.content.trim() === ""));
                                                const isSelected = selectedNoteId === n.id;
                                                return (
                                                    <button
                                                        key={n.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedNoteId(n.id);
                                                            setIsDropdownOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between mt-0.5 ${isSelected ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525] font-bold" : "text-gray-700 dark:text-gray-300 hover:bg-[#F0EDE8] dark:hover:bg-[#1A1A1A]"}`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                            {renderIcon(n.title, n.file_url, 18)}
                                                            <div className="flex flex-col min-w-0 pr-2">
                                                                <span className="truncate">
                                                                    {cleanTitle(n.title)}
                                                                </span>
                                                                <span className={`text-[10px] truncate mt-0.5 flex gap-1 ${isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-500'}`}>
                                                                    {ws && <span className="font-bold">[{ws.name}]</span>}
                                                                    <span>{isPdf ? 'PDF Document' : 'Note'}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                                                    </button>
                                                )
                                            })}
                                            {notes.filter(n => !n.is_revoked && n.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    No material found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-[#BABABA] mt-2 flex items-center gap-1 flex-wrap">
                                Supports both text notes
                                <FileText size={11} className="inline shrink-0" />
                                and PDF files
                                <FileIcon size={11} className="inline shrink-0" />.
                            </p>
                        </div>

                        {/* Low Content Warning */}
                        {lowContentWarning && (
                            <div className={`p-3 rounded-xl flex items-start gap-2.5 ${isDark ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                                <p className="text-xs leading-relaxed">{lowContentWarning}</p>
                            </div>
                        )}

                        {/* Error Banner */}
                        {error && (
                            <div className={`p-3 rounded-2xl flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${isDark ? "bg-red-500/10 border border-red-500/30 text-red-100" : "bg-red-50/80 border border-red-200 text-red-700 font-medium"}`}>
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-red-500">Attention</p>
                                    <p className="text-xs leading-relaxed mb-3">
                                        {error}
                                    </p>
                                    {error.toLowerCase().includes("quota") && (
                                        <button
                                            onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
                                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Upgrade Plan
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setError("");
                                handleGenerate();
                            }}
                            disabled={!selectedNoteId || isGenerating || isFetchingNotes || !!lowContentWarning}
                            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${(selectedNoteId && !isGenerating && !isFetchingNotes && !lowContentWarning)
                                ? isDark ? "bg-white text-[#252525] hover:bg-white/90" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"
                                : isDark ? "bg-[#252525] text-[#545454] cursor-not-allowed" : "bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed"
                                }`}
                        >
                            Generate Revision
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6">
                        <div className="relative">
                            <motion.img 
                                src={isDark ? "/icon-dark.png" : "/icon-light.png"} 
                                alt="AI" 
                                className="w-16 h-16 object-contain"
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [1, 0.7, 1],
                                    filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#BABABA] animate-pulse">AI is crafting your revision...</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
