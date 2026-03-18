"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { FileText, Sparkles, Loader2 } from "lucide-react";
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

    useEffect(() => {
        if (isOpen) {
            setSelectedNoteId("");
            setError("");
            const fetchNotes = async () => {
                setIsFetchingNotes(true);
                try {
                    const res = await fetch("/api/notes");
                    if (res.ok) {
                        const data = await res.json();
                        setNotes(data.notes || []);
                    }
                } catch { /* ignore */ } finally {
                    setIsFetchingNotes(false);
                }
            };
            fetchNotes();
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
                        <select
                            value={selectedNoteId}
                            onChange={(e) => setSelectedNoteId(e.target.value)}
                            className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border outline-none font-medium text-sm transition-all focus:border-white ${isDark ? "bg-[#1A1A1A] border-[#545454] text-white" : "bg-[#F0EDE8] border-[#E8E5E0] text-[#252525]"}`}
                        >
                            <option value="" disabled>
                                {isFetchingNotes ? "Loading…" : "Choose a Note or PDF"}
                            </option>
                            {notes.map((n: any) => {
                                const isPdf = !!(n.file_url && (!n.content || n.content.trim() === ""));
                                return (
                                    <option key={n.id} value={n.id}>
                                        {isPdf ? "📄 " : "📝 "}{n.title}
                                    </option>
                                );
                            })}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <FileText size={16} className="text-[#BABABA]" />
                        </div>
                    </div>
                    <p className="text-xs text-[#BABABA] mt-2">Supports both text notes (📝) and PDF files (📄).</p>
                </div>

                {/* Error */}
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                {/* Generating Skeleton Screen */}
                {isGenerating && (
                    <div className="flex flex-col items-center text-center space-y-5 py-4 animate-pulse">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
                        </div>
                        <div className="space-y-2 w-full flex flex-col items-center">
                            <div className={`h-6 w-32 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                            <div className={`h-4 w-48 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                        </div>
                        <div className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 ${isDark ? "bg-[#1A1A1A] border-[#333]" : "bg-[#F5F3EF] border-[#E8E5E0]"}`}>
                            <div className={`w-9 h-9 rounded-xl shrink-0 ${isDark ? "bg-white/5" : "bg-white/50"}`} />
                            <div className="space-y-2 flex-1">
                                <div className={`h-4 w-3/4 rounded-md ${isDark ? "bg-white/5" : "bg-gray-200"}`} />
                                <div className={`h-3 w-1/2 rounded-md ${isDark ? "bg-white/5" : "bg-gray-200"}`} />
                            </div>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#BABABA] animate-pulse mt-2">AI is analyzing and summarizing...</p>
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
