import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, ArrowRight, FileText, Wand2, Minimize2, CheckCheck, Square } from "lucide-react";
import { Editor } from "@tiptap/react";

interface AiPopoverProps {
    editor: Editor;
    onClose: () => void;
    onGenerating?: (generating: boolean) => void;
}

export function AiPopover({ editor, onClose, onGenerating }: AiPopoverProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [hasStartedWriting, setHasStartedWriting] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fullResponseRef = useRef<string>("");

    useEffect(() => {
        onGenerating?.(isLoading || isComplete);
    }, [isLoading, isComplete, onGenerating]);

    const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
    );

    // Listen for spacebar to stop generation
    useEffect(() => {
        if (!isLoading) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleStop();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLoading]);

    const handleStop = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Even if we stop, we want to finalize the formatting of what we already have
        if (fullResponseRef.current) {
            const { marked } = await import("marked");
            const htmlResult = await marked.parse(fullResponseRef.current);

            // Note: We need to know where we were inserting. 
            // This is handled in the catch block if we use signal.
        }

        setIsLoading(false);
        onClose();
    };

    const handleSubmit = async (command: string) => {
        if (!selectedText && !command) return;

        setIsLoading(true);
        setIsComplete(false);
        setHasStartedWriting(false);
        fullResponseRef.current = "";
        abortControllerRef.current = new AbortController();
        let insertAt = editor.state.selection.from;

        try {
            const res = await fetch("/api/ai/editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: command,
                    selectedText,
                    contextText: editor.getText().substring(
                        Math.max(0, editor.state.selection.from - 200),
                        editor.state.selection.to + 200
                    ),
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!res.ok) throw new Error("Failed to get AI response");

            // Determine insertion point
            insertAt = command === "Answer this"
                ? editor.state.selection.to
                : editor.state.selection.from;

            // If replacing selected text (not "Answer this"), delete the selection first
            if (selectedText && command !== "Answer this") {
                editor.chain().focus().deleteSelection().run();
            }

            // For "Answer this", add a newline before the answer
            if (command === "Answer this") {
                editor.chain().focus().insertContentAt(insertAt, "<p></p>").run();
            }

            // Read the SSE stream and insert text chunk by chunk
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let buffer = "";
            const startPos = command === "Answer this"
                ? insertAt + 2
                : editor.state.selection.from;
            let currentInsertPos = startPos;

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
                            if (!hasStartedWriting) setHasStartedWriting(true);
                            // Insert chunk for live typing effect
                            editor.chain().focus().insertContentAt(currentInsertPos, content).run();
                            currentInsertPos += content.length;
                            fullResponseRef.current += content;
                        }
                    } catch {
                        // skip malformed
                    }
                }
            }

            // Once streaming is complete, replace the raw text with properly formatted HTML
            if (fullResponseRef.current) {
                const { marked } = await import("marked");
                const htmlResult = await marked.parse(fullResponseRef.current);

                // Select the raw streamed text range and replace with formatted HTML
                const endPos = startPos + fullResponseRef.current.length;
                editor.chain()
                    .focus()
                    .setTextSelection({ from: startPos, to: endPos })
                    .deleteSelection()
                    .insertContentAt(startPos, htmlResult)
                    .run();

                setIsComplete(true);
            }

            // Keep popover open so user can see it's done
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.log("AI Generation aborted by user");
                // Finalize what we have
                if (fullResponseRef.current) {
                    const { marked } = await import("marked");
                    const htmlResult = await marked.parse(fullResponseRef.current);
                    const startPos = command === "Answer this"
                        ? insertAt + 2
                        : editor.state.selection.from;
                    const endPos = startPos + fullResponseRef.current.length;

                    editor.chain()
                        .focus()
                        .setTextSelection({ from: startPos, to: endPos })
                        .deleteSelection()
                        .insertContentAt(startPos, htmlResult)
                        .run();
                }
            } else {
                console.error(error);
                alert("Sorry, I encountered an error. Please try again.");
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    if (isLoading) {
        return (
            <div
                className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-2xl rounded-full pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5">
                    <div className="relative">
                        <Sparkles size={16} className={`text-[#252525] dark:text-[#CFCFCF] ${hasStartedWriting ? 'animate-pulse' : 'animate-spin'}`} />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-sm font-bold text-[#252525] dark:text-[#CFCFCF] whitespace-nowrap">
                        AI is writing...
                    </span>
                </div>
                <div className="w-px h-4 bg-[#E0E0E0] dark:bg-[#3A3A3A]" />
                <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#252525]/5 dark:bg-[#CFCFCF]/5 hover:bg-[#252525]/10 dark:hover:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] text-[10px] font-black uppercase tracking-tighter rounded-full transition-all"
                >
                    <Square size={10} className="fill-current" />
                    Stop
                </button>
            </div>
        );
    }

    if (isComplete) {
        return (
            <div
                className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-2xl rounded-full pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center">
                        <CheckCheck size={14} className="text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-bold text-[#252525] dark:text-[#CFCFCF]">Response Ready</span>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] text-xs font-bold rounded-full hover:opacity-90 transition-all shadow-sm"
                >
                    Done
                </button>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col md:w-[220px] w-[200px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F9F8F6] dark:bg-[#1A1A1A] border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                <Sparkles size={13} className="text-[#252525] dark:text-[#BABABA]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D] dark:text-[#BABABA]">AI Commands</span>
            </div>

            <div className="p-1 grid grid-cols-2 md:flex md:flex-col gap-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <>
                    <button
                        onClick={() => handleSubmit(selectedText ? "Summarize this" : "Summarize document")}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] text-[11px] md:text-xs font-medium rounded-lg transition-colors group"
                    >
                        <FileText size={14} className="text-[#A3A3A3] group-hover:text-[#252525] dark:group-hover:text-white shrink-0" />
                        <span className="truncate">{selectedText ? "Summarize" : "Summarize Note"}</span>
                    </button>
                    <button
                        onClick={() => handleSubmit(selectedText ? "Explain this" : "Explain content")}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] text-[11px] md:text-xs font-medium rounded-lg transition-colors group"
                    >
                        <Wand2 size={14} className="text-[#A3A3A3] group-hover:text-[#252525] dark:group-hover:text-white shrink-0" />
                        <span className="truncate">{selectedText ? "Explain" : "Explain Content"}</span>
                    </button>
                    <button
                        onClick={() => handleSubmit("Improve writing")}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] text-[11px] md:text-xs font-medium rounded-lg transition-colors group"
                    >
                        <Sparkles size={14} className="text-[#A3A3A3] group-hover:text-[#252525] dark:group-hover:text-white shrink-0" />
                        <span className="truncate">Improve Writing</span>
                    </button>
                    <button
                        onClick={() => handleSubmit("Make it shorter")}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] text-[11px] md:text-xs font-medium rounded-lg transition-colors group"
                    >
                        <Minimize2 size={14} className="text-[#A3A3A3] group-hover:text-[#252525] dark:group-hover:text-white shrink-0" />
                        <span className="truncate">Make Shorter</span>
                    </button>
                    <button
                        onClick={() => handleSubmit("Fix grammar")}
                        className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#F5F3EF] dark:hover:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] text-[11px] md:text-xs font-medium rounded-lg transition-colors group"
                    >
                        <CheckCheck size={14} className="text-[#A3A3A3] group-hover:text-[#252525] dark:group-hover:text-white shrink-0" />
                        <span className="truncate">Fix Grammar</span>
                    </button>

                    {selectedText && (
                        <button
                            onClick={() => handleSubmit("Answer this")}
                            className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#252525] hover:text-white dark:hover:bg-white dark:hover:text-[#252525] text-[#252525] dark:text-white text-[11px] md:text-xs font-bold rounded-lg transition-colors group col-span-2 md:col-span-1 border border-[#252525] dark:border-white"
                        >
                            <ArrowRight size={14} className="shrink-0" />
                            <span className="truncate">Answer Selection</span>
                        </button>
                    )}
                </>
            </div>
        </div>
    );
}
