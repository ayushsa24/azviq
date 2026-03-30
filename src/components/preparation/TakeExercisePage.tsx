"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Trophy, Clock, RotateCcw, PanelLeft } from "lucide-react";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSidebar } from "@/contexts/SidebarContext";

interface Question {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    userAnswer?: number;
}
interface Exercise {
    id: string;
    title: string;
    questions: Question[];
    status: string;
    score: number | null;
    time_taken?: number | null;
}
interface TakeExercisePageProps {
    exercise: Exercise;
    onBack: () => void;
    onComplete: () => void;
}

function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function TakeExercisePage({ exercise, onBack, onComplete }: TakeExercisePageProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Call useStudyTracker hook
    useStudyTracker({ activityType: "exercise", subject: "Exercise", topic: exercise.title });

    // Timer
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeTakenRef = useRef(0); // stores final time at submit

    const startTimer = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    useEffect(() => {
        if (exercise.status === 'Completed') {
            setIsSubmitted(true);
            timeTakenRef.current = exercise.time_taken ?? 0;
            setElapsed(exercise.time_taken ?? 0);

            // Reconstruct saved answers from DB if available
            const loadedAnswers: Record<number, number> = {};
            exercise.questions?.forEach((q, i) => {
                if (q.userAnswer !== undefined) {
                    loadedAnswers[i] = q.userAnswer;
                }
            });
            setAnswers(loadedAnswers);
        } else {
            setAnswers({});
            setCurrentIndex(0);
            setIsSubmitted(false);
            setShowResults(false);
            setElapsed(0);
            startTimer();
        }
        return () => stopTimer();
    }, [exercise.id]);

    const questions = exercise.questions || [];
    const totalQs = questions.length;
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === totalQs - 1;
    const hasAnsweredCurrent = answers[currentIndex] !== undefined;
    const answeredCount = Object.keys(answers).length;

    const correctCount = Object.keys(answers).filter(
        k => answers[Number(k)] === questions[Number(k)]?.correctAnswerIndex
    ).length;

    const wrongCount = answeredCount - correctCount;
    const skippedCount = totalQs - answeredCount;

    const computedScore = isSubmitted ? Math.round((correctCount / totalQs) * 100) : null;
    const displayScore = (exercise.score !== null && exercise.score !== undefined)
        ? exercise.score : computedScore;

    const displayTimeTaken = isSubmitted ? timeTakenRef.current : elapsed;

    const handleOptionSelect = (idx: number) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [currentIndex]: idx }));
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        stopTimer();
        timeTakenRef.current = elapsed;
        setIsSubmitting(true);
        try {
            const scorePercentage = Math.round((correctCount / totalQs) * 100);

            // Save user answers to the DB so review works properly later
            const updatedQuestions = questions.map((q, i) => ({
                ...q,
                userAnswer: answers[i]
            }));

            const res = await fetch(`/api/exercises/${exercise.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "Completed",
                    score: scorePercentage,
                    time_taken: elapsed,
                    questions: updatedQuestions
                })
            });
            if (!res.ok) throw new Error();

            // Log exercise results for weak subject detection
            fetch("/api/exercise-results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    exercise_id: exercise.id,
                    subject: "Exercise",
                    topic: exercise.title,
                    total_questions: totalQs,
                    correct_answers: correctCount,
                }),
            }).catch(() => {}); // Fire and forget
            setIsSubmitted(true);
            setShowResults(true);   // go to results screen
            // onComplete(); // removed so user can see score first
        } catch {
            startTimer(); // resume timer if failed
            alert("Failed to submit exercise results.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const scoreColor = (s: number | null) => {
        if (s === null) return 'text-[#252525] dark:text-white';
        if (s >= 80) return 'text-green-500';
        if (s < 50) return 'text-red-500';
        return 'text-[#252525] dark:text-white';
    };

    const scoreBg = (s: number | null) => {
        if (s === null) return isDark ? 'bg-[#252525] border-[#545454]' : 'bg-[#F5F3EF] border-[#E8E5E0]';
        if (s >= 80) return isDark ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-200';
        if (s < 50) return isDark ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200';
        return isDark ? 'bg-[#252525] border-[#545454]' : 'bg-[#F5F3EF] border-[#E8E5E0]';
    };

    const qNumCls = (i: number) => {
        const isActive = i === currentIndex;
        const isAnswered = answers[i] !== undefined;
        const isCorrect = isSubmitted && answers[i] === questions[i]?.correctAnswerIndex;
        const isWrong = isSubmitted && isAnswered && answers[i] !== questions[i]?.correctAnswerIndex;
        const isSkipped = isSubmitted && !isAnswered;

        if (isCorrect) return 'bg-green-500 text-white border-green-500';
        if (isWrong) return 'bg-red-500 text-white border-red-500';
        if (isSkipped && !isActive) return isDark ? 'bg-transparent text-[#7D7D7D] border-[#333]' : 'bg-white text-[#BABABA] border-[#E8E5E0]';
        if (isActive) return isDark ? 'bg-white text-[#252525] border-white' : 'bg-[#252525] text-white border-[#252525]';
        if (isAnswered) return isDark ? 'bg-[#3A3A3A] text-white border-[#545454]' : 'bg-[#E8E5E0] text-[#252525] border-[#D1D1D1]';
        return isDark ? 'bg-transparent text-[#BABABA] border-[#545454] hover:bg-[#252525]' : 'bg-white text-[#545454] border-[#DEDBD6] hover:bg-[#F0EDE8]';
    };

    // ══════════════════════════════════════
    //  RESULTS SCREEN
    // ══════════════════════════════════════
    if (showResults || (isSubmitted && exercise.status === 'Completed' && !currentQuestion)) {
        return (
            <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] overflow-y-auto scrollbar-hide">
                <div className="max-w-xl mx-auto w-full px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8 flex flex-col gap-6">

                    {/* Back + title */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {!sidebarOpen && (
                            <button
                                onClick={toggleSidebar}
                                className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border border-transparent transition-all text-[#545454] dark:text-[#7D7D7D] hover:bg-white hover:text-[#252525] shrink-0"
                                title="Open Sidebar"
                            >
                                <PanelLeft size={18} />
                            </button>
                        )}
                        <button onClick={onBack} title="Back" className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all shrink-0 ${isDark ? 'border-[#545454] text-[#7D7D7D] hover:bg-white hover:text-[#252525]' : 'border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'}`}>
                            <ArrowLeft size={14} />
                        </button>
                        <h1 className="text-base font-bold text-[#252525] dark:text-white truncate flex-1">{exercise.title}</h1>
                    </div>

                    {/* Big score card */}
                    <div className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-4 ${scoreBg(displayScore)}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-[#1A1A1A]' : 'bg-white'} shadow-sm`}>
                            <Trophy className="w-8 h-8 text-[#545454] dark:text-[#7D7D7D]" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-[#7D7D7D] mb-1">Your Score</p>
                            <p className={`text-6xl font-black ${scoreColor(displayScore)}`}>{displayScore}%</p>
                            <p className="text-sm text-[#7D7D7D] mt-2">
                                {answeredCount > 0
                                    ? `${correctCount} of ${totalQs} correct`
                                    : "Past score (answers not retained)"}
                            </p>
                        </div>

                        <div className="flex gap-2 w-full mt-1">
                            {isSubmitted && (
                                <>
                                    <div className={`flex-1 py-3 rounded-xl text-center border ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
                                        <p className="text-2xl font-black text-green-500">{correctCount}</p>
                                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mt-0.5">Correct</p>
                                    </div>
                                    <div className={`flex-1 py-3 rounded-xl text-center border ${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                                        <p className="text-2xl font-black text-red-500">{wrongCount}</p>
                                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase mt-0.5">Wrong</p>
                                    </div>
                                    <div className={`flex-1 py-3 rounded-xl text-center border ${isDark ? 'bg-[#252525] border-[#545454]' : 'bg-white border-[#7D7D7D]/40'}`}>
                                        <p className="text-2xl font-black text-[#7D7D7D]">{skippedCount}</p>
                                        <p className="text-[10px] text-[#7D7D7D] font-bold uppercase mt-0.5">Skipped</p>
                                    </div>
                                </>
                            )}
                            <div className={`flex-1 py-3 rounded-xl text-center border ${isDark ? 'bg-[#252525] border-[#333]' : 'bg-white border-[#7D7D7D]/20 shadow-sm'} ${!isSubmitted ? 'w-full' : ''}`}>
                                <p className="text-xl font-black text-[#252525] dark:text-white">{formatTime(timeTakenRef.current || displayTimeTaken)}</p>
                                <p className="text-[10px] text-[#7D7D7D] font-bold uppercase mt-0.5 flex items-center justify-center gap-1">
                                    <Clock size={11} /> Time
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowResults(false); setCurrentIndex(0); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all ${isDark ? 'border-[#545454] text-white hover:bg-[#252525]' : 'border-[#7D7D7D]/40 text-[#252525] hover:bg-[#F0EDE8]'}`}
                        >
                            <RotateCcw size={15} /> Review Answers
                        </button>
                        <button
                            onClick={onBack}
                            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'}`}
                        >
                            Back to Exercises
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════
    //  QUIZ SCREEN
    // ══════════════════════════════════════
    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] overflow-hidden">

            {/* ── Top bar ── */}
            <div className={`flex items-center gap-1.5 sm:gap-3 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 border-b shrink-0 ${isDark ? 'border-[#333] bg-[#1A1A1A]' : 'border-[#E8E5E0] bg-[#F5F3EF]'}`}>
                {!sidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border border-transparent transition-all text-[#545454] dark:text-[#7D7D7D] hover:bg-white hover:text-[#252525] shrink-0"
                        title="Open Sidebar"
                    >
                        <PanelLeft size={18} />
                    </button>
                )}
                <button
                    onClick={onBack}
                    title="Back"
                    className="flex items-center text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors active:scale-95 shrink-0"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#252525] dark:text-white truncate">{exercise.title}</p>
                </div>

                {/* Timer */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold shrink-0 ${isDark ? 'bg-[#252525] text-white' : 'bg-[#F0EDE8] text-[#252525]'}`}>
                    <Clock size={13} className="text-[#7D7D7D]" />
                    {formatTime(elapsed)}
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${isDark ? 'bg-[#252525] text-[#7D7D7D]' : 'bg-[#F0EDE8] text-[#545454]'}`}>
                    {answeredCount}/{totalQs}
                </span>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT: Question + Options */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="px-4 sm:px-8 py-5 max-w-2xl flex flex-col gap-4">

                        {/* Question label */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#7D7D7D]">
                                Question {currentIndex + 1} of {totalQs}
                            </span>
                            {isSubmitted && (
                                <span className={`text-xs font-semibold ${
                                    answers[currentIndex] === undefined 
                                        ? 'text-[#7D7D7D]' 
                                        : answers[currentIndex] === currentQuestion.correctAnswerIndex 
                                            ? 'text-green-500' 
                                            : 'text-red-500'
                                }`}>
                                    {answers[currentIndex] === undefined 
                                        ? '○ Skipped' 
                                        : answers[currentIndex] === currentQuestion.correctAnswerIndex 
                                            ? '✓ Correct' 
                                            : '✗ Incorrect'}
                                </span>
                            )}
                        </div>

                        {/* Question text */}
                        <p className="text-base sm:text-[17px] font-semibold leading-relaxed text-[#252525] dark:text-white">
                            {currentQuestion.question}
                        </p>

                        {/* Options */}
                        <div className="flex flex-col gap-2.5">
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
                                        className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${showCorrect
                                            ? 'bg-green-50 dark:bg-green-900/15 border-green-400'
                                            : showIncorrect
                                                ? 'bg-red-50 dark:bg-red-900/15 border-red-400'
                                                : isSelected
                                                    ? isDark ? 'bg-[#2A2A2A] border-white' : 'bg-[#F0EDE8] border-[#252525]'
                                                    : isDark
                                                        ? 'bg-[#1E1E1E] border-[#2E2E2E] hover:bg-[#252525] hover:border-[#545454]'
                                                        : 'bg-white border-[#7D7D7D]/40 hover:bg-[#F9F8F6] hover:border-[#D1D1D1]'
                                            }`}
                                    >
                                        {/* Radio */}
                                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${showCorrect ? 'border-green-500 bg-green-500' :
                                            showIncorrect ? 'border-red-500 bg-red-500' :
                                                isSelected ? isDark ? 'border-white bg-white' : 'border-[#252525] bg-[#252525]' :
                                                    isDark ? 'border-[#545454]' : 'border-[#E8E5E0]'
                                            }`}>
                                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                                        </span>

                                        {/* Letter */}
                                        <span className="text-xs font-bold text-[#9E9E9E] w-5 shrink-0">
                                            {String.fromCharCode(65 + idx)}.
                                        </span>

                                        <span className={`flex-1 text-sm sm:text-base font-medium ${showCorrect ? 'text-green-800 dark:text-green-300' :
                                            showIncorrect ? 'text-red-800 dark:text-red-300' :
                                                isSelected ? 'text-[#252525] dark:text-white font-semibold' :
                                                    'text-[#545454] dark:text-[#BABABA]'
                                            }`}>{opt}</span>

                                        {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                                        {showIncorrect && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        {isSubmitted && (
                            <div className={`p-4 rounded-xl text-sm leading-relaxed border-l-4 ${answers[currentIndex] === currentQuestion.correctAnswerIndex
                                ? isDark ? 'bg-green-900/10 border-green-500 text-green-300' : 'bg-green-50 border-green-400 text-green-800'
                                : isDark ? 'bg-red-900/10 border-red-500 text-red-300' : 'bg-red-50 border-red-400 text-red-800'
                                }`}>
                                <span className="font-bold block mb-1">Explanation</span>
                                {currentQuestion.explanation}
                            </div>
                        )}

                        {/* Nav */}
                        <div className={`flex items-center pt-1 pb-4 ${currentIndex > 0 ? 'justify-between' : 'justify-end'}`}>
                            {currentIndex > 0 && (
                                <button
                                    onClick={() => setCurrentIndex(i => i - 1)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${isDark ? 'border-[#333] text-[#7D7D7D] hover:bg-[#252525] hover:text-white' : 'border-[#E8E5E0] text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'}`}
                                >
                                    <ArrowLeft size={14} /> Previous
                                </button>
                            )}

                            {!isLastQuestion ? (
                                <button
                                    onClick={() => setCurrentIndex(i => i + 1)}
                                    disabled={!hasAnsweredCurrent && !isSubmitted}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${hasAnsweredCurrent || isSubmitted
                                        ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                        : 'opacity-40 cursor-not-allowed ' + (isDark ? 'bg-[#333] text-[#545454]' : 'bg-[#E8E5E0] text-[#9E9E9E]')
                                        }`}
                                >
                                    {isSubmitted ? "Next" : "Save & Next"} <ArrowRight size={14} />
                                </button>
                            ) : !isSubmitted ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!hasAnsweredCurrent || isSubmitting}
                                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${hasAnsweredCurrent
                                        ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                        : 'opacity-40 cursor-not-allowed ' + (isDark ? 'bg-[#333] text-[#545454]' : 'bg-[#E8E5E0] text-[#9E9E9E]')
                                        }`}
                                >
                                    {isSubmitting ? "Saving…" : "Submit Test"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (window.innerWidth >= 768) {
                                            onBack();
                                        } else {
                                            setShowResults(true);
                                        }
                                    }}
                                    className={`px-6 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 ${isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'}`}
                                >
                                    Finish Review
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className={`hidden md:flex flex-col w-60 lg:w-64 shrink-0 border-l ${isDark ? 'border-[#2E2E2E] bg-[#161616]' : 'border-[#7D7D7D]/40 bg-white'}`}>

                    {/* Score / Progress (top) */}
                    <div className={`p-4 border-b ${isDark ? 'border-[#2E2E2E]' : 'border-[#7D7D7D]/40'}`}>
                        {isSubmitted ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2.5">
                                    <Trophy className="w-5 h-5 text-[#7D7D7D] shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D7D7D]">Your Score</p>
                                        <p className={`text-3xl font-black leading-none mt-0.5 ${scoreColor(displayScore)}`}>{displayScore}%</p>
                                    </div>
                                </div>
                                {isSubmitted && (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex gap-1">
                                            <div className={`flex-1 py-1 rounded-lg text-center text-[10px] font-bold ${isDark ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                                {correctCount} Correct
                                            </div>
                                            <div className={`flex-1 py-1 rounded-lg text-center text-[10px] font-bold ${isDark ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {wrongCount} Wrong
                                            </div>
                                        </div>
                                        <div className={`w-full py-1 rounded-lg text-center text-[10px] font-bold ${isDark ? 'bg-[#252525] text-[#7D7D7D] border border-[#333]' : 'bg-[#F0EDE8] text-[#7D7D7D] border border-[#E8E5E0]'}`}>
                                            {skippedCount} Skipped
                                        </div>
                                    </div>
                                )}
                                {/* Time taken */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-[#252525] text-[#7D7D7D]' : 'bg-[#F0EDE8] text-[#545454]'}`}>
                                    <Clock size={12} /> Time taken: <span className="font-mono font-semibold ml-auto">{formatTime(timeTakenRef.current || elapsed)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D7D7D]">Progress</p>
                                    <span className="font-mono text-xs text-[#7D7D7D]">{formatTime(elapsed)}</span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-[#2E2E2E]' : 'bg-[#E8E5E0]'} overflow-hidden`}>
                                    <div className={`h-full rounded-full transition-all ${isDark ? 'bg-white' : 'bg-[#252525]'}`}
                                        style={{ width: `${(answeredCount / totalQs) * 100}%` }} />
                                </div>
                                <p className="text-xs text-[#7D7D7D]">{answeredCount} of {totalQs} answered</p>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className={`px-4 py-2.5 flex flex-wrap gap-x-3 gap-y-1 border-b ${isDark ? 'border-[#2E2E2E]' : 'border-[#7D7D7D]/40'}`}>
                        {isSubmitted ? (
                            <>
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tight text-[#7D7D7D]"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Correct</span>
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tight text-[#7D7D7D]"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Wrong</span>
                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tight text-[#7D7D7D]"><span className="w-2 h-2 rounded-full border border-current opacity-30 inline-block" /> Skipped</span>
                            </>
                        ) : (
                            <>
                                <span className="flex items-center gap-1 text-[10px] text-[#BABABA]"><span className={`w-2.5 h-2.5 rounded-full inline-block ${isDark ? 'bg-white' : 'bg-[#252525]'}`} /> Current</span>
                                <span className="flex items-center gap-1 text-[10px] text-[#7D7D7D]"><span className={`w-2.5 h-2.5 rounded-full inline-block ${isDark ? 'bg-[#3A3A3A]' : 'bg-[#E8E5E0]'}`} /> Answered</span>
                                <span className="flex items-center gap-1 text-[10px] text-[#7D7D7D]"><span className={`w-2.5 h-2.5 rounded-full border inline-block ${isDark ? 'border-[#545454]' : 'border-[#DEDBD6]'}`} /> Not visited</span>
                            </>
                        )}
                    </div>

                    {/* Question grid */}
                    <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7D7D7D] mb-3">
                            {isSubmitted ? "Review Questions" : "Question Panel"}
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrentIndex(i)}
                                    className={`w-full aspect-square rounded-lg text-xs font-bold border transition-all active:scale-95 ${qNumCls(i)}`}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bottom action */}
                    <div className={`p-4 border-t ${isDark ? 'border-[#2E2E2E]' : 'border-[#7D7D7D]/40'}`}>
                        {!isSubmitted && (
                            <button
                                onClick={handleSubmit}
                                disabled={answeredCount < totalQs || isSubmitting}
                                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${answeredCount === totalQs
                                    ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                    : 'opacity-40 cursor-not-allowed ' + (isDark ? 'bg-[#333] text-[#545454]' : 'bg-[#E8E5E0] text-[#9E9E9E]')
                                    }`}
                            >
                                {isSubmitting ? "Saving…" : answeredCount < totalQs ? `${totalQs - answeredCount} left` : "Submit Test"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile bottom strip */}
            <div className={`md:hidden flex items-center gap-2 px-4 py-3 border-t overflow-x-auto scrollbar-hide shrink-0 ${isDark ? 'border-[#2E2E2E] bg-[#161616]' : 'border-[#7D7D7D]/40 bg-white'}`}>
                {questions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 border transition-all ${qNumCls(i)}`}>
                        {i + 1}
                    </button>
                ))}
                <button
                    onClick={isSubmitted ? () => setShowResults(true) : handleSubmit}
                    disabled={!isSubmitted && (answeredCount < totalQs || isSubmitting)}
                    className={`ml-auto shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${isSubmitted || answeredCount === totalQs
                        ? isDark ? 'bg-white text-[#252525]' : 'bg-[#252525] text-white'
                        : 'opacity-40 cursor-not-allowed ' + (isDark ? 'bg-[#333] text-[#545454]' : 'bg-[#E8E5E0] text-[#9E9E9E]')
                        }`}
                >
                    {isSubmitted ? "View Score" : isSubmitting ? "…" : "Submit"}
                </button>
            </div>
        </div>
    );
}
