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
                        <Sparkles className="w-5 h-5 text-[#252525] dark:text-[#CFCFCF]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-[#252525] dark:text-[#CFCFCF]">AI-Powered Revision</h3>
                        <p className="text-xs text-[#545454] dark:text-[#7D7D7D]">Generates a summary, key terms & Q&A practice from your note.</p>
                    </div>
                </div>

                {/* Note selector */}
                <div>
                    <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-[#545454] dark:text-[#7D7D7D]">Source Note or PDF</label>
                    <div className="relative">
                        <select
                            value={selectedNoteId}
                            onChange={(e) => setSelectedNoteId(e.target.value)}
                            className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border outline-none font-medium text-sm transition-all focus:border-[#7D7D7D] ${isDark ? "bg-[#1A1A1A] border-[#545454] text-[#CFCFCF]" : "bg-[#F5F3EF] border-[#E8E5E0] text-[#252525]"}`}
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
                            <FileText size={16} className="text-[#7D7D7D]" />
                        </div>
                    </div>
                    <p className="text-xs text-[#7D7D7D] mt-2">Supports both text notes (📝) and PDF files (📄).</p>
                </div>

                {/* Error */}
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                {/* Submit */}
                <button
                    onClick={handleGenerate}
                    disabled={!selectedNoteId || isGenerating || isFetchingNotes}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedNoteId && !isGenerating && !isFetchingNotes
                        ? isDark ? "bg-[#CFCFCF] text-[#252525] hover:bg-white" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"
                        : isDark ? "bg-[#252525] text-[#545454] cursor-not-allowed" : "bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed"
                        }`}
                >
                    {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating Revision…</> : "Generate Revision"}
                </button>
            </div>
        </Modal>
    );
}
