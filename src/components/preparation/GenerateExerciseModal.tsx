"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { FileText, SearchCode, Sparkles, CheckCircle2 } from "lucide-react";
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
    const isDark = theme === 'dark';

    useEffect(() => {
        if (isOpen) {
            const fetchNotes = async () => {
                try {
                    setIsFetchingNotes(true);
                    const res = await fetch("/api/notes");
                    if (res.ok) {
                        const data = await res.json();
                        setNotes(data.notes || []);
                    }
                } catch (error) {
                    console.error("Failed to fetch notes:", error);
                } finally {
                    setIsFetchingNotes(false);
                }
            };
            fetchNotes();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!selectedFile) return;
        setStep("generating");
        try {
            const res = await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ noteId: selectedFile, count: questionCount })
            });
            if (!res.ok) throw new Error("Failed to generate exercise");
            const data = await res.json();
            setCreatedExercise(data.exercise);
            setStep("result");
        } catch (error) {
            console.error(error);
            alert("An error occurred while generating the exercise.");
            setStep("select");
        }
    };

    const handleClose = () => {
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
                                <select
                                    className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border outline-none font-medium text-sm transition-all focus:border-white ${isDark
                                        ? 'bg-[#1A1A1A] border-[#545454] text-white'
                                        : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#252525]'
                                        }`}
                                    value={selectedFile || ""}
                                    onChange={(e) => setSelectedFile(e.target.value)}
                                >
                                    <option value="" disabled>
                                        {isFetchingNotes ? "Loading notes…" : "Choose a Note or PDF"}
                                    </option>
                                    {notes.map((note: any) => (
                                        <option key={note.id} value={note.id}>{note.title}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <FileText size={16} className="text-[#BABABA]" />
                                </div>
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
