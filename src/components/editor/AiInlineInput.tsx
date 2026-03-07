import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, ArrowRight, Square } from "lucide-react";

interface AiInlineInputProps {
    initialTop: number;
    initialLeft: number;
    contextText: string;
    onClose: () => void;
    onInsert: (content: string) => void;
    onStreamChunk: (content: string) => void;
}

export function AiInlineInput({
    initialTop,
    initialLeft,
    contextText,
    onClose,
    onInsert,
    onStreamChunk,
}: AiInlineInputProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fullResponseRef = useRef<string>("");

    // Keep it mounted properly
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                handleLocalClose();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                handleLocalClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handleClickOutside);

        // Ensure input is focused on mount
        setTimeout(() => {
            inputRef.current?.focus();
        }, 10);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLocalClose = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        onClose();
    };

    const handleStop = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Even if we stop, we want to finalize the formatting of what we already have
        if (fullResponseRef.current) {
            const { marked } = await import("marked");
            const htmlResult = await marked.parse(fullResponseRef.current);
            onInsert(htmlResult);
        }

        setIsLoading(false);
        onClose();
    }

    const handleSubmit = async () => {
        if (!prompt) return;

        setIsLoading(true);
        fullResponseRef.current = "";
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch("/api/ai/editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    selectedText: "", // Inline AI doesn't have selected text
                    contextText: contextText,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) throw new Error("Failed to get AI response");

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;

                    try {
                        const { content } = JSON.parse(data);
                        if (content) {
                            onStreamChunk(content);
                            fullResponseRef.current += content;
                        }
                    } catch {
                        // ignore malformed
                    }
                }
            }

            // Once streaming is complete, replace with marked HTML
            if (fullResponseRef.current) {
                const { marked } = await import("marked");
                const htmlResult = await marked.parse(fullResponseRef.current);
                onInsert(htmlResult);
            }

            onClose();
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("AI Generation aborted by user");
                // Note: handleStop handles the onClose and onInsert in the abort case
            } else {
                console.error(error);
                alert("Sorry, I encountered an error. Please try again.");
                onClose();
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col w-[90vw] max-w-[450px] bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-2xl rounded-xl overflow-hidden pointer-events-auto z-[100] ${isLoading
                    ? 'fixed bottom-8 left-1/2 -translate-x-1/2'
                    : 'absolute'
                }`}
            style={isLoading ? {} : {
                top: `${initialTop - 70}px`,
                left: `${Math.max(0, initialLeft)}px`
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Sparkles size={16} className={`text-[#252525] dark:text-[#CFCFCF] ${isLoading ? 'animate-pulse' : ''}`} />
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-[#252525] dark:text-[#CFCFCF] font-medium overflow-hidden whitespace-nowrap">
                            <span>AI is thinking</span>
                            <span className="flex gap-0.5">
                                <span className="animate-bounce delay-0">.</span>
                                <span className="animate-bounce delay-150">.</span>
                                <span className="animate-bounce delay-300">.</span>
                            </span>
                        </div>
                    ) : (
                        <input
                            ref={inputRef}
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !isLoading) handleSubmit();
                            }}
                            placeholder="Ask AI anything..."
                            className="w-full bg-transparent border-none text-sm text-[#252525] dark:text-[#CFCFCF] focus:outline-none placeholder-[#A3A3A3] dark:placeholder-[#545454]"
                            autoFocus
                            disabled={isLoading}
                        />
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {isLoading ? (
                        <button
                            onClick={handleStop}
                            className="p-1.5 flex items-center gap-1.5 text-[#252525] dark:text-[#CFCFCF] hover:bg-[#252525]/10 dark:hover:bg-[#CFCFCF]/10 rounded-md transition-colors text-xs font-semibold"
                            title="Stop Generation"
                        >
                            <Square size={14} className="fill-current" />
                            Stop
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!prompt}
                            className="p-1.5 text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] rounded-md disabled:opacity-50 transition-colors"
                        >
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
