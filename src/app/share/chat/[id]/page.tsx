"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, Copy, Check, MessageCircle, ExternalLink, Loader2, Sun, Moon } from "lucide-react";

type Message = {
    role: "user" | "model";
    content: string;
};

type SharedChat = {
    id: string;
    title: string;
    messages: Message[];
    created_at: string;
};

export default function SharedChatPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { status } = useSession();
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const [shared, setShared] = useState<SharedChat | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrivate, setIsPrivate] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        async function fetchShared() {
            try {
                const res = await fetch(`/api/share/chat/${id}`);
                if (!res.ok) { setIsPrivate(true); setIsLoading(false); return; }
                const data = await res.json();
                setShared(data.shared);
            } catch {
                setIsPrivate(true);
            } finally {
                setIsLoading(false);
            }
        }
        fetchShared();
    }, [id]);

    const handleContinue = () => {
        if (!shared) return;
        // Use localStorage so the data survives the login redirect
        localStorage.setItem("import_shared_chat", JSON.stringify({
            title: shared.title,
            messages: shared.messages,
            original_shared_chat_id: id // Store the shared chat ID as original
        }));
        const destination = "/ai?from_share=1";
        if (status === "authenticated") {
            router.push(destination);
        } else {
            // Redirect to login with callbackUrl so they land on /ai after login
            router.push(`/login?callbackUrl=${encodeURIComponent(destination)}`);
        }
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const markdownComponents = {
        h1: ({ node, ...props }: any) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
        h2: ({ node, ...props }: any) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
        h3: ({ node, ...props }: any) => <h3 className="text-md font-bold mt-2 mb-1" {...props} />,
        p: ({ node, ...props }: any) => <p className="mb-2 leading-relaxed" {...props} />,
        ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-2 space-y-0.5" {...props} />,
        ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-2 space-y-0.5" {...props} />,
        li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
        a: ({ node, ...props }: any) => (
            <a className="text-[#545454] dark:text-white hover:underline font-semibold" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        strong: ({ node, ...props }: any) => <strong className="font-bold text-inherit" {...props} />,
        blockquote: ({ node, ...props }: any) => (
            <blockquote className={`border-l-4 pl-4 my-3 italic ${isDark ? "border-[#545454] text-gray-400" : "border-[#E8E5E0] text-gray-600"}`} {...props} />
        ),
        table: ({ node, ...props }: any) => (
            <div className="w-full overflow-x-auto mb-4 mt-2 border rounded-lg border-[#E8E5E0] dark:border-[#545454]">
                <table className="w-full text-sm text-left border-collapse" {...props} />
            </div>
        ),
        thead: ({ node, ...props }: any) => (
            <thead
                className={`text-xs uppercase font-medium ${theme === "dark" ? "bg-[#2A2A2A] text-gray-300 border-b border-[#545454]" : "bg-[#F5F3EF] text-gray-700 border-b border-[#E8E5E0]"}`}
                {...props}
            />
        ),
        tbody: ({ node, ...props }: any) => <tbody className="divide-y divide-gray-200 dark:divide-[#545454]" {...props} />,
        tr: ({ node, ...props }: any) => (
            <tr className={`transition-colors ${theme === "dark" ? "hover:bg-[#252525]/50" : "hover:bg-gray-50"}`} {...props} />
        ),
        th: ({ node, ...props }: any) => (
            <th className="px-4 py-3 border-r last:border-r-0 border-gray-200 dark:border-[#545454]" {...props} />
        ),
        td: ({ node, ...props }: any) => (
            <td className="px-4 py-3 border-r last:border-r-0 border-gray-200 dark:border-[#545454]" {...props} />
        ),
        pre: ({ node, children, ...props }: any) => <div className="not-prose">{children}</div>,
        code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className?.includes("language");
            const codeString = String(children).replace(/\n$/, "");

            if (isInline) {
                return (
                    <code
                        className={`px-1 py-0.5 rounded text-xs ${isDark ? "bg-[#1e1e1e] text-pink-400" : "bg-[#F5F3EF] text-pink-600"}`}
                        {...props}
                    >
                        {children}
                    </code>
                );
            }

            return (
                <div className="relative group/code mb-4 mt-3">
                    <div className={`flex items-center justify-between px-4 py-2 text-xs font-sans rounded-t-xl ${isDark ? "bg-[#2A2A2A] text-gray-400 border border-b-0 border-[#545454]" : "bg-gray-800 text-gray-400 border border-b-0 border-gray-800"}`}>
                        <span>{match?.[1] || "code"}</span>
                        <button
                            onClick={() => handleCopyCode(codeString)}
                            className="flex items-center gap-1.5 hover:text-white transition-colors"
                        >
                            {copiedCode === codeString
                                ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied</span></>
                                : <><Copy className="w-3.5 h-3.5" /><span>Copy code</span></>
                            }
                        </button>
                    </div>
                    <div className={`overflow-x-auto text-sm rounded-b-xl ${isDark ? "bg-[#161514] border border-[#545454]" : "bg-[#1e1e1e] border border-gray-800"}`}>
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match?.[1] || "text"}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: "16px", fontSize: "13px", background: "transparent", borderRadius: 0 }}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                </div>
            );
        },
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#161514]">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
        );
    }

    if (isPrivate || !shared) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#161514] text-white gap-4 p-8">
                <MessageCircle className="w-12 h-12 text-[#7D7D7D]" />
                <h1 className="text-2xl font-bold">Chat Not Found</h1>
                <p className="text-[#7D7D7D] text-center max-w-xs">
                    This shared chat link is invalid or has been removed.
                </p>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col transition-colors ${isDark ? "bg-[#1A1A1A]" : "bg-[#F5F3EF]"}`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 sm:px-8 py-3 border-b backdrop-blur-md ${
                isDark ? "bg-[#1A1A1A]/80 border-[#545454]" : "bg-[#F5F3EF]/80 border-[#E8E5E0]"
            }`}>
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <img 
                        src={isDark ? "/icon-dark.png" : "/icon-light.png"} 
                        alt="AI" 
                        className="w-6 h-6 object-contain" 
                    />
                </div>

                <span className={`font-semibold truncate flex-1 text-sm ${isDark ? "text-white" : "text-[#252525]"}`}>
                    {shared.title}
                </span>

                <button
                    onClick={handleContinue}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shrink-0 ${isDark ? "bg-white text-[#252525]" : "bg-[#252525] text-white"}`}
                >
                    <ExternalLink size={12} />
                    Continue this chat
                </button>

                <button
                    onClick={toggleTheme}
                    className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors shrink-0 ${
                        isDark ? "border-[#545454] bg-[#252525] text-[#BABABA] hover:bg-[#1A1A1A]"
                               : "border-[#E8E5E0] bg-white text-[#545454] hover:bg-[#F0EDE8]"
                    }`}
                >
                    {isDark ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <div className={`w-px h-4 hidden sm:block ${isDark ? "bg-[#545454]" : "bg-[#E8E5E0]"}`} />
                <span className={`text-xs shrink-0 hidden sm:block ${isDark ? "text-gray-400" : "text-[#7D7D7D]"}`}>Shared via Azviq</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto w-full">
                {shared.messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`group flex gap-3 md:gap-4 w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        {/* Avatar — model only */}
                        {msg.role === "model" && (
                            <div className="hidden md:flex w-8 h-8 mt-2 shrink-0 items-center justify-center">
                                <img 
                                    src={isDark ? "/icon-dark.png" : "/icon-light.png"} 
                                    alt="AI" 
                                    className="w-7 h-7 object-contain" 
                                />
                            </div>
                        )}

                        {/* Bubble */}
                        <div className={`relative flex flex-col gap-1 ${msg.role === "user" ? "items-end max-w-[85%] md:max-w-[75%]" : "items-start w-full md:w-[calc(100%-48px)] max-w-full"}`}>
                            <div
                                className={`relative px-4 py-3 text-[14px] md:text-[15px] rounded-2xl ${
                                    msg.role === "user"
                                        ? isDark
                                            ? "bg-[#545454] text-white rounded-br-none"
                                            : "bg-[#F0EDE8] text-gray-900 rounded-br-none"
                                        : isDark
                                            ? "w-fit max-w-full bg-[#252525] text-white border border-[#545454] rounded-bl-none"
                                            : "w-fit max-w-full bg-white text-[#252525] shadow-sm border border-[#E8E5E0] rounded-bl-none"
                                }`}
                            >
                                {msg.role === "model" ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="whitespace-pre-wrap">{msg.content}</span>
                                )}
                            </div>

                            {/* Copy button */}
                            <button
                                onClick={() => handleCopy(msg.content, idx)}
                                className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] cursor-pointer ${
                                    isDark ? "text-gray-500 hover:text-white hover:bg-[#252525]" : "text-[#BABABA] hover:text-[#545454] hover:bg-[#F0EDE8]"
                                }`}
                            >
                                {copiedIdx === idx ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                            </button>
                        </div>

                        {/* Avatar — user only */}
                        {msg.role === "user" && (
                            <div className={`hidden md:flex w-8 h-8 mt-2 rounded-full shrink-0 items-center justify-center ${isDark ? "bg-[#545454]" : "bg-[#E8E5E0]"}`}>
                                <User className={`w-4 h-4 ${isDark ? "text-white" : "text-[#545454]"}`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bottom CTA */}
            <div className={`border-t py-10 flex flex-col items-center gap-4 text-center px-4 ${isDark ? "border-[#545454]" : "border-[#E8E5E0]"}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${isDark ? "bg-white text-[#252525]" : "bg-[#252525] text-white"}`}>
                    <img src="/azviq_logo.png" alt="Azviq" className={`w-12 h-12 object-contain ${isDark ? 'invert' : ''}`} />
                </div>
                <div>
                    <p className={`font-bold ${isDark ? "text-white" : "text-[#252525]"}`}>Continue this conversation</p>
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-[#BABABA]"}`}>Sign in to Azviq and pick up right where this chat left off.</p>
                </div>
                <button
                    onClick={handleContinue}
                    className={`px-6 py-2.5 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-95 transition-all ${isDark ? "bg-white text-[#252525]" : "bg-[#252525] text-white"}`}
                >
                    Continue in Azviq →
                </button>
                <p className={`text-xs ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>Shared via Azviq AI</p>
            </div>
        </div>
    );
}
