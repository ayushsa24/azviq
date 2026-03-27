"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, BookOpen, Play, Pause, RotateCcw, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import useSWR from "swr";

export default function DashboardStats() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [tasksDue, setTasksDue] = useState(0);
    const [revisionsDue, setRevisionsDue] = useState(0);

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

    const { data: tasksData, isLoading: tasksLoading, mutate: mutateTasks } = useSWR('/api/tasks');
    const { data: suggestionData, isLoading: suggestionLoading, mutate: mutateSuggestions } = useSWR('/api/suggestions');

    const isLoading = (tasksLoading && !tasksData) || (suggestionLoading && !suggestionData);

    useEffect(() => {
        const calculateStats = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (tasksData?.tasks) {
                const dueTodayCount = (tasksData.tasks || []).filter((t: any) => {
                    if (t.status === "done" || t.status === "archived") return false;
                    if (!t.due_date) return false;
                    const dueDate = new Date(t.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() <= today.getTime();
                }).length;
                setTasksDue(dueTodayCount);
            }

            if (suggestionData?.suggestions) {
                const revisionCard = (suggestionData.suggestions || []).find((s: any) => s.suggestion_type === "spaced_revision");
                const count = revisionCard?.multiple_actions?.filter((act: any) => act.status === 'active').length || 0;
                setRevisionsDue(count);
            }
        };

        calculateStats();

        const handleUpdate = () => {
            mutateTasks();
            mutateSuggestions();
        };

        window.addEventListener("task-updated", handleUpdate);
        window.addEventListener("suggestion-updated", handleUpdate);
        return () => {
            window.removeEventListener("task-updated", handleUpdate);
            window.removeEventListener("suggestion-updated", handleUpdate);
        };
    }, [tasksData, suggestionData, mutateTasks, mutateSuggestions]);

    useEffect(() => {
        const savedStudy = localStorage.getItem("dashboard_study_data");
        if (savedStudy) {
            try {
                const parsed = JSON.parse(savedStudy);
                const today = getTodayString();
                if (parsed.date === today) {
                    setStudyData(parsed);
                } else {
                    setStudyData({ date: today, elapsedSeconds: 0, targetMinutes: null });
                }
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        let interval: any;
        if (isActive) {
            interval = setInterval(() => {
                setStudyData((prev) => {
                    const nextElapsed = prev.elapsedSeconds + 1;
                    if (prev.targetMinutes !== null && nextElapsed >= prev.targetMinutes * 60) {
                        setIsActive(false);
                    }
                    const updated = { ...prev, elapsedSeconds: nextElapsed };
                    localStorage.setItem("dashboard_study_data", JSON.stringify(updated));
                    return updated;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive]);

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
        setPickerHours(h || 0);
        setPickerMins(m || 0);
        setShowPicker(true);
        setTimeout(() => {
            const hScroll = document.getElementById('picker-hour-scroll');
            const mScroll = document.getElementById('picker-min-scroll');
            if (hScroll) hScroll.scrollTop = (h || 0) * 40;
            if (mScroll) mScroll.scrollTop = (m || 0) * 40;
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

    const scrollToSuggestions = () => {
        const element = document.getElementById('ai-suggestions-section');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Study Time Tracker — Loads instantly as it's local */}
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 relative z-20 ${isDark
                ? "hover:bg-white/10 hover:border-[#444]"
                : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"
                } shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md flex flex-col pt-3.5 px-3.5 pb-2.5 min-h-[110px] sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:min-h-[88px]`}>
                <p className="text-xs sm:text-sm font-semibold text-[#545454] dark:text-[#BABABA] sm:hidden mb-1">Study Time Today</p>
                <div className="hidden sm:block flex-1 sm:pr-2">
                    <p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Study Time Today</p>
                    <div className="flex items-center mt-1">
                        {studyData.targetMinutes === null ? (
                            <input
                                type="time"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                className="bg-transparent text-[1.65rem] font-bold text-[#252525] dark:text-white border-none outline-none focus:ring-0 p-0 m-0 w-[80px] cursor-pointer relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                        ) : (
                            <h3 className={`text-2xl font-bold ${Math.max(0, studyData.targetMinutes * 60 - studyData.elapsedSeconds) === 0 ? "text-[#545454] dark:text-[#BABABA]" : "text-[#252525] dark:text-white"}`}>
                                {formatTime(Math.max(0, studyData.targetMinutes * 60 - studyData.elapsedSeconds))}
                            </h3>
                        )}
                    </div>
                </div>
                <div className="flex sm:hidden items-center justify-center gap-3 flex-1">
                    <div className="flex items-center">
                        {studyData.targetMinutes === null ? (
                            <div className="text-2xl font-bold text-[#252525] dark:text-white cursor-pointer select-none tracking-wider" onClick={openPicker}>
                                {goalInput}
                            </div>
                        ) : (
                            <h3 className={`text-2xl font-bold ${Math.max(0, studyData.targetMinutes * 60 - studyData.elapsedSeconds) === 0 ? "text-[#545454] dark:text-[#BABABA]" : "text-[#252525] dark:text-white"}`}>
                                {formatTime(Math.max(0, studyData.targetMinutes * 60 - studyData.elapsedSeconds))}
                            </h3>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {studyData.targetMinutes !== null && (
                            <button onClick={handleResetGoal} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[#F0EDE8] text-[#7D7D7D] hover:bg-[#E8E5E0] dark:bg-[#333] dark:hover:bg-[#3C3C3C] dark:text-[#BABABA]">
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <button onClick={handlePlayClick} disabled={studyData.targetMinutes === null ? goalInput === "00:00" : studyData.elapsedSeconds >= studyData.targetMinutes * 60} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? "bg-[#E8E5E0] text-[#252525] dark:bg-[#3C3C3C] dark:text-[#CFCFCF]" : "bg-[#252525] text-white dark:bg-white dark:text-[#252525]"} disabled:opacity-40`}>
                            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>
                    </div>
                </div>
                <div className="hidden sm:flex items-center justify-end gap-2 shrink-0">
                    {studyData.targetMinutes !== null && (
                        <button onClick={handleResetGoal} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-[#F0EDE8] text-[#7D7D7D] hover:bg-[#E8E5E0] dark:bg-[#333] dark:hover:bg-[#3C3C3C] dark:text-[#BABABA]">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={handlePlayClick} disabled={studyData.targetMinutes === null ? goalInput === "00:00" : studyData.elapsedSeconds >= studyData.targetMinutes * 60} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? "bg-[#E8E5E0] text-[#252525] dark:bg-[#3C3C3C] dark:text-[#CFCFCF]" : "bg-[#252525] text-white dark:bg-white dark:text-[#252525]"} disabled:opacity-40`}>
                        {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                </div>
            </div>

            {/* Dashboard Stats — show loading or real data */}
            {isLoading ? (
                <>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse hidden sm:block"></div>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse"></div>
                </>
            ) : (
                <>
                    {/* Tasks Done — desktop only */}
                    <div className={`hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-all duration-200 min-h-[88px] ${isDark ? "hover:bg-white/10" : "hover:bg-[#F9F8F6] shadow-md"}`}>
                        <div><p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Tasks Due</p><h3 className="text-2xl font-bold text-[#252525] dark:text-white">{tasksDue}</h3></div>
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" /></div>
                    </div>

                    {/* Revision Due — desktop only */}
                    <div className={`hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-all duration-200 min-h-[88px] ${isDark ? "hover:bg-white/10" : "hover:bg-[#F9F8F6] shadow-md"}`}>
                        <div><p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Revision Due</p><h3 className="text-2xl font-bold text-[#252525] dark:text-white">{revisionsDue}</h3></div>
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center"><BookOpen className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" /></div>
                    </div>

                    {/* Combined for mobile */}
                    <div className={`sm:hidden bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-200 min-h-[88px]`}>
                        <p className="text-xs font-semibold text-[#545454] dark:text-[#BABABA] mb-2">Today&apos;s Due</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#3C3C3C] flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-[#545454] dark:text-[#BABABA]" /></div><span className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Tasks</span></div>
                                <span className="text-lg font-bold text-[#252525] dark:text-white">{tasksDue}</span>
                            </div>
                            <div className="h-px bg-[#E8E5E0] dark:bg-[#383838]" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-[#E8E5E0] dark:bg-[#3C3C3C] flex items-center justify-center"><BookOpen className="w-3 h-3 text-[#545454] dark:text-[#BABABA]" /></div><span className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Revision</span></div>
                                <span className="text-lg font-bold text-[#252525] dark:text-white">{revisionsDue}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
