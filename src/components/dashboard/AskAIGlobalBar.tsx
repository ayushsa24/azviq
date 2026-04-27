"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function AskAIGlobalBar() {
    const [query, setQuery] = useState("");
    const router = useRouter();
    const { theme } = useTheme();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        // Store in sessionStorage so the AI page can read it synchronously
        // on first render, before any effects fire — eliminating the empty page flash.
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('ai_dashboard_query', query.trim());
        }
        router.push(`/ai?q=${encodeURIComponent(query)}`);
    };

    return (
        <div className={`w-full max-w-2xl mx-auto p-1 rounded-2xl shadow-sm transition-all duration-300 ${theme === 'dark'
            ? 'bg-gradient-to-r from-[#545454]/40 via-[#7D7D7D]/20 to-[#545454]/40 border border-[#545454]'
            : 'bg-gradient-to-r from-[#F5F3EF] via-white to-[#F5F3EF] border border-[#E8E5E0]'
            }`}>
            <form onSubmit={handleSearch} className="relative flex items-center">
                <Sparkles className={`absolute left-4 w-5 h-5 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#C2A27A]'
                    }`} />

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask your AI study assistant..."
                    className={`w-full py-4 pl-12 pr-16 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-lg ${theme === 'dark'
                        ? 'bg-[#252525] text-white placeholder-[#7D7D7D] focus:ring-[#7D7D7D]'
                        : 'bg-white text-[#252525] placeholder-[#7D7D7D] focus:ring-[#F0EDE8]'
                        }`}
                />

                <button
                    type="submit"
                    disabled={!query.trim()}
                    className={`absolute right-2 p-2 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 ${theme === 'dark'
                        ? 'bg-[#545454] text-white hover:bg-[#7D7D7D]'
                        : 'bg-[#F0EDE8] text-[#545454] hover:bg-[#E8E5E0] hover:text-[#252525]'
                        }`}
                >
                    <Search className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
