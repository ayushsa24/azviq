import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, ArrowRight, Square, X, Check } from "lucide-react";

interface AiInlineInputProps {
    initialTop: number;
    initialLeft: number;
    contextText: string;
    onClose: () => void;
    onInsert: (content: string) => void;
    onStreamChunk: (content: string) => void;
    onDiscard: () => void;
}

export function AiInlineInput({
    initialTop,
    initialLeft,
    contextText,
    onClose,
    onInsert,
    onStreamChunk,
    onDiscard,
}: AiInlineInputProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
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
                // Only close if not loading. If loading, user might accidentally click outside
                if (!isLoading && !isComplete) handleLocalClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", handleClickOutside);

        // Ensure input is focused on mount
        if (!isLoading && !isComplete) {
            setTimeout(() => {
                inputRef.current?.focus({ preventScroll: true });
            }, 10);
        }

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isLoading, isComplete]);

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

        // Even if we stop, we want to show the Keep/Discard choice for what we have
        if (fullResponseRef.current) {
            setIsLoading(false);
            setIsComplete(true);
        } else {
            setIsLoading(false);
            onClose();
        }
    }

    const handleSubmit = async () => {
        if (!prompt) return;

        setIsLoading(true);
        setIsComplete(false);
        fullResponseRef.current = "";
        abortControllerRef.current = new AbortController();

        try {
            const res = await fetch("/api/ai/editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    selectedText: "", 
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

                let chunkBatch = "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;

                    try {
                        const { content } = JSON.parse(data);
                        if (content) {
                            chunkBatch += content;
                            fullResponseRef.current += content;
                        }
                    } catch {
                        // ignore malformed
                    }
                }

                // Call onStreamChunk with batched content for better performance
                if (chunkBatch) {
                    onStreamChunk(chunkBatch);
                }
            }

            if (fullResponseRef.current) {
                setIsComplete(true);
            } else {
                onClose();
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("AI Generation aborted by user");
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

    const handleAccept = async () => {
        if (fullResponseRef.current) {
            const { marked } = await import("marked");
            const htmlResult = await marked.parse(fullResponseRef.current);
            onInsert(htmlResult);
        }
        onClose();
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-2xl overflow-hidden pointer-events-auto z-[50] transition-all duration-300 ${isLoading || isComplete
                ? 'fixed bottom-12 left-1/2 -translate-x-1/2 rounded-full w-auto max-w-fit px-2 min-w-max flex-nowrap'
                : 'absolute rounded-xl w-[90vw] max-w-[450px]'
                }`}
            style={isLoading || isComplete ? {} : {
                top: `${initialTop - 70}px`,
                left: `${Math.max(0, initialLeft)}px`
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center justify-between gap-3 flex-nowrap ${(isLoading || isComplete) ? 'py-2 px-4' : 'p-3'}`}>
                <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-nowrap">
                    <div className="relative flex items-center justify-center shrink-0">
                        <Sparkles size={16} className={`text-[#252525] dark:text-[#CFCFCF] ${isComplete ? 'text-green-500' : ''}`} />
                    </div>
                    
                    {isLoading ? (
                        <div className="flex items-center gap-1 text-sm text-[#252525] dark:text-[#CFCFCF] font-bold whitespace-nowrap">
                            <span>AI is thinking</span>
                            <span className="flex">
                                <span className="animate-[bounce_1s_infinite_0ms]">.</span>
                                <span className="animate-[bounce_1s_infinite_200ms]">.</span>
                                <span className="animate-[bounce_1s_infinite_400ms]">.</span>
                            </span>
                        </div>
                    ) : isComplete ? (
                        <span className="text-xs sm:text-sm font-bold text-[#252525] dark:text-[#CFCFCF] whitespace-nowrap">
                            Keep this response?
                        </span>
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

                <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                    {isLoading ? (
                        <>
                            <div className="w-px h-4 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-1.5 px-3 py-1 bg-[#252525]/5 dark:bg-[#CFCFCF]/5 hover:bg-[#252525]/10 dark:hover:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] text-[10px] font-black uppercase tracking-tight rounded-full transition-all whitespace-nowrap"
                                title="Stop Generation"
                            >
                                <Square size={10} className="fill-current" />
                                Stop
                            </button>
                        </>
                    ) : isComplete ? (
                        <div className="flex items-center gap-1.5 ml-1 shrink-0">
                            <button
                                onClick={onDiscard}
                                className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                title="Discard (Remove)"
                            >
                                <X size={14} sm-size={16} strokeWidth={3} />
                            </button>
                            <button
                                onClick={handleAccept}
                                className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                title="Accept (Keep)"
                            >
                                <Check size={14} sm-size={16} strokeWidth={3} />
                            </button>
                        </div>
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
