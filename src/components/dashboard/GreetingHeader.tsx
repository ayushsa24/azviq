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
    const [greeting, setGreeting] = useState("Hello");
    const [quote, setQuote] = useState(MOTIVATION_QUOTES[0]);
    const [dateStr, setDateStr] = useState("");

    useEffect(() => {
        // Set greeting based on local time
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");

        // Set today's date formatted as "Tuesday • 18 March"
        setDateStr(format(new Date(), "EEEE • d MMMM"));

        // Pick a random quote daily
        const dayOfYear = Math.floor(
            (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
        );
        setQuote(MOTIVATION_QUOTES[dayOfYear % MOTIVATION_QUOTES.length]);
    }, []);

    return (
        <div className="flex flex-col mb-3 px-2">
            <div className="flex items-center gap-3">
                {children}
                <h1 className="text-3xl font-extrabold text-[#252525] dark:text-white tracking-tight transition-colors">
                    {greeting}, {userName} <span className="animate-wave inline-block origin-[70%_70%]">!</span>
                </h1>
            </div>
            <p className="text-[#545454] dark:text-[#BABABA] mt-1.5 font-medium transition-colors">
                {quote}
            </p>
            <p className="text-[#545454] dark:text-[#888888] mt-1 text-sm font-semibold transition-colors">
                {dateStr}
            </p>
        </div>
    );
}
