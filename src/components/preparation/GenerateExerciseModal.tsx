"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { FileText, SearchCode, Sparkles, CheckCircle2, Search, Check, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface GenerateExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newExercise?: any) => void;
}

export default function GenerateExerciseModal({ isOpen, onClose, onSuccess }: GenerateExerciseModalProps) {
    const { theme } = useTheme();
    const [step, setStep] = useState<"select" | "generating" | "result">("select");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [isFetchingNotes, setIsFetchingNotes] = useState(false);
    const [createdExercise, setCreatedExercise] = useState<any>(null);
    const [questionCount, setQuestionCount] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    setIsFetchingNotes(true);
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
                } catch (error) {
                    console.error("Failed to fetch data:", error);
                } finally {
                    setIsFetchingNotes(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!selectedFile) return;
        setStep("generating");
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const res = await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteId: selectedFile, count: questionCount }),
                signal: controller.signal
            });
            if (!res.ok) throw new Error("Failed to generate exercise");
            const data = await res.json();
            setCreatedExercise(data.exercise);
            setStep("result");
        } catch (error: any) {
            if (error.name === "AbortError") return;
            console.error(error);
            alert("An error occurred while generating the exercise.");
            setStep("select");
        } finally {
            abortControllerRef.current = null;
        }
    };

    const handleClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setStep("select");
        setSelectedFile(null);
        setCreatedExercise(null);
        onClose();
    };

    const selectedNote = notes.find((n: any) => n.id === selectedFile);

    return (
        <Modal open={isOpen} onClose={handleClose} title="Generate Exercise">
            <div className={`py-4 ${isDark ? 'text-[#CFCFCF]' : 'text-[#252525]'}`}>

                {/* STEP: SELECT */}
                {step === "select" && (
                    <div className="space-y-5">
                        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-[#252525] border-[#545454]' : 'bg-[#F0EDE8] border-[#DEDBD6]'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#333] border border-[#545454]' : 'bg-white border border-[#DEDBD6]'}`}>
                                <Sparkles className="w-5 h-5 text-[#252525] dark:text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm text-[#252525] dark:text-white">New Exercise</h3>
                                <p className="text-xs text-[#545454] dark:text-[#BABABA]">Select a note — AI will generate a custom quiz.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest text-[#545454] dark:text-[#BABABA]">Source Material</label>
                            
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border outline-none font-medium text-sm transition-all ${isDark
                                        ? 'bg-[#1A1A1A] border-[#333] text-white hover:bg-[#252525]'
                                        : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#252525] hover:bg-[#E8E5E1]'
                                        }`}
                                >
                                    <span className="truncate">
                                        {selectedFile ? (() => {
                                            const fact = notes.find(n => n.id === selectedFile);
                                            if (!fact) return "Empty";
                                            const ws = workspaces.find(w => w.id === fact.workspace_id);
                                            return `${ws ? `[${ws.name}] ` : ""}${fact.title} (${fact.file_url ? 'PDF' : 'Note'})`;
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
                                                const wsPrefix = ws ? `[${ws.name}] ` : "";
                                                const isSelected = selectedFile === n.id;
                                                return (
                                                    <button
                                                        key={n.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFile(n.id);
                                                            setIsDropdownOpen(false);
                                                            setSearchQuery("");
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center justify-between mt-0.5 ${isSelected ? "bg-[#252525] text-white dark:bg-white dark:text-[#252525] font-bold" : "text-gray-700 dark:text-gray-300 hover:bg-[#F0EDE8] dark:hover:bg-[#1A1A1A]"}`}
                                                    >
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <span className="truncate">
                                                                {n.title}
                                                            </span>
                                                            <span className={`text-[10px] truncate mt-0.5 flex gap-1 ${isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-500'}`}>
                                                                {wsPrefix && <span className="font-bold">{wsPrefix}</span>}
                                                                <span>{n.file_url ? 'PDF Document' : 'Note'}</span>
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
                            <p className="text-xs text-[#BABABA] mt-2">AI reads this document and crafts targeted questions.</p>
                        </div>

                        {/* Question Count Selector */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold uppercase tracking-widest text-[#545454] dark:text-[#BABABA]">Quiz Length</label>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isDark ? 'bg-[#333] text-white' : 'bg-[#F0EDE8] text-[#252525]'}`}>{questionCount} Questions</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {[5, 10, 15, 20].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setQuestionCount(num)}
                                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${questionCount === num
                                            ? isDark ? 'bg-white text-[#252525] border-white' : 'bg-[#252525] text-white border-[#252525]'
                                            : isDark ? 'bg-transparent border-[#333] text-[#BABABA] hover:bg-[#252525]' : 'bg-white border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8]'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={!selectedFile || isFetchingNotes}
                            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${selectedFile && !isFetchingNotes
                                ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                : isDark ? 'bg-[#252525] text-[#545454] cursor-not-allowed' : 'bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed'
                                }`}
                        >
                            <SearchCode size={16} />
                            Generate Quiz
                        </button>
                    </div>
                )}

                {/* STEP: GENERATING */}
                {step === "generating" && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="relative">
                            <div className={`w-12 h-12 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/20 border-t-white' : 'border-[#252525]/10 border-t-[#252525]'}`} />
                            <Sparkles className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isDark ? 'text-white' : 'text-[#252525]'}`} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#BABABA] animate-pulse">AI is crafting your quiz...</p>
                    </div>
                )}

                {/* STEP: RESULT */}
                {step === "result" && (
                    <div className="flex flex-col items-center text-center space-y-5 py-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-green-900/20' : 'bg-green-50'}`}>
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-1 text-[#252525] dark:text-white">Quiz Ready!</h3>
                            <p className="text-sm text-[#545454] dark:text-[#BABABA]">{createdExercise?.questions?.length || questionCount} questions generated from your note.</p>
                        </div>
                        <div className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 ${isDark ? 'bg-[#1A1A1A] border-[#333]' : 'bg-[#F5F3EF] border-[#E8E5E0]'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#252525] border border-[#545454]' : 'bg-white border border-[#E8E5E0]'}`}>
                                <FileText className="w-4 h-4 text-[#BABABA]" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-[#252525] dark:text-white">{selectedNote?.title || "Custom"} Quiz</h4>
                                <p className="text-xs text-[#BABABA] mt-0.5">{createdExercise?.questions?.length || questionCount} Questions · Medium Difficulty</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSuccess(createdExercise)}
                            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'}`}
                        >
                            Start Exercise Now →
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
