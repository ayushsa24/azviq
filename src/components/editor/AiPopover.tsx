import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, ArrowRight, FileText, Wand2, Minimize2, CheckCheck, Square, X, Check, Crown } from "lucide-react";
import { Editor } from "@tiptap/react";
import { useSettings } from "@/contexts/SettingsContext";

interface AiPopoverProps {
    editor: Editor;
    onClose: () => void;
    onGenerating?: (generating: boolean) => void;
}

export function AiPopover({ editor, onClose, onGenerating }: AiPopoverProps) {
    const { openSettings } = useSettings();
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasStartedWriting, setHasStartedWriting] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fullResponseRef = useRef<string>("");
    const insertionRangeRef = useRef<{ from: number, to: number } | null>(null);
    const originalContentRef = useRef<string | null>(null);
    const wasReplacedRef = useRef<boolean>(false);
    const insertPosRef = useRef<number>(0);

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
            // This is handled in the catch block if we use signal.
        } else {
            setIsLoading(false);
            onClose();
        }
    };

    const handleDiscard = () => {
        if (insertionRangeRef.current && editor) {
            // First delete what AI generated
            editor.chain()
                .focus()
                .deleteRange({
                    from: insertionRangeRef.current.from,
                    to: insertionRangeRef.current.to
                })
                .run();
                
            // Then restore the original content if it was replaced
            if (wasReplacedRef.current && originalContentRef.current) {
                editor.chain()
                    .focus()
                    .insertContentAt(insertPosRef.current, originalContentRef.current)
                    .run();
            }
        }
        onClose();
    };

    const handleSubmit = async (command: string) => {
        if (!selectedText && !command) return;

        setIsLoading(true);
        setIsComplete(false);
        setHasStartedWriting(false);
        fullResponseRef.current = "";
        insertionRangeRef.current = null;
        originalContentRef.current = null;
        wasReplacedRef.current = false;
        abortControllerRef.current = new AbortController();
        let insertAt = editor.state.selection.from;
        insertPosRef.current = insertAt;

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
            insertPosRef.current = insertAt;

            // If replacing selected text (not "Answer this"), store it as HTML and delete the selection
            if (selectedText && command !== "Answer this") {
                const { DOMSerializer } = await import('prosemirror-model');
                const fragment = editor.state.selection.content().content;
                const div = document.createElement('div');
                div.appendChild(DOMSerializer.fromSchema(editor.schema).serializeFragment(fragment));
                originalContentRef.current = div.innerHTML;
                wasReplacedRef.current = true;
                
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

                let chunkBatch = "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6);
                    if (data === "[DONE]") break;

                    try {
                        const { content } = JSON.parse(data);
                        if (content) {
                            if (!hasStartedWriting) setHasStartedWriting(true);
                            chunkBatch += content;
                            fullResponseRef.current += content;
                        }
                    } catch {
                        // skip malformed
                    }
                }

                // Batch insertion for performance
                if (chunkBatch) {
                    editor.chain().focus().insertContentAt(currentInsertPos, chunkBatch).run();
                    currentInsertPos += chunkBatch.length;
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

                const finalEndPos = editor.state.selection.to;
                insertionRangeRef.current = { from: startPos, to: finalEndPos };

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
                
                const finalEndPos = editor.state.selection.to;
                insertionRangeRef.current = { from: startPos, to: finalEndPos };
                setIsComplete(true);
            } else {
                onClose();
            }
        } else {
            console.error(error);
            // Handle quota exhaustion specifically
            if (error.message.includes("Daily limit reached") || error.message.includes("QUOTA_EXCEEDED")) {
                setError(error.message);
                return; // Keep popover open to show error
            }
            setError("Sorry, I encountered an error. Please try again.");
        }
    } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
    }
};

const handleUpgrade = () => {
    openSettings("subscription");
    onClose();
};

if (error) {
    return (
        <div
            className="flex flex-col w-full md:w-[240px] bg-white dark:bg-[#252525] border border-[#C2A27A]/30 shadow-2xl rounded-xl overflow-hidden pointer-events-auto transition-all animate-in fade-in zoom-in duration-200"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#C2A27A]/10 border-b border-[#C2A27A]/20">
                <Crown size={14} className="text-[#C2A27A]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B6F4E] dark:text-[#C2A27A]">Action Required</span>
            </div>
            <div className="p-3 flex flex-col gap-2">
                <p className="text-[11px] leading-relaxed text-[#252525] dark:text-[#BABABA]">
                    {error}
                </p>
                <button
                    onClick={handleUpgrade}
                    className="flex items-center justify-center gap-2 w-full py-1.5 bg-[#C2A27A] hover:bg-[#B19169] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm"
                >
                    Upgrade Plan
                    <ArrowRight size={12} />
                </button>
            </div>
        </div>
    );
}

    if (isLoading) {
        return (
            <div
                className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0]/30 dark:border-[#3A3A3A]/30 shadow-2xl rounded-full pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-[#252525] dark:text-[#CFCFCF]" />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-[#252525] dark:text-[#CFCFCF] whitespace-nowrap">
                        <span>AI is thinking</span>
                        <span className="flex">
                            <span className="animate-[bounce_1s_infinite_0ms]">.</span>
                            <span className="animate-[bounce_1s_infinite_200ms]">.</span>
                            <span className="animate-[bounce_1s_infinite_400ms]">.</span>
                        </span>
                    </div>
                </div>
                <div className="w-px h-4 bg-[#E0E0E0] dark:bg-[#3A3A3A] mx-1" />
                <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#252525]/5 dark:bg-[#CFCFCF]/5 hover:bg-[#252525]/10 dark:hover:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] text-[10px] font-black uppercase tracking-tight rounded-full transition-all"
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
                className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0]/30 dark:border-[#3A3A3A]/30 shadow-2xl rounded-full pointer-events-auto min-w-max"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center shrink-0">
                        <Sparkles size={12} className="text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#252525] dark:text-[#CFCFCF] whitespace-nowrap">Keep this response?</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                    <button
                        onClick={handleDiscard}
                        className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Discard (Remove)"
                    >
                        <X size={14} sm-size={16} strokeWidth={3} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        title="Accept (Keep)"
                    >
                        <Check size={14} sm-size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col md:w-[220px] w-full max-w-[calc(100vw-32px)] bg-white dark:bg-[#252525] border border-[#E8E5E0]/30 dark:border-[#3A3A3A]/30 shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F9F8F6] dark:bg-[#1A1A1A] border-b border-[#E8E5E0] dark:border-[#3A3A3A]">
                <Sparkles size={13} className="text-[#252525] dark:text-[#BABABA]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D] dark:text-[#BABABA]">AI Commands</span>
            </div>

            <div className="p-1 flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                            className="flex items-center gap-2 px-2.5 py-2 hover:bg-[#252525] hover:text-white dark:hover:bg-white dark:hover:text-[#252525] text-[#252525] dark:text-white text-[11px] md:text-xs font-bold rounded-lg transition-colors group border border-[#252525]/20 dark:border-white/20"
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
