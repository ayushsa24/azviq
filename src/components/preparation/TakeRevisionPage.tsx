"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
    ArrowLeft, BookOpen, Key, HelpCircle, ChevronDown, ChevronUp,
    ArrowRight, Eye, EyeOff, FileText, Clock, PanelLeft, X
} from "lucide-react";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSidebar } from "@/contexts/SidebarContext";

interface Keyword { term: string; definition: string; }
interface QAPair { question: string; answer: string; }
interface Revision {
    id: string;
    title: string;
    summary: string;
    keywords: Keyword[];
    qa_pairs: QAPair[];
    created_at: string;
    notes?: { title: string };
}
interface TakeRevisionPageProps {
    revision: Revision;
    onBack: () => void;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderInline(text: string, isDark: boolean) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) =>
        part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className={isDark ? "text-white font-semibold" : "text-[#252525] font-semibold"}>{part.slice(2, -2)}</strong>
            : <React.Fragment key={j}>{part}</React.Fragment>
    );
}

function SummaryRenderer({ text, isDark }: { text: string; isDark: boolean }) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let tableRows: string[][] = [];
    let tableHeader: string[] | null = null;
    let i = 0;

    const flushTable = () => {
        if (!tableHeader && tableRows.length === 0) return;
        const header = tableHeader!;
        const rows = tableRows;
        elements.push(
            <div key={`table-${i}`} className="overflow-x-auto mt-1 mb-1 rounded-xl border border-[#7D7D7D]/40 dark:border-[#2E2E2E]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className={isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}>
                            {header.map((h, hi) => (
                                <th key={hi} className={`px-3 py-2 text-left font-semibold border-b ${isDark ? "border-[#333] text-white" : "border-[#7D7D7D]/40 text-[#252525]"}`}>
                                    {renderInline(h.trim(), isDark)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? (isDark ? "bg-[#1A1A1A]" : "bg-white") : (isDark ? "bg-[#1E1E1E]" : "bg-[#F9F8F6]")}>
                                {r.map((cell, ci) => (
                                    <td key={ci} className={`px-3 py-2 ${isDark ? "text-[#BABABA]" : "text-[#3A3A3A]"} border-b ${isDark ? "border-[#2E2E2E]" : "border-[#F0EDE8]"}`}>
                                        {renderInline(cell.trim(), isDark)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
        tableHeader = null;
        tableRows = [];
    };

    while (i < lines.length) {
        const line = lines[i];

        // Markdown table row
        if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
            const cells = line.trim().slice(1, -1).split("|");
            // Separator row: skip it but it means previous row was header
            if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
                // The previous 'row' was actually the header
                if (tableRows.length > 0) {
                    tableHeader = tableRows.pop()!;
                }
                i++; continue;
            }
            tableRows.push(cells);
            i++; continue;
        }

        // Flush table if we're not in one anymore
        if ((tableHeader || tableRows.length) && !line.trim().startsWith("|")) {
            flushTable();
        }

        if (line.startsWith("## ")) {
            elements.push(<h2 key={i} className={`text-lg font-extrabold mt-5 first:mt-0 pb-1 border-b ${isDark ? "text-white border-[#2E2E2E]" : "text-[#161514] border-[#7D7D7D]/40"}`}>{line.replace(/^## /, "")}</h2>);
        } else if (line.startsWith("### ")) {
            elements.push(<h3 key={i} className={`text-sm font-bold mt-3 ${isDark ? "text-white" : "text-[#252525]"}`}>{line.replace(/^### /, "")}</h3>);
        } else if (line.trimStart().startsWith("- ") || line.trimStart().startsWith("• ")) {
            const content = line.trimStart().replace(/^[-•]\s+/, "");
            elements.push(
                <div key={i} className="flex items-start gap-2">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? "bg-[#BABABA]" : "bg-[#E8E5E0]"}`} />
                    <p className={`text-sm leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#3A3A3A]"}`}>{renderInline(content, isDark)}</p>
                </div>
            );
        } else if (line.trim() === "") {
            elements.push(<div key={i} className="h-2" />);
        } else {
            elements.push(<p key={i} className={`text-sm leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#3A3A3A]"}`}>{renderInline(line, isDark)}</p>);
        }
        i++;
    }

    flushTable();

    return <div className="flex flex-col gap-1.5">{elements}</div>;
}

export default function TakeRevisionPage({ revision, onBack }: TakeRevisionPageProps) {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const { open: sidebarOpen, toggle: toggleSidebar } = useSidebar();

    useStudyTracker({ activityType: 'revision', isEnabled: true, subject: "Revision", topic: revision?.title || "Untitled Revision" });

    const [activeTab, setActiveTab] = useState<"summary" | "keywords" | "qa">("summary");
    const [expandedKw, setExpandedKw] = useState<number | null>(null);
    const [qaIndex, setQaIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);

    const qa = revision.qa_pairs || [];
    const kw = revision.keywords || [];
    const currentQA = qa[qaIndex];

    const tabCls = (t: string) =>
        `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === t
            ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
            : "border-transparent text-[#545454] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white"
        }`;

    return (
        <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] overflow-hidden">

            {/* Top bar */}
            <div className={`flex items-center gap-1.5 sm:gap-3 px-4 sm:px-6 pt-2 sm:pt-2.5 pb-2.5 border-b shrink-0 ${isDark ? "border-[#333] bg-[#1A1A1A]" : "border-[#E8E5E0] bg-[#F5F3EF]"}`}>
                {!sidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className={`hidden md:flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 ${isDark ? 'text-[#7D7D7D] hover:bg-[#545454] hover:text-white' : 'text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'}`}
                        title="Open Sidebar"
                    >
                        <PanelLeft size={18} />
                    </button>
                )}
                <button
                    onClick={onBack}
                    title="Back"
                    className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 shrink-0 ${isDark ? 'text-[#7D7D7D] hover:bg-[#545454] hover:text-white' : 'text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525]'}`}
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-[#252525] dark:text-white truncate">{revision.title}</p>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8E5E0] dark:bg-[#333] shrink-0">
                        <Clock size={11} className="text-[#7D7D7D]" />
                        <span className="text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] uppercase tracking-wider">
                            {formatDate(revision.created_at)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className={`flex border-b shrink-0 px-4 sm:px-6 ${isDark ? "border-[#333] bg-[#1A1A1A]" : "border-[#E8E5E0] bg-[#F5F3EF]"}`}>
                <button className={tabCls("summary")} onClick={() => setActiveTab("summary")}>
                    <span className="flex items-center gap-1.5"><BookOpen size={13} /> Summary</span>
                </button>
                <button className={tabCls("keywords")} onClick={() => setActiveTab("keywords")}>
                    <span className="flex items-center gap-1.5"><Key size={13} /> Keywords <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${isDark ? "bg-white/10 text-[#BABABA]" : "bg-[#F0EDE8] text-[#545454]"}`}>{kw.length}</span></span>
                </button>
                <button className={tabCls("qa")} onClick={() => { setActiveTab("qa"); setQaIndex(0); setShowAnswer(false); }}>
                    <span className="flex items-center gap-1.5"><HelpCircle size={13} /> Q&amp;A <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1 ${isDark ? "bg-white/10 text-[#BABABA]" : "bg-[#F0EDE8] text-[#545454]"}`}>{qa.length}</span></span>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">

                {/* SUMMARY TAB */}
                {activeTab === "summary" && (
                    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6">
                        <div className={`p-5 sm:p-6 rounded-2xl border transition-colors ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white/80 backdrop-blur-md border-[#7D7D7D]/40 shadow-sm"}`}>
                            <h2 className={`text-xs font-bold uppercase tracking-widest mb-5 ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>Revision Summary</h2>
                            <SummaryRenderer text={revision.summary || "No summary available."} isDark={isDark} />
                        </div>
                    </div>
                )}

                {/* KEYWORDS TAB */}
                {activeTab === "keywords" && (
                    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 flex flex-col gap-2">
                        <p className="text-[11px] text-[#7D7D7D] dark:text-[#BABABA] mb-1">Click a keyword to expand its definition.</p>
                        {kw.length === 0 && (
                            <p className="text-sm text-[#7D7D7D] text-center py-12">No keywords found.</p>
                        )}
                        {kw.map((k, i) => (
                            <button
                                key={i}
                                onClick={() => setExpandedKw(expandedKw === i ? null : i)}
                                className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${isDark
                                    ? "bg-[#252525] border-[#545454] hover:bg-[#1A1A1A] hover:border-[#444]"
                                    : "bg-white/80 backdrop-blur-md border-[#7D7D7D]/40 hover:bg-[#F9F8F6] hover:border-[#D1CEC8] shadow-sm"
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-[#252525] dark:text-white">{k.term}</span>
                                    {expandedKw === i ? <ChevronUp size={14} className="text-[#7D7D7D] dark:text-[#BABABA] shrink-0" /> : <ChevronDown size={14} className="text-[#7D7D7D] dark:text-[#BABABA] shrink-0" />}
                                </div>
                                {expandedKw === i && (
                                    <p className="text-sm text-[#545454] dark:text-[#BABABA] mt-2 leading-relaxed border-t border-[#7D7D7D]/40 dark:border-[#2E2E2E] pt-2">
                                        {k.definition}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Q&A TAB */}
                {activeTab === "qa" && (
                    <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-5">
                        {qa.length === 0 ? (
                            <p className="text-center text-sm text-[#7D7D7D] py-12">No Q&A pairs found.</p>
                        ) : (
                            <>
                                {/* Progress */}
                                <div className="flex items-center justify-between text-xs text-[#7D7D7D] dark:text-[#BABABA]">
                                    <span>Question {qaIndex + 1} of {qa.length}</span>
                                    <div className={`flex-1 mx-4 h-1 rounded-full ${isDark ? "bg-[#2E2E2E]" : "bg-[#E8E5E0]"} overflow-hidden`}>
                                        <div
                                            className="h-full bg-[#252525] dark:bg-white rounded-full transition-all"
                                            style={{ width: `${((qaIndex + 1) / qa.length) * 100}%` }}
                                        />
                                    </div>
                                    <span>{Math.round(((qaIndex + 1) / qa.length) * 100)}%</span>
                                </div>

                                {/* Question card */}
                                <div className={`p-6 rounded-2xl border transition-colors ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white/80 backdrop-blur-md border-[#7D7D7D]/40 shadow-sm"}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? "text-[#BABABA]" : "text-[#9E9E9E]"}`}>Question</p>
                                    <p className="text-base font-semibold leading-relaxed text-[#252525] dark:text-white">
                                        {currentQA.question}
                                    </p>
                                </div>

                                {/* Answer reveal */}
                                {!showAnswer ? (
                                    <button
                                        onClick={() => setShowAnswer(true)}
                                        className={`w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isDark
                                            ? "border-[#333] text-[#BABABA] hover:border-white hover:text-white"
                                            : "border-[#7D7D7D]/40 text-[#545454] hover:border-[#D1D1D1] hover:bg-[#F9F8F6]"
                                            }`}
                                    >
                                        <Eye size={15} /> Reveal Answer
                                    </button>
                                ) : (
                                    <div className={`p-5 rounded-2xl border-l-4 ${isDark ? "bg-[#1E2E1E] border-green-600" : "bg-green-50 border-green-400"}`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1 ${isDark ? "text-green-400" : "text-green-700"}`}>
                                            <EyeOff size={11} /> Answer
                                        </p>
                                        <p className={`text-sm leading-relaxed ${isDark ? "text-green-300" : "text-green-800"}`}>
                                            {currentQA.answer}
                                        </p>
                                    </div>
                                )}

                                {/* Navigation */}
                                <div className={`flex items-center ${qaIndex > 0 ? "justify-between" : "justify-end"}`}>
                                    {qaIndex > 0 && (
                                        <button
                                            onClick={() => { setQaIndex(i => i - 1); setShowAnswer(false); }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${isDark ? "border-[#333] text-[#BABABA] hover:bg-white/10 hover:text-white" : "border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8]"}`}
                                        >
                                            <ArrowLeft size={14} /> Previous
                                        </button>
                                    )}
                                    {qaIndex < qa.length - 1 ? (
                                        <button
                                            onClick={() => { setQaIndex(i => i + 1); setShowAnswer(false); }}
                                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${isDark ? "bg-white text-[#252525] hover:bg-white/90" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"}`}
                                        >
                                            Next <ArrowRight size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setQaIndex(0); setShowAnswer(false); }}
                                            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${isDark ? "bg-white text-[#252525] hover:bg-white/90" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"}`}
                                        >
                                            Start Over
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
