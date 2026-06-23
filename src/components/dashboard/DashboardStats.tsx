"use client";

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, BookOpen, Play, Pause, RotateCcw, X, Target } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSession } from "next-auth/react";
import useSWR from "swr";

export default function DashboardStats() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const [tasksDue, setTasksDue] = useState(0);
    const [revisionsDue, setRevisionsDue] = useState(0);
    const [weakTopics, setWeakTopics] = useState(0);
    const { data: session, status } = useSession();

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
    const { data: pcData } = useSWR('/api/parent-control');
    const { data: dbTimerData } = useSWR(status === "authenticated" && session?.user?.email ? `/api/study/timer?date=${getTodayString()}` : null);

    const isLoadingTasks = tasksLoading && !tasksData;
    const isLoadingSuggestions = suggestionLoading && !suggestionData;

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
                    return dueDate.getTime() === today.getTime();
                }).length;
                setTasksDue(dueTodayCount);
            }

            if (suggestionData?.suggestions) {
                const revisionCard = (suggestionData.suggestions || []).find((s: any) => s.suggestion_type === "spaced_revision");
                const count = revisionCard?.multiple_actions?.filter((act: any) => act.status === 'active').length || 0;
                setRevisionsDue(count);

                const weakCard = (suggestionData.suggestions || []).find((s: any) => s.suggestion_type === "weak_topic");
                const weakCount = weakCard?.multiple_actions?.filter((act: any) => act.status === 'active').length || 0;
                setWeakTopics(weakCount);
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

    // Handle incoming DB timer data from SWR (which revalidates on window focus!)
    useEffect(() => {
        if (!dbTimerData?.timerState) return;
        const dbState = dbTimerData.timerState;
        const today = getTodayString();
        
        try {
            const rawLocal = localStorage.getItem("dashboard_study_data");
            const local = rawLocal ? JSON.parse(rawLocal) : null;
            const isLocallyActive = localStorage.getItem("study_timer_active") === "true";

            // We need to sync and update local storage if:
            // 1. We have no local data for today
            // 2. We are paused locally, and the DB has different data (we always trust DB when paused)
            // 3. We are active locally, but the DB has a higher elapsed time (another device is playing)
            
            const noLocalDataForToday = !local || local.date !== today;
            const pausedAndDifferent = !isLocallyActive && (
                dbState.elapsedSeconds !== (local?.elapsedSeconds || 0) ||
                dbState.targetMinutes !== local?.targetMinutes ||
                dbState.isActive !== isLocallyActive
            );
            const activeButBehind = isLocallyActive && (dbState.elapsedSeconds || 0) > (local?.elapsedSeconds || 0);

            if (noLocalDataForToday || pausedAndDifferent || activeButBehind) {
                const updated = {
                    date: today,
                    elapsedSeconds: dbState.elapsedSeconds || 0,
                    targetMinutes: dbState.targetMinutes || null,
                    lastUpdated: dbState.lastUpdated
                };
                
                setStudyData(updated);
                localStorage.setItem("dashboard_study_data", JSON.stringify(updated));
                localStorage.setItem("study_timer_active", dbState.isActive ? "true" : "false");
                setIsActive(dbState.isActive || false);
                
                // Dispatch events to keep the AppShell tick synchronized
                window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: dbState.isActive } }));
                window.dispatchEvent(new CustomEvent('study-timer-tick', { detail: { studyData: updated, isActive: dbState.isActive } }));
            }
        } catch (e) {
            console.error("Error parsing local timer state", e);
        }
    }, [dbTimerData]);

    // Initial load from local storage (so it doesn't wait for network)
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

    // Sync parent-control daily target hours as a FALLBACK only.
    // This only applies when no manual timer goal has been set for today.
    // It must NEVER overwrite elapsedSeconds — always preserve whatever the DB timer sync loaded.
    useEffect(() => {
        const syncTarget = () => {
            if (pcData?.entries && pcData.entries.length > 0) {
                const dbTargetHours = pcData.entries[0].daily_target_hours;
                const today = getTodayString();
                const targetMins = dbTargetHours !== null && dbTargetHours !== undefined ? dbTargetHours * 60 : null;
                if (targetMins === null) return; // nothing to apply

                setStudyData(prev => {
                    // Only apply parent-control target if no manual target is already set
                    // (meaning the user hasn't set a custom goal or the DB timer sync hasn't
                    // loaded a target yet). NEVER touch elapsedSeconds.
                    if (prev.targetMinutes !== null) return prev; // already has a target — skip

                    // Also read localStorage to get the absolute freshest elapsedSeconds
                    // (AppShell may have written a newer value between renders)
                    let freshElapsed = prev.elapsedSeconds;
                    try {
                        const raw = localStorage.getItem("dashboard_study_data");
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (parsed.date === today) {
                                freshElapsed = parsed.elapsedSeconds || 0;
                                // If localStorage already has a targetMinutes, respect it
                                if (parsed.targetMinutes !== null && parsed.targetMinutes !== undefined) {
                                    return prev; // DB timer sync already wrote a target — skip
                                }
                            }
                        }
                    } catch { /* ignore */ }

                    const updated = { ...prev, date: today, elapsedSeconds: freshElapsed, targetMinutes: targetMins };
                    localStorage.setItem("dashboard_study_data", JSON.stringify(updated));
                    return updated;
                });
                localStorage.setItem("dashboard_study_target_synced_date", today);
            }
        };

        const today = getTodayString();
        const lastSyncedDate = localStorage.getItem("dashboard_study_target_synced_date");

        // Only run on a new day (avoids overwriting user-set goal mid-session)
        if (lastSyncedDate !== today) {
            syncTarget();
        }
    }, [pcData]);

    useEffect(() => {
        setIsActive(localStorage.getItem('study_timer_active') === 'true');

        const handleTick = (e: any) => {
            setStudyData(e.detail.studyData);
            if (!e.detail.isActive && isActive) {
                setIsActive(false);
            }
        };

        const handleState = (e: any) => {
            setIsActive(e.detail.isActive);
        };

        window.addEventListener('study-timer-tick', handleTick);
        window.addEventListener('study-timer-state', handleState);
        return () => {
            window.removeEventListener('study-timer-tick', handleTick);
            window.removeEventListener('study-timer-state', handleState);
        };
    }, [isActive]);

    // Keep goalInput state in sync with studyData.targetMinutes
    useEffect(() => {
        if (studyData.targetMinutes !== null && studyData.targetMinutes !== undefined) {
            const h = Math.floor(studyData.targetMinutes / 60);
            const m = studyData.targetMinutes % 60;
            setGoalInput(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        } else {
            setGoalInput("00:00");
        }
    }, [studyData.targetMinutes]);

    useEffect(() => {
        if (showPicker) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showPicker]);

    const handlePlayClick = async () => {
        if (studyData.targetMinutes === null) {
            if (!goalInput) return;
            const [hours, mins] = goalInput.split(':').map(Number);
            const totalMins = (hours || 0) * 60 + (mins || 0);
            if (totalMins > 0) {
                const newData = { ...studyData, targetMinutes: totalMins, lastUpdated: new Date().toISOString() };
                setStudyData(newData);
                localStorage.setItem("dashboard_study_data", JSON.stringify(newData));
                setIsActive(true);
                localStorage.setItem('study_timer_active', 'true');
                window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: true } }));
                
                try {
                    await fetch("/api/study/timer", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            date: newData.date || getTodayString(),
                            timerState: {
                                elapsedSeconds: newData.elapsedSeconds || 0,
                                targetMinutes: newData.targetMinutes,
                                isActive: true
                            }
                        })
                    });
                } catch (e) {
                    console.error("Failed to sync timer state on play:", e);
                }
            }
        } else {
            const nextActive = !isActive;
            setIsActive(nextActive);
            const newData = { ...studyData, lastUpdated: new Date().toISOString() };
            setStudyData(newData);
            localStorage.setItem("dashboard_study_data", JSON.stringify(newData));
            localStorage.setItem('study_timer_active', nextActive ? 'true' : 'false');
            window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: nextActive } }));
            
            try {
                await fetch("/api/study/timer", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date: newData.date || getTodayString(),
                        timerState: {
                            elapsedSeconds: newData.elapsedSeconds || 0,
                            targetMinutes: newData.targetMinutes,
                            isActive: nextActive
                        }
                    })
                });
            } catch (e) {
                console.error("Failed to sync timer state on pause/play:", e);
            }
        }
    };

    const handleResetGoal = async () => {
        const reset = { date: getTodayString(), elapsedSeconds: 0, targetMinutes: null, lastUpdated: new Date().toISOString() };
        setStudyData(reset);
        setIsActive(false);
        setGoalInput("00:00");
        localStorage.setItem("dashboard_study_data", JSON.stringify(reset));
        localStorage.setItem('study_timer_active', 'false');
        
        // Dispatch events so other components/tabs/AppShell receive the updates
        window.dispatchEvent(new CustomEvent('study-timer-state', { detail: { isActive: false } }));
        window.dispatchEvent(new CustomEvent('study-timer-tick', { detail: { studyData: reset, isActive: false } }));
        
        // Sync reset state to database immediately
        try {
            await fetch("/api/study/timer", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: reset.date,
                    timerState: {
                        elapsedSeconds: 0,
                        targetMinutes: null,
                        isActive: false
                    }
                })
            });
        } catch (e) {
            console.error("Failed to sync timer state on reset:", e);
        }
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Study Time Tracker — Loads instantly as it's local */}
            <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 relative z-20 ${isDark
                ? "hover:bg-white/5 hover:border-[#444]"
                : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"
                } shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md flex flex-col pt-3.5 px-3.5 pb-2.5 min-h-[110px] sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:min-h-[88px] h-full`}>
                <p className="text-xs sm:text-sm font-semibold text-[#545454] dark:text-[#BABABA] sm:hidden mb-1">Daily Study Target</p>
                <div className="hidden sm:block flex-1 sm:pr-2">
                    <p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Daily Study Target</p>
                    <div className="flex items-center mt-1">
                        {studyData.targetMinutes === null ? (
                            <div className="text-[1.65rem] font-bold text-[#252525] dark:text-white cursor-pointer select-none tracking-wider" onClick={openPicker}>
                                {goalInput}
                            </div>
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

            {/* Tasks Due — desktop only */}
            {isLoadingTasks ? (
                <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse hidden sm:block"></div>
            ) : (
                <div className={`hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-all duration-200 min-h-[88px] animate-in fade-in duration-500 ${isDark ? "hover:bg-white/5 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1] shadow-md"}`}>
                    <div><p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Due Today</p><h3 className="text-2xl font-bold text-[#252525] dark:text-white">{tasksDue}</h3></div>
                    <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" /></div>
                </div>
            )}

            {/* Suggestions (Revision Due & Weak Topics) — desktop/laptop only */}
            {isLoadingSuggestions ? (
                <>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse hidden sm:block"></div>
                    <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[88px] animate-pulse hidden lg:block"></div>
                </>
            ) : (
                <>
                    {/* Revision Due — desktop only */}
                    <div className={`hidden sm:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-all duration-200 min-h-[88px] animate-in fade-in duration-500 ${isDark ? "hover:bg-white/5 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1] shadow-md"}`}>
                        <div><p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Revision Due</p><h3 className="text-2xl font-bold text-[#252525] dark:text-white">{revisionsDue}</h3></div>
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center"><BookOpen className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" /></div>
                    </div>

                    {/* Weak Topics — laptop only */}
                    <div className={`hidden lg:flex bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 shadow-sm items-center justify-between transition-all duration-200 min-h-[88px] animate-in fade-in duration-500 ${isDark ? "hover:bg-white/5 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1] shadow-md"}`}>
                        <div><p className="text-sm font-semibold text-[#545454] dark:text-[#BABABA] mb-1">Weak Topics</p><h3 className="text-2xl font-bold text-[#252525] dark:text-white">{weakTopics}</h3></div>
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-[#333] flex items-center justify-center">
                            <Target className="w-5 h-5 text-[#545454] dark:text-[#BABABA]" />
                        </div>
                    </div>
                </>
            )}

            {/* Combined for mobile */}
            {isLoadingTasks || isLoadingSuggestions ? (
                <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-4 h-[110px] animate-pulse sm:hidden"></div>
            ) : (
                <div className={`sm:hidden bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl p-3.5 shadow-sm flex flex-col justify-between transition-all duration-200 min-h-[110px] h-full animate-in fade-in duration-500`}>
                    <p className="text-xs font-semibold text-[#545454] dark:text-[#BABABA] mb-2">Today's Due</p>
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
            )}

            {/* Custom Duration Modal */}
            {showPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPicker(false)}>
                    <div 
                        className="bg-white dark:bg-[#1A1A1A] w-[300px] rounded-3xl p-5 shadow-2xl border border-[#E8E5E0] dark:border-[#333] flex flex-col animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-[#252525] dark:text-white">Study Goal</h3>
                            <button onClick={() => setShowPicker(false)} className="text-[#545454] dark:text-[#BABABA] bg-transparent border-none hover:opacity-70 transition-opacity">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-6 text-xl h-[160px] relative">
                            {/* Selected highlight bar */}
                            <div className="absolute top-[50%] left-0 right-0 h-[40px] -translate-y-1/2 bg-[#F0EDE8] dark:bg-[#333] rounded-xl pointer-events-none -z-10" />
                            
                            <div className="flex flex-col items-center h-full">
                                <span className="text-xs text-[#7D7D7D] dark:text-[#BABABA] mb-1 font-semibold uppercase tracking-wider">Hours</span>
                                <div 
                                    id="picker-hour-scroll" 
                                    className="w-16 flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide relative"
                                    onScroll={(e) => {
                                        const top = e.currentTarget.scrollTop;
                                        const index = Math.round(top / 40);
                                        if (index >= 0 && index < 24 && pickerHours !== index) setPickerHours(index);
                                    }}
                                >
                                    <div className="h-[50px]" />
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div key={`h-${i}`} className={`h-[40px] flex items-center justify-center font-bold text-[22px] snap-center transition-colors ${pickerHours === i ? 'text-[#252525] dark:text-white' : 'text-[#A0A0A0] dark:text-[#545454]'}`}>
                                            {i.toString().padStart(2, '0')}
                                        </div>
                                    ))}
                                    <div className="h-[50px]" />
                                </div>
                            </div>
                            <span className="text-2xl font-bold text-[#545454] dark:text-[#545454] relative z-10 pt-[25px]">:</span>
                            <div className="flex flex-col items-center h-full">
                                <span className="text-xs text-[#7D7D7D] dark:text-[#BABABA] mb-1 font-semibold uppercase tracking-wider">Mins</span>
                                <div 
                                    id="picker-min-scroll" 
                                    className="w-16 flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide relative"
                                    onScroll={(e) => {
                                        const top = e.currentTarget.scrollTop;
                                        const index = Math.round(top / 40);
                                        if (index >= 0 && index < 60 && pickerMins !== index) setPickerMins(index);
                                    }}
                                >
                                    <div className="h-[50px]" />
                                    {Array.from({ length: 60 }).map((_, i) => (
                                        <div key={`m-${i}`} className={`h-[40px] flex items-center justify-center font-bold text-[22px] snap-center transition-colors ${pickerMins === i ? 'text-[#252525] dark:text-white' : 'text-[#A0A0A0] dark:text-[#545454]'}`}>
                                            {i.toString().padStart(2, '0')}
                                        </div>
                                    ))}
                                    <div className="h-[50px]" />
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                const totalMins = (pickerHours || 0) * 60 + (pickerMins || 0);
                                const formatted = `${(pickerHours || 0).toString().padStart(2, '0')}:${(pickerMins || 0).toString().padStart(2, '0')}`;
                                setGoalInput(formatted);
                                
                                const today = getTodayString();
                                const newData = { ...studyData, date: today, targetMinutes: totalMins > 0 ? totalMins : null, lastUpdated: new Date().toISOString() };
                                setStudyData(newData);
                                localStorage.setItem("dashboard_study_data", JSON.stringify(newData));
                                
                                // Dispatch tick event to notify other parts of application
                                window.dispatchEvent(new CustomEvent('study-timer-tick', { detail: { studyData: newData, isActive: isActive } }));
                                
                                // Sync new target state to database immediately
                                try {
                                    await fetch("/api/study/timer", {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            date: today,
                                            timerState: {
                                                elapsedSeconds: newData.elapsedSeconds,
                                                targetMinutes: newData.targetMinutes,
                                                isActive: isActive
                                            }
                                        })
                                    });
                                } catch (e) {
                                    console.error("Failed to sync timer state on set goal:", e);
                                }
                                
                                setShowPicker(false);
                            }}
                            className="mt-6 w-full py-3.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-2xl font-bold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all relative z-10"
                        >
                            Set Goal
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
