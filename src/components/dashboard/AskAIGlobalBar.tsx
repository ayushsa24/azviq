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

        // Redirect to the /ai page, parsing the query string correctly
        router.push(`/ai?q=${encodeURIComponent(query)}`);
    };

    return (
        <div className={`w-full max-w-2xl mx-auto mb-8 p-1 rounded-2xl shadow-sm transition-all duration-300 ${theme === 'dark'
            ? 'bg-gradient-to-r from-[#545454]/40 via-[#7D7D7D]/20 to-[#545454]/40 border border-[#545454]'
            : 'bg-gradient-to-r from-[#EDEAE6] via-white to-[#EDEAE6] border border-[#E8E5E0]'
            }`}>
            <form onSubmit={handleSearch} className="relative flex items-center">
                <Sparkles className={`absolute left-4 w-5 h-5 transition-colors ${theme === 'dark' ? 'text-[#CFCFCF]' : 'text-[#7D7D7D]'
                    }`} />

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask Ascend AI anything..."
                    className={`w-full py-4 pl-12 pr-16 rounded-xl focus:outline-none focus:ring-2 transition-all duration-300 text-lg ${theme === 'dark'
                        ? 'bg-[#252525] text-white placeholder-[#7D7D7D] focus:ring-[#7D7D7D]'
                        : 'bg-white text-[#252525] placeholder-[#7D7D7D] focus:ring-[#CFCFCF]'
                        }`}
                />

                <button
                    type="submit"
                    disabled={!query.trim()}
                    className={`absolute right-2 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                        ? 'bg-[#7D7D7D] text-white hover:bg-[#545454]'
                        : 'bg-[#545454] text-white hover:bg-[#252525]'
                        }`}
                >
                    <Search className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
