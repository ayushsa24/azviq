"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Calendar, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, isSameDay, subDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DailySummary {
    id: string;
    user_id: string;
    study_date: string;
    total_minutes: number;
    activity_count: number;
    activities_summary: Record<string, number>;
}

const ACTIVITY_LABELS: Record<string, string> = {
    note: "Notes",
    pdf: "PDFs",
    exercise: "Exercises",
    revision: "Revision",
    ai_teacher: "Chat AI",
    personal_ai: "AI Teacher"
};

const formatTime = (totalMinutes: number) => {
    if (!totalMinutes) return "0m";
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};

export default function StudyConsistency() {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const { data: summariesData, isLoading: summariesLoading } = useSWR(`/api/study/summary?year=${selectedYear}`, fetcher);
    const summaries = (summariesData?.summaries || []) as DailySummary[];
    const isLoading = summariesLoading;
    const [hoveredDay, setHoveredDay] = useState<{ date: Date, summary?: DailySummary, x: number, y: number } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const years = [currentYear];

    // Generate grid data
    const { days, stats, weeks } = useMemo(() => {
        const start = startOfYear(new Date(selectedYear, 0, 1));
        const end = endOfYear(new Date(selectedYear, 11, 31));

        // Ensure we stop at today if viewing current year
        const endToRender = selectedYear === currentYear && end > new Date() ? startOfDay(new Date()) : end;

        const allDays = eachDayOfInterval({ start, end });

        let totalDaysWithStudy = 0;
        let totalMinutes = 0;
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;

        // For accurate streak we need yesterday and today logic
        const targetDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

        const dayMap = new Map<string, DailySummary>();
        summaries.forEach(s => dayMap.set(s.study_date, s));

        // Calculate streaks (only makes sense if we have all historical data, but we'll do an approximation for the loaded year)
        // A real robust streak would be calculated backend, but doing frontend for now.

        // Iterate backwards from today to find current streak
        const getLocalDateStr = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const todayLocalStr = getLocalDateStr(new Date());
        const yesterdayLocalStr = getLocalDateStr(subDays(new Date(), 1));

        if ((dayMap.get(todayLocalStr)?.total_minutes || 0) > 0 || (dayMap.get(yesterdayLocalStr)?.total_minutes || 0) > 0) {
            let d = (dayMap.get(todayLocalStr)?.total_minutes || 0) > 0 ? new Date() : subDays(new Date(), 1);
            while ((dayMap.get(getLocalDateStr(d))?.total_minutes || 0) > 0) {
                currentStreak++;
                d = subDays(d, 1);
                // Break if we left the current year (simplification)
                if (d.getFullYear() < selectedYear) break;
            }
        }

        const daysWithData = allDays.map(date => {
            const dateStr = getLocalDateStr(date);
            const summary = dayMap.get(dateStr);

            if (summary && summary.total_minutes > 0) {
                totalDaysWithStudy++;
                totalMinutes += summary.total_minutes;
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }

            return {
                date,
                dateStr,
                summary
            };
        });

        // Group into weeks for rendering (0 = Sunday, 1 = Monday, etc)
        const weeksArray: (typeof daysWithData[0] | null)[][] = [];
        let currentWeek: (typeof daysWithData[0] | null)[] = Array(7).fill(null);

        daysWithData.forEach(day => {
            const dayOfWeek = getDay(day.date);
            currentWeek[dayOfWeek] = day;

            if (dayOfWeek === 6) {
                weeksArray.push([...currentWeek]);
                currentWeek = Array(7).fill(null);
            }
        });

        if (currentWeek.some(d => d !== null)) {
            weeksArray.push(currentWeek);
        }

        return {
            days: daysWithData,
            weeks: weeksArray,
            stats: {
                totalDaysWithStudy,
                totalHours: Math.round((totalMinutes / 60) * 10) / 10,
                longestStreak,
                currentStreak
            }
        };
    }, [selectedYear, summaries, currentYear]);

    const getColorClass = (minutes: number | undefined) => {
        if (!minutes || minutes === 0) return "bg-[#CFCFCF] dark:bg-[#383838]";
        if (minutes <= 30) return "bg-[#7D7D7D] dark:bg-[#545454]";
        if (minutes <= 90) return "bg-[#545454] dark:bg-[#9E9E9E]";
        return "bg-[#252525] dark:bg-white";
    };

    const handleMouseEnter = (day: any, e: React.MouseEvent) => {
        if (!day) return;
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const cardContainer = target.closest('.rounded-3xl');

        let x = rect.left + rect.width / 2;
        let y = rect.top - 10;

        // Adjust for relative positioning inside the card with backdrop filter
        if (cardContainer) {
            const containerRect = cardContainer.getBoundingClientRect();
            x = rect.left - containerRect.left + (rect.width / 2);
            y = rect.top - containerRect.top - 10;
        }

        setHoveredDay({
            date: day.date,
            summary: day.summary,
            x: x,
            y: y
        });
    };

    const handleMouseLeave = () => {
        setHoveredDay(null);
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Simplistic month label layout (just scattering them roughly)
    const renderMonthLabels = () => {
        // Find the week index where each month starts roughly
        const labels: { month: string, index: number }[] = [];
        let currentMonth = -1;

        weeks.forEach((week, i) => {
            const firstValidDay = week.find(d => d !== null);
            if (firstValidDay && firstValidDay.date.getMonth() !== currentMonth) {
                currentMonth = firstValidDay.date.getMonth();
                labels.push({ month: months[currentMonth], index: i });
            }
        });

        return (
            <div className="flex text-[10px] sm:text-xs text-[#7D7D7D] dark:text-[#BABABA] mb-1 pl-6">
                {labels.map((l, i) => (
                    <React.Fragment key={`${l.month}-${i}`}>
                        {/* Desktop label (13px + 2px gap = 15px spacing) */}
                        <div
                            className="absolute hidden sm:block"
                            style={{ left: `calc(1.5rem + ${l.index * 15}px)` }}
                        >
                            {l.month}
                        </div>
                        {/* Mobile label (11px + 2px gap = 13px spacing) */}
                        <div
                            className="absolute sm:hidden"
                            style={{ left: `calc(1.5rem + ${l.index * 13}px)` }}
                        >
                            {l.month}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        );
    };

    return (
        <div className={`bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-3xl shadow-sm transition-all duration-200 relative z-[40] group/card mb-4 md:mb-0
            ${isDark ? "hover:bg-white/5 hover:border-[#444]" : "hover:bg-[#F9F8F6] hover:border-[#D1D1D1]"}
            shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md
        `}>
            {/* Header - Standardized */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-2 border-b border-[#E8E5E0] dark:border-[#383838] mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#252525] dark:text-white" />
                    <h3 className="font-bold text-lg text-[#252525] dark:text-white">
                        Study Consistency
                    </h3>
                </div>

                <div className="relative shrink-0">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="appearance-none bg-[#F0EDE8] dark:bg-[#383838] hover:bg-[#E8E5E0] dark:hover:bg-[#444] text-xs font-semibold text-[#252525] dark:text-[#CFCFCF] pl-3 pr-7 py-1.5 rounded-full border-none focus:ring-1 focus:ring-[#C2A27A]/30 cursor-pointer transition-colors outline-none shadow-sm"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7D7D7D] pointer-events-none" />
                </div>
            </div>

            <div className="px-4 sm:px-6 pb-4 sm:pb-6">

            {isLoading ? (
                <div className="flex flex-col animate-pulse">
                    <div className="relative overflow-x-auto pb-4 custom-scrollbar w-fit mx-auto max-w-full">
                        <div className="flex gap-[2px] min-w-max pl-6 relative opacity-20">
                            <div className="absolute left-0 top-0 flex flex-col gap-[2px] text-[9px] sm:text-[10px] text-[#7D7D7D] dark:text-[#BABABA] leading-[11px] sm:leading-[13px]">
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Mon</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Wed</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Fri</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                            </div>
                            {Array.from({ length: 52 }).map((_, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[2px]">
                                    {Array.from({ length: 7 }).map((_, dayIdx) => (
                                        <div key={dayIdx} className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[2px] bg-[#252525]/10 dark:bg-white/10" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Stats Skeleton */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E8E5E0] dark:border-[#545454] opacity-40">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-3 bg-[#545454] dark:bg-[#7D7D7D] rounded"></div>
                            <div className="flex gap-[2px]">
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#CFCFCF] dark:bg-[#383838]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#7D7D7D] dark:bg-[#545454]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#545454] dark:bg-[#9E9E9E]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#252525] dark:bg-white"></div>
                            </div>
                            <div className="w-8 h-3 bg-[#545454] dark:bg-[#7D7D7D] rounded"></div>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 sm:gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="w-16 h-2.5 bg-[#545454] dark:bg-[#7D7D7D] rounded"></div>
                                    <div className="w-10 h-4 bg-[#252525] dark:bg-white rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col">
                    {/* Heatmap Grid */}
                    <div className="relative overflow-x-auto pb-4 custom-scrollbar w-fit mx-auto max-w-full" ref={containerRef}>
                        <div className="min-w-max relative h-4 pb-2">
                            {renderMonthLabels()}
                        </div>
                        <div className="flex gap-[2px] min-w-max pl-6 relative">
                            {/* Day labels (Mon, Wed, Fri) */}
                            <div className="absolute left-0 top-0 flex flex-col gap-[2px] text-[9px] sm:text-[10px] text-[#7D7D7D] dark:text-[#BABABA] leading-[11px] sm:leading-[13px]">
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Mon</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Wed</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                                <div className="h-[11px] sm:h-[13px]">Fri</div>
                                <div className="h-[11px] sm:h-[13px]"></div>
                            </div>

                            {weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="flex flex-col gap-[2px]">
                                    {week.map((day, dayIdx) => (
                                        <div
                                            key={day ? day.dateStr : `empty-${weekIdx}-${dayIdx}`}
                                            onMouseEnter={(e) => handleMouseEnter(day, e)}
                                            onMouseLeave={handleMouseLeave}
                                            className={`w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[2px] transition-all cursor-pointer hover:border hover:border-[#252525] dark:hover:border-white ${day ? getColorClass(day.summary?.total_minutes) : "bg-transparent"
                                                }`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats and Legend */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#E8E5E0] dark:border-[#545454]">
                        <div className="flex items-center gap-2 text-xs text-[#545454] dark:text-[#BABABA]">
                            <span>Less</span>
                            <div className="flex gap-[2px]">
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#CFCFCF] dark:bg-[#383838]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#7D7D7D] dark:bg-[#545454]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#545454] dark:bg-[#9E9E9E]"></div>
                                <div className="w-[11px] h-[11px] rounded-[2px] bg-[#252525] dark:bg-white"></div>
                            </div>
                            <span>More</span>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-4 sm:gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-[#7D7D7D] dark:text-[#BABABA] tracking-wider">Study Days</span>
                                <span className="text-sm font-semibold text-[#252525] dark:text-white">{stats.totalDaysWithStudy} days</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-[#7D7D7D] dark:text-[#BABABA] tracking-wider">Total Time</span>
                                <span className="text-sm font-semibold text-[#252525] dark:text-white">{stats.totalHours} hrs</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-[#7D7D7D] dark:text-[#BABABA] tracking-wider">Current Streak</span>
                                <span className="text-sm font-semibold text-[#252525] dark:text-white">{stats.currentStreak} days</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-[#7D7D7D] dark:text-[#BABABA] tracking-wider">Longest Streak</span>
                                <span className="text-sm font-semibold text-[#252525] dark:text-white">{stats.longestStreak} days</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Tooltip */}
            {hoveredDay && (
                <div
                    ref={tooltipRef}
                    className="absolute z-[100] bg-[#252525] dark:bg-[#1A1A1A] text-white pointer-events-none rounded-xl p-3 shadow-xl border border-[#545454] transform -translate-x-1/2 -translate-y-full min-w-[180px]"
                    style={{ left: hoveredDay.x, top: hoveredDay.y }}
                >
                    <div className="font-semibold text-sm mb-1">{format(hoveredDay.date, 'MMM d, yyyy')}</div>
                    <div className="text-xs text-[#CFCFCF] mb-2">{formatTime(hoveredDay.summary?.total_minutes || 0)} studied</div>

                    {hoveredDay.summary?.activities_summary && Object.keys(hoveredDay.summary.activities_summary).filter(k => !k.startsWith("__")).length > 0 ? (
                        <div className="space-y-1 mt-2 pt-2 border-t border-[#545454]">
                            {Object.entries(hoveredDay.summary.activities_summary)
                                .filter(([key]) => !key.startsWith("__"))
                                .map(([key, count]) => (
                                    <div key={key} className="flex justify-between items-center text-[11px]">
                                        <span className="text-[#CFCFCF]">{ACTIVITY_LABELS[key] || key}</span>
                                        <span className="font-bold">{formatTime(count as number)}</span>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="mt-2 pt-2 border-t border-[#545454] text-[11px] text-[#7D7D7D] font-medium">
                            {isSameDay(hoveredDay.date, new Date()) || hoveredDay.date > new Date()
                                ? "Let's make consistency! Start studying today."
                                : "No activities recorded"
                            }
                        </div>
                    )}

                    {/* Tooltip Chevron */}
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#252525] dark:border-t-[#1A1A1A]"></div>
                </div>
            )}
            </div>
        </div>
    );
}
