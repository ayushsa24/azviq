"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, BookOpen, Play, Pause, RotateCcw, X } from "lucide-react";

export default function DashboardStats() {
    const [tasksDone, setTasksDone] = useState(0);
    const [revisionsDue, setRevisionsDue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Study Time State
    const getTodayString = () => new Date().toISOString().split('T')[0];

    const [studyData, setStudyData] = useState<{ date: string; elapsedSeconds: number; targetMinutes: number | null }>({
        date: getTodayString(),
        elapsedSeconds: 0,
        targetMinutes: null
    });
    const [isActive, setIsActive] = useState(false);
    const [goalInput, setGoalInput] = useState("00:00");
    const [showPicker, setShowPicker] = useState(false);
    const [pickerHours, setPickerHours] = useState(0);
    const [pickerMins, setPickerMins] = useState(0);

    // Load from Local Storage and API
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];

                // Fetch tasks due today (not done)
                const tasksRes = await fetch("/api/tasks", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
                if (tasksRes.ok) {
                    const data = await tasksRes.json();

                    const dueToday = (data.tasks || []).filter((t: any) => {
                        if (t.status === "done") return false;
                        if (!t.due_date) return false;
                        const dueDate = new Date(t.due_date);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate.getTime() <= today.getTime(); // overdue or today
                    }).length;

                    setTasksDone(dueToday);
                }

                // Fetch revisions due for review (created within last 7 days)
                const revRes = await fetch("/api/revision", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
                if (revRes.ok) {
                    const data = await revRes.json();
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    sevenDaysAgo.setHours(0, 0, 0, 0);

                    const dueRevisions = (data.revisions || []).filter((r: any) => {
                        const created = new Date(r.created_at);
                        return created >= sevenDaysAgo;
                    }).length;

                    setRevisionsDue(dueRevisions);
                }
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();

        // Load Study Data
        const savedStudy = localStorage.getItem("dashboard_study_data");
        if (savedStudy) {
            try {
                const parsed = JSON.parse(savedStudy);
                const today = getTodayString();
                if (parsed.date === today) {
                    setStudyData(parsed);
                } else {
                    // New day, reset local storage effectively
                    setStudyData({ date: today, elapsedSeconds: 0, targetMinutes: null });
                }
            } catch (e) { }
        }
    }, []);

    // Timer interval logic
    useEffect(() => {
        let interval: any;
        if (isActive) {
            interval = setInterval(() => {
                setStudyData((prev) => {
                    const nextElapsed = prev.elapsedSeconds + 1;
                    if (prev.targetMinutes !== null && nextElapsed >= prev.targetMinutes * 60) {
                        setIsActive(false); // Auto-pause when goal is reached
                    }
                    const updated = { ...prev, elapsedSeconds: nextElapsed };
                    localStorage.setItem("dashboard_study_data", JSON.stringify(updated));
                    return updated;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Save changes when user manually sets a goal
    useEffect(() => {
        if (studyData.targetMinutes !== null) {
            localStorage.setItem("dashboard_study_data", JSON.stringify(studyData));
        }
    }, [studyData.targetMinutes]);

    const handlePlayClick = () => {
        if (studyData.targetMinutes === null) {
            if (!goalInput) return;
            const [hours, mins] = goalInput.split(':').map(Number);
            const totalMins = (hours || 0) * 60 + (mins || 0);
            if (totalMins > 0) {
                setStudyData(prev => ({ ...prev, targetMinutes: totalMins }));
                setIsActive(true);
            }
        } else {
            setIsActive(!isActive);
        }
    };

    const handleResetGoal = () => {
        setStudyData({ date: getTodayString(), elapsedSeconds: 0, targetMinutes: null });
        setIsActive(false);
        setGoalInput("00:00");
        localStorage.setItem("dashboard_study_data", JSON.stringify({ date: getTodayString(), elapsedSeconds: 0, targetMinutes: null }));
    };

    const openPicker = () => {
        const [h, m] = goalInput.split(':').map(Number);
        const hours = h || 0;
        const mins = m || 0;
        setPickerHours(hours);
        setPickerMins(mins);
        setShowPicker(true);
        // Scroll containers to specific index
        setTimeout(() => {
            const hScroll = document.getElementById('picker-hour-scroll');
            const mScroll = document.getElementById('picker-min-scroll');
            if (hScroll) hScroll.scrollTop = hours * 40;
            if (mScroll) mScroll.scrollTop = mins * 40;
        }, 10);
    };

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) return <>{hours}h {minutes}m <span className="text-[0.65em] font-medium opacity-60 ml-0.5">{secs}s</span></>;
        if (minutes > 0) return <>{minutes}m <span className="text-[0.65em] font-medium opacity-60 ml-0.5">{secs}s</span></>;
        return <>{secs}s</>;
    };

    if (isLoading) {
        return (
            <div className="flex gap-4 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex-1 bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            {/* Study Time Tracker — vertical on mobile, horizontal on desktop */}
            <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-colors relative z-20
                flex flex-col pt-3.5 px-3.5 pb-2.5 min-h-[110px]
                sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:min-h-[88px]">

                {/* Title — top on mobile, left on desktop */}
                <p className="text-xs sm:text-sm font-semibold text-[#545454] dark:text-[#BABABA] sm:hidden mb-1">Study Time Today</p>

                {/* Desktop: Left side (title + time) */}
                <div className="hidden sm:block flex-1 sm:pr-2">
                    <p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Study Time Today</p>
                    <div className="flex items-center mt-1">
                        {studyData.targetMinutes === null ? (
                            <input
                                type="time"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                className="bg-transparent text-[1.65rem] font-bold text-[#252525] dark:text-white border-none outline-none focus:ring-0 p-0 m-0 w-[80px] cursor-pointer [&::-webkit-datetime-edit-ampm-field]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            />
                        ) : (
                            (() => {
                                const remaining = Math.max(0, studyData.targetMinutes! * 60 - studyData.elapsedSeconds);
                                return (
                                    <h3 className={`text-2xl font-bold ${remaining === 0 ? "text-[#545454] dark:text-[#BABABA]" : "text-[#252525] dark:text-white"}`}>
                                        {formatTime(remaining)}
                                    </h3>
                                );
                            })()
                        )}
                    </div>
                </div>

                {/* Mobile: time + play button on same centered row */}
                <div className="flex sm:hidden items-center justify-center gap-3 flex-1">
                    {/* Time */}
                    <div className="flex items-center">
                        {studyData.targetMinutes === null ? (
                            <div
                                className="text-2xl font-bold text-[#252525] dark:text-white cursor-pointer select-none tracking-wider"
                                onClick={openPicker}
                            >
                                {goalInput}
                            </div>
                        ) : (
                            (() => {
                                const remaining = Math.max(0, studyData.targetMinutes! * 60 - studyData.elapsedSeconds);
                                return (
                                    <h3 className={`text-2xl font-bold ${remaining === 0 ? "text-[#545454] dark:text-[#BABABA]" : "text-[#252525] dark:text-white"}`}>
                                        {formatTime(remaining)}
                                    </h3>
                                );
                            })()
                        )}
                    </div>

                    {/* Play/Pause + Reset buttons */}
                    <div className="flex items-center gap-2">
                        {studyData.targetMinutes !== null && (
                            <button
                                onClick={handleResetGoal}
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[#F0EDE8] text-[#7D7D7D] hover:bg-[#E8E5E0] dark:bg-[#333] dark:hover:bg-[#3C3C3C] dark:text-[#BABABA]"
                                title="Reset Timer"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={handlePlayClick}
                            disabled={studyData.targetMinutes === null ? goalInput === "00:00" || goalInput === "" : studyData.elapsedSeconds >= studyData.targetMinutes * 60}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive
                                ? "bg-[#E8E5E0] text-[#252525] hover:bg-[#D1CEC8] dark:bg-[#3C3C3C] dark:hover:bg-[#444] dark:text-[#CFCFCF]"
                                : "bg-[#252525] text-white hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-[#F0EDE8] dark:text-[#252525]"
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={isActive ? "Pause Timer" : "Start Timer"}
                        >
                            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                    </div>
                </div>

                {/* Desktop: Buttons Row — right side */}
                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0">
                    {studyData.targetMinutes !== null && (
                        <button
                            onClick={handleResetGoal}
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[#F0EDE8] text-[#7D7D7D] hover:bg-[#E8E5E0] dark:bg-[#333] dark:hover:bg-[#3C3C3C] dark:text-[#BABABA]"
                            title="Reset Timer"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={handlePlayClick}
                        disabled={studyData.targetMinutes === null ? goalInput === "00:00" || goalInput === "" : studyData.elapsedSeconds >= studyData.targetMinutes * 60}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive
                            ? "bg-[#E8E5E0] text-[#252525] hover:bg-[#D1CEC8] dark:bg-[#3C3C3C] dark:hover:bg-[#444] dark:text-[#CFCFCF]"
                            : "bg-[#252525] text-white hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-[#F0EDE8] dark:text-[#252525]"
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title={isActive ? "Pause Timer" : "Start Timer"}
                    >
                        {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                </div>

                {/* Custom Centered Modal Time Picker for Mobile */}
                {showPicker && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm sm:hidden"
                        onClick={() => setShowPicker(false)}
                    >
                        <div
                            className="w-72 bg-white dark:bg-[#1C1C1E] border border-[#E8E5E0] dark:border-[#38383A] rounded-2xl p-4 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-3">
                                <span className="font-semibold text-sm text-[#252525] dark:text-white">Set Study Duration</span>
                                <button className="text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white p-1 -mr-1 transition-colors" onClick={() => setShowPicker(false)}>
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="relative flex justify-center items-center h-32 bg-transparent mb-3">
                                <div className="absolute top-1/2 left-2 right-2 h-10 -translate-y-1/2 bg-[#F0EDE8] dark:bg-[#2C2C2E] rounded-lg pointer-events-none z-0"></div>
                                <div className="flex w-full z-10 text-[#252525] dark:text-white">
                                    {/* Hours column */}
                                    <div
                                        id="picker-hour-scroll"
                                        className="flex-1 flex flex-col items-center h-32 overflow-y-auto snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                        onScroll={(e) => setPickerHours(Math.max(0, Math.min(23, Math.round(e.currentTarget.scrollTop / 40))))}
                                    >
                                        <div className="h-[44px] shrink-0 w-full" />
                                        {Array.from({ length: 24 }).map((_, i) => (
                                            <div key={`h-${i}`} className={`h-10 w-full shrink-0 flex items-center justify-center snap-center text-lg font-medium transition-colors cursor-pointer select-none ${pickerHours === i ? 'text-[#252525] dark:text-white font-bold' : 'text-[#BABABA] dark:text-[#545454]'}`}>
                                                {i.toString().padStart(2, '0')} <span className="text-xs ml-1 text-gray-400 dark:text-[#8E8E93]">h</span>
                                            </div>
                                        ))}
                                        <div className="h-[44px] shrink-0 w-full" />
                                    </div>
                                    {/* Minutes column */}
                                    <div
                                        id="picker-min-scroll"
                                        className="flex-1 flex flex-col items-center h-32 overflow-y-auto snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                                        onScroll={(e) => setPickerMins(Math.max(0, Math.min(59, Math.round(e.currentTarget.scrollTop / 40))))}
                                    >
                                        <div className="h-[44px] shrink-0 w-full" />
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <div key={`m-${i}`} className={`h-10 w-full shrink-0 flex items-center justify-center snap-center text-lg font-medium transition-colors cursor-pointer select-none ${pickerMins === i ? 'text-[#252525] dark:text-white font-bold' : 'text-[#BABABA] dark:text-[#545454]'}`}>
                                                {i.toString().padStart(2, '0')} <span className="text-xs ml-1 text-gray-400 dark:text-[#8E8E93]">m</span>
                                            </div>
                                        ))}
                                        <div className="h-[44px] shrink-0 w-full" />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setGoalInput(`${pickerHours.toString().padStart(2, '0')}:${pickerMins.toString().padStart(2, '0')}`);
                                    setShowPicker(false);
                                }}
                                className="w-full py-2.5 bg-[#252525] hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-[#F0EDE8] text-white dark:text-[#252525] rounded-xl text-sm font-semibold transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tasks Done — desktop only */}
            <div className="hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-colors min-h-[88px]">
                <div>
                    <p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Tasks Due</p>
                    <h3 className="text-2xl font-bold text-[#252525] dark:text-white">{tasksDone}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" />
                </div>
            </div>

            {/* Revision Due — desktop only */}
            <div className="hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-colors min-h-[88px]">
                <div>
                    <p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Revision Due</p>
                    <h3 className="text-2xl font-bold text-[#252525] dark:text-white">{revisionsDue}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" />
                </div>
            </div>

            {/* Combined Tasks + Revision — mobile only (2nd card) */}
            <div className="sm:hidden bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-3.5 shadow-sm flex flex-col justify-between transition-colors min-h-[88px]">
                <p className="text-xs font-semibold text-[#545454] dark:text-[#BABABA] mb-2">Today&apos;s Due</p>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#3C3C3C] flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-[#545454] dark:text-[#BABABA]" />
                            </div>
                            <span className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Tasks</span>
                        </div>
                        <span className="text-lg font-bold text-[#252525] dark:text-white">{tasksDone}</span>
                    </div>
                    <div className="h-px bg-[#E8E5E0] dark:bg-[#383838]" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#3C3C3C] flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-3 h-3 text-[#545454] dark:text-[#BABABA]" />
                            </div>
                            <span className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Revision</span>
                        </div>
                        <span className="text-lg font-bold text-[#252525] dark:text-white">{revisionsDue}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
