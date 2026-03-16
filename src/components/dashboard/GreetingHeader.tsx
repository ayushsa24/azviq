"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

const MOTIVATION_QUOTES = [
    "Small steps every day lead to big results.",
    "Focus on the step in front of you, not the whole staircase.",
    "You don't have to be perfect, just be persistent.",
    "Discipline is choosing between what you want now and what you want most.",
    "Progress, not perfection.",
    "Believe you can and you're halfway there.",
    "Your only limit is your mind.",
    "Make today count.",
    "Do something today that your future self will thank you for.",
    "Success is the sum of small efforts repeated day in and day out."
];

export default function GreetingHeader({ userName, children }: { userName: string, children?: React.ReactNode }) {
    const [greeting] = useState(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    });

    const [quote] = useState(() => {
        const dayOfYear = Math.floor(
            (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        return MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length];
    });

    const [dateStr] = useState(() => format(new Date(), "EEEE • d MMMM"));

    useEffect(() => {
        // This is now purely for client-only updates if needed, 
        // but since we compute above, it's stable on hydration for the specific user's session.
    }, []);

    return (
        <div className="flex flex-col mb-1 px-2">
            <div className="flex items-center gap-3">
                {children}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] dark:text-white tracking-tight transition-colors">
                    {greeting}, {userName} <span className="animate-wave inline-block origin-[70%_70%]">!</span>
                </h1>
            </div>
            <p className="text-[#545454] dark:text-[#BABABA] mt-0.5 sm:mt-1.5 font-medium transition-colors text-sm sm:text-base">
                {quote}
            </p>
            <p className="text-[#545454] dark:text-[#888888] mt-1 text-sm font-semibold transition-colors">
                {dateStr}
            </p>
        </div>
    );
}
