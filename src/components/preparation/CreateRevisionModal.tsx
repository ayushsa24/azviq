"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { FileText, Sparkles, Loader2, Search, Check, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
        try {
            const res = await fetch("/api/revision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteId: selectedNoteId }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Failed to generate revision"); return; }
            onSuccess(data.revision);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Create Revision">
            <div className="space-y-5 pb-2">
                {/* Info card */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? "bg-[#252525] border-[#545454]" : "bg-[#F0EDE8] border-[#DEDBD6]"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? "bg-[#333] border border-[#545454]" : "bg-white border border-[#DEDBD6]"}`}>
                        <Sparkles className="w-5 h-5 text-[#252525] dark:text-white" />
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
                            <span className="truncate">
                                {selectedNoteId ? (() => {
                                    const fact = notes.find(n => n.id === selectedNoteId);
                                    if (!fact) return "Empty";
                                    const ws = workspaces.find(w => w.id === fact.workspace_id);
                                    const isPdf = !!(fact.file_url && (!fact.content || fact.content.trim() === ""));
                                    return `${isPdf ? "📄 " : "📝 "}${ws ? `[${ws.name}] ` : ""}${fact.title}`;
                                })() : "Choose a Note or PDF"}
                            </span>
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
                                    {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).map((n) => {
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
                                                <div className="flex flex-col min-w-0 pr-2">
                                                    <span className="truncate">
                                                        {isPdf ? "📄 " : "📝 "}{n.title}
                                                    </span>
                                                    <span className={`text-[10px] truncate mt-0.5 flex gap-1 ${isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-500'}`}>
                                                        {ws && <span className="font-bold">[{ws.name}]</span>}
                                                        <span>{isPdf ? 'PDF Document' : 'Note'}</span>
                                                    </span>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                                            </button>
                                        )
                                    })}
                                    {notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                        <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                            No material found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-[#BABABA] mt-2">Supports both text notes (📝) and PDF files (📄).</p>
                </div>

                {/* Error */}
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                {/* Generating Loader */}
                {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/20 border-t-white' : 'border-[#252525]/10 border-t-[#252525]'}`} />
                            <Sparkles className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#BABABA] animate-pulse">AI is analyzing and summarizing...</p>
                    </div>
                )}

                {/* Submit */}
                {!isGenerating && (
                    <button
                        onClick={handleGenerate}
                        disabled={!selectedNoteId || isGenerating || isFetchingNotes}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedNoteId && !isGenerating && !isFetchingNotes
                            ? isDark ? "bg-white text-[#252525] hover:bg-white/90" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"
                            : isDark ? "bg-[#252525] text-[#545454] cursor-not-allowed" : "bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed"
                            }`}
                    >
                        {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating Revision…</> : "Generate Revision"}
                    </button>
                )}
            </div>
        </Modal>
    );
}
