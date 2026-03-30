"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { MessageSquare, Mic, FileText, Send, Sparkles } from "lucide-react";
import { useStudyTracker } from "@/hooks/useStudyTracker";

type Mode = "chat" | "audio";

export default function PersonalAITab() {
    const { theme } = useTheme();
    const [mode, setMode] = useState<Mode>("chat");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isDark = theme === 'dark';

    useStudyTracker({ activityType: 'personal_ai', isEnabled: true });

    React.useEffect(() => {
        const fetchNotes = async () => {
            try {
                setIsLoading(true);
                const res = await fetch("/api/notes");
                if (res.ok) {
                    const data = await res.json();
                    setNotes(data.notes || []);
                }
            } catch (error) {
                console.error("Failed to fetch notes:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotes();
    }, []);

    const selectedNoteName = notes.find((n: any) => n.id === selectedFile)?.title || "your file";

    return (
        <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* File Selector */}
                <div className="relative flex-1 sm:max-w-xs">
                    <select
                        className={`w-full appearance-none px-4 py-2.5 pr-10 rounded-full border outline-none font-medium text-sm transition-all focus:border-[#7D7D7D] dark:focus:border-[#BABABA] ${isDark
                            ? 'bg-[#252525] border-[#545454] text-white'
                            : 'bg-white border-[#7D7D7D]/40 text-[#252525]'
                            }`}
                        value={selectedFile || ""}
                        onChange={(e) => setSelectedFile(e.target.value)}
                        disabled={isLoading}
                    >
                        <option value="" disabled>{isLoading ? "Loading…" : "Select Context (Note/PDF)"}</option>
                        {notes.map((note: any) => (
                            <option key={note.id} value={note.id}>{note.title}</option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <FileText size={15} className="text-[#BABABA]" />
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className={`flex p-1 rounded-full border shrink-0 ${isDark ? 'bg-[#252525] border-[#545454]' : 'bg-[#F0EDE8] border-[#7D7D7D]/40'}`}>
                    {([
                        { id: "chat" as Mode, icon: MessageSquare, label: "Chat" },
                        { id: "audio" as Mode, icon: Mic, label: "Voice" },
                    ]).map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setMode(id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === id
                                ? isDark ? 'bg-white text-[#252525] shadow-sm' : 'bg-[#252525] text-white shadow-sm'
                                : isDark ? 'text-[#BABABA] hover:text-white' : 'text-[#545454] hover:text-[#252525]'
                                }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Panel */}
            <div
                className={`flex flex-col rounded-xl border transition-all duration-200 overflow-hidden border-[#E8E5E0] dark:border-[#333] bg-white dark:bg-white/5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]`}
                style={{ minHeight: '420px' }}
            >
                {!selectedFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-[#252525]' : 'bg-[#F0EDE8]'}`}>
                            <FileText size={26} className="text-[#BABABA]" />
                        </div>
                        <h3 className="text-base font-semibold text-[#252525] dark:text-white mb-1">Select a Context</h3>
                        <p className="text-sm text-[#545454] dark:text-[#BABABA] max-w-xs leading-relaxed">
                            Choose a Note or PDF above — your AI will analyse it and be ready to answer questions or quiz you.
                        </p>
                    </div>
                ) : mode === "chat" ? (
                    <div className="flex-1 flex flex-col">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#252525] border border-[#545454]' : 'bg-[#F0EDE8] border border-[#7D7D7D]/40'}`}>
                                    <Sparkles className="w-4 h-4 text-[#BABABA]" />
                                </div>
                                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[80%] leading-relaxed ${isDark ? 'bg-[#252525] text-white border border-[#545454]' : 'bg-[#F0EDE8] text-[#252525]'}`}>
                                    I've analysed <strong>{selectedNoteName}</strong>. Ask me anything about it, or I can quiz you on key concepts.
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <div className={`px-4 py-3 rounded-2xl rounded-tr-sm text-sm max-w-[80%] leading-relaxed ${isDark ? 'bg-white text-[#252525]' : 'bg-[#252525] text-white'}`}>
                                    Can you summarise the key concepts?
                                </div>
                            </div>
                        </div>
                        {/* Input */}
                        <div className={`p-4 border-t ${isDark ? 'border-[#333]' : 'border-[#7D7D7D]/40'}`}>
                            <div className={`flex items-end gap-2 p-2 rounded-xl border ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-[#F0EDE8] border-[#E8E5E0]'}`}>
                                <textarea
                                    placeholder="Ask a question or request a summary…"
                                    className="flex-1 bg-transparent px-2 py-1.5 outline-none resize-none max-h-32 text-sm text-[#252525] dark:text-white placeholder-[#9E9E9E]"
                                    rows={1}
                                />
                                <button className={`p-2.5 rounded-lg transition-colors shrink-0 ${isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'}`}>
                                    <Send size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-7">
                        <div>
                            <h3 className="text-base font-semibold text-[#252525] dark:text-white mb-1">Voice Mode</h3>
                            <p className="text-sm text-[#545454] dark:text-[#BABABA]">Discussing: <span className="font-semibold text-[#252525] dark:text-white">{selectedNoteName}</span></p>
                        </div>
                        <button className="group relative">
                            <div className={`absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition-all blur-lg ${isDark ? 'bg-white/10' : 'bg-[#252525]/10'}`} />
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform group-hover:scale-105 group-active:scale-95 relative z-10 ${isDark ? 'bg-white text-[#252525]' : 'bg-[#252525] text-white'} shadow-lg`}>
                                <Mic className="w-8 h-8" />
                            </div>
                        </button>
                        <p className="text-sm font-medium text-[#545454] dark:text-[#BABABA]">Tap to Start Speaking</p>
                    </div>
                )}
            </div>
        </div>
    );
}
