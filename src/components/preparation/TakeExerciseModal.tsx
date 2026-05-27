"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, Trophy } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useAppDialog } from "@/components/ui/AppDialog";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

interface Question {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

interface Exercise {
    id: string;
    title: string;
    questions: Question[];
    status: string;
    score: number | null;
}

interface TakeExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: Exercise | null;
    onComplete: () => void;
}

export default function TakeExerciseModal({ isOpen, onClose, exercise, onComplete }: TakeExerciseModalProps) {
    const { theme } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isDark = theme === 'dark';
    const dialog = useAppDialog();

    useStudyTracker({ activityType: 'exercise', isEnabled: isOpen, subject: "Exercise", topic: exercise?.title || "Practice" });

    useEffect(() => {
        if (isOpen && exercise) {
            if (exercise.status === 'Completed') {
                setIsSubmitted(true);
            } else {
                setAnswers({});
                setCurrentIndex(0);
                setIsSubmitted(false);
            }
        }
    }, [isOpen, exercise]);

    if (!exercise || !exercise.questions || exercise.questions.length === 0) return null;

    const currentQuestion = exercise.questions[currentIndex];
    const isLastQuestion = currentIndex === exercise.questions.length - 1;
    const hasAnsweredCurrent = answers[currentIndex] !== undefined;
    const totalQs = exercise.questions.length;

    const computedScore = isSubmitted
        ? Math.round((Object.keys(answers).filter(k => answers[Number(k)] === exercise.questions[Number(k)].correctAnswerIndex).length / totalQs) * 100)
        : null;
    const displayScore = exercise.score !== null && exercise.score !== undefined ? exercise.score : computedScore;

    const handleOptionSelect = (idx: number) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [currentIndex]: idx }));
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            let correct = 0;
            exercise.questions.forEach((q, i) => {
                if (answers[i] === q.correctAnswerIndex) {
                    correct++;
                }
            });
            const scorePercentage = Math.round((correct / totalQs) * 100);
            const res = await fetch(`/api/exercises/${exercise.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Completed", score: scorePercentage })
            });
            if (!res.ok) throw new Error("Failed to save score");
            setIsSubmitted(true);
            setCurrentIndex(0);
            onComplete();
        } catch (error) {
            dialog.showAlert("Failed to submit exercise results.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderIcon = (title: string, size = 20) => {
        const iconMatch = title.match(/^\[(\w+)\]/);
        if (iconMatch && ICON_MAP[iconMatch[1]]) {
            const IconComp = ICON_MAP[iconMatch[1]];
            return <IconComp size={size} className="shrink-0" />;
        }
        return null;
    };

    const cleanTitle = (title: string) => title.replace(/^\[\w+\]\s*/, "");

    return (
        <Modal 
            open={isOpen} 
            onClose={onClose} 
            title={
                isSubmitted ? "Results Review" : (
                    <div className="flex items-center gap-2 truncate">
                        {renderIcon(exercise.title, 20)}
                        <span className="truncate">{cleanTitle(exercise.title)}</span>
                    </div>
                )
            }
        >
            <div className={`py-3 ${isDark ? 'text-[#CFCFCF]' : 'text-[#252525]'}`}>

                {/* Score Banner (shown when reviewing at Q1) */}
                {isSubmitted && currentIndex === 0 && (
                    <div className={`mb-6 p-5 rounded-xl flex flex-col sm:flex-row items-center gap-4 border ${isDark ? 'bg-[#252525] border-[#545454]' : 'bg-[#F5F3EF] border-[#E8E5E0]'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-[#1A1A1A] border border-[#545454]' : 'bg-white border border-[#7D7D7D]/40'}`}>
                            <Trophy className="w-7 h-7 text-[#545454] dark:text-[#7D7D7D]" />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#7D7D7D] mb-0.5">Your Score</p>
                            {/* Score color: green if ≥80, red if <50, else neutral */}
                            <p className={`text-3xl font-black ${displayScore !== null && displayScore >= 80 ? 'text-green-500' : displayScore !== null && displayScore < 50 ? 'text-red-500' : 'text-[#252525] dark:text-[#CFCFCF]'}`}>
                                {displayScore}%
                            </p>
                            <p className="text-xs text-[#7D7D7D] mt-0.5">Tap a number below to review each question.</p>
                        </div>

                        {/* Question navigator dots */}
                        <div className="flex gap-1.5 flex-wrap sm:ml-auto justify-center">
                            {exercise.questions.map((q, i) => {
                                const correct = answers[i] === q.correctAnswerIndex;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        title={`Q${i + 1}`}
                                        className={`w-7 h-7 rounded-full text-xs font-bold transition-all flex items-center justify-center ring-offset-1 ${i === currentIndex ? 'ring-2 ring-[#252525] dark:ring-[#CFCFCF]' : ''
                                            } ${correct
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                <div className="mb-5">
                    <div className="flex justify-between text-xs font-semibold text-[#7D7D7D] mb-2 uppercase tracking-wider">
                        <span>Question {currentIndex + 1} / {totalQs}</span>
                        {isSubmitted && (
                            <span className={answers[currentIndex] === currentQuestion.correctAnswerIndex ? 'text-green-500' : 'text-red-500'}>
                                {answers[currentIndex] === currentQuestion.correctAnswerIndex ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                        )}
                    </div>
                    <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-[#333]' : 'bg-[#E8E5E0]'} overflow-hidden`}>
                        <div
                            className={`h-full transition-all duration-300 rounded-full ${isDark ? 'bg-white' : 'bg-[#252525]'}`}
                            style={{ width: `${((currentIndex + 1) / totalQs) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Question text */}
                <p className="text-base font-semibold leading-relaxed mb-5 text-[#252525] dark:text-[#CFCFCF]">{currentQuestion.question}</p>

                {/* Options */}
                <div className="space-y-2.5 mb-5">
                    {currentQuestion.options.map((opt, idx) => {
                        const isSelected = answers[currentIndex] === idx;
                        const isCorrect = currentQuestion.correctAnswerIndex === idx;
                        const showCorrect = isSubmitted && isCorrect;
                        const showIncorrect = isSubmitted && isSelected && !isCorrect;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                disabled={isSubmitted}
                                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 text-sm ${
                                    // Green only for correct answer, red only for wrong selection
                                    showCorrect
                                        ? 'bg-green-50 dark:bg-green-900/15 border-green-400 text-green-800 dark:text-green-300 font-medium'
                                        : showIncorrect
                                            ? 'bg-red-50 dark:bg-red-900/15 border-red-400 text-red-800 dark:text-red-300 font-medium'
                                            : isSelected
                                                ? isDark
                                                    ? 'bg-[#333] border-white text-white font-semibold'
                                                    : 'bg-[#F0EDE8] border-[#252525] text-[#252525] font-semibold'
                                                : isDark
                                                    ? 'bg-[#1A1A1A] border-[#333] hover:bg-[#252525] hover:border-[#545454] text-[#7D7D7D]'
                                                    : 'bg-white border-[#7D7D7D]/40 hover:bg-[#F9F8F6] hover:border-[#D1D1D1] text-[#545454]'
                                    }`}
                            >
                                {/* Letter indicator */}
                                <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${showCorrect ? 'bg-green-500 text-white border-green-500' :
                                    showIncorrect ? 'bg-red-500 text-white border-red-500' :
                                        isSelected
                                            ? isDark ? 'bg-white text-[#252525] border-white' : 'bg-[#252525] text-white border-[#252525]'
                                            : isDark ? 'border-[#545454] text-[#545454]' : 'border-[#DEDBD6] text-[#9E9E9E]'
                                    }`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                                {showIncorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation */}
                {isSubmitted && (
                    <div className={`mb-5 p-4 rounded-xl text-sm leading-relaxed border-l-4 ${answers[currentIndex] === currentQuestion.correctAnswerIndex
                        ? isDark ? 'bg-green-900/15 border-green-500 text-green-300' : 'bg-green-50 border-green-400 text-green-800'
                        : isDark ? 'bg-red-900/15 border-red-500 text-red-300' : 'bg-red-50 border-red-400 text-red-800'
                        }`}>
                        <span className="font-semibold block mb-1">Explanation</span>
                        {currentQuestion.explanation}
                    </div>
                )}

                {/* Navigation Footer */}
                <div className={`flex items-center pt-4 border-t ${isDark ? 'border-[#333]' : 'border-[#7D7D7D]/40'} ${currentIndex > 0 ? 'justify-between' : 'justify-end'}`}>
                    {currentIndex > 0 && (
                        <button
                            onClick={() => setCurrentIndex(prev => prev - 1)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${isDark ? 'border-[#333] text-[#7D7D7D] hover:bg-[#252525] hover:text-[#CFCFCF] hover:border-[#545454]' : 'border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:border-[#D1D1D1] hover:text-[#252525]'}`}
                        >
                            <ArrowLeft size={15} />
                            Previous
                        </button>
                    )}

                    {!isLastQuestion ? (
                        <button
                            onClick={() => setCurrentIndex(prev => prev + 1)}
                            disabled={!hasAnsweredCurrent && !isSubmitted}
                            className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${(hasAnsweredCurrent || isSubmitted)
                                ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                : isDark ? 'bg-[#252525] text-[#545454] cursor-not-allowed' : 'bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed'
                                }`}
                        >
                            Next <ArrowRight size={15} />
                        </button>
                    ) : (
                        !isSubmitted ? (
                            <button
                                onClick={handleSubmit}
                                disabled={!hasAnsweredCurrent || isSubmitting}
                                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${hasAnsweredCurrent
                                    ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                    : isDark ? 'bg-[#252525] text-[#545454] cursor-not-allowed' : 'bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? "Saving…" : "Submit Exercise"}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all ${isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'}`}
                            >
                                Finish Review
                            </button>
                        )
                    )}
                </div>
            </div>
        </Modal>
    );
}
