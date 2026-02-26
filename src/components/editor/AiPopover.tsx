import React, { useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Editor } from "@tiptap/react";

interface AiPopoverProps {
    editor: Editor;
    onClose: () => void;
}

export function AiPopover({ editor, onClose }: AiPopoverProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
    );

    const handleSubmit = async (overridePrompt?: string) => {
        const finalPrompt = overridePrompt || prompt;
        if (!finalPrompt && !selectedText) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/ai/editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: finalPrompt,
                    selectedText,
                    contextText: editor.getText().substring(
                        Math.max(0, editor.state.selection.from - 200),
                        editor.state.selection.to + 200
                    ),
                }),
            });

            if (!res.ok) throw new Error("Failed to get AI response");

            // Determine insertion point
            const insertAt = overridePrompt === "Answer this"
                ? editor.state.selection.to
                : editor.state.selection.from;

            // If replacing selected text (not "Answer this"), delete the selection first
            if (selectedText && overridePrompt !== "Answer this") {
                editor.chain().focus().deleteSelection().run();
            }

            // For "Answer this", add a newline before the answer
            if (overridePrompt === "Answer this") {
                editor.chain().focus().insertContentAt(insertAt, "<p></p>").run();
            }

            // Read the SSE stream and insert text chunk by chunk
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No response body");

            let buffer = "";
            let fullResponse = ""; // Accumulate the complete response
            const startPos = overridePrompt === "Answer this"
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
                            // Insert chunk for live typing effect
                            editor.chain().focus().insertContentAt(currentInsertPos, content).run();
                            currentInsertPos += content.length;
                            fullResponse += content;
                        }
                    } catch {
                        // skip malformed
                    }
                }
            }

            // Once streaming is complete, replace the raw text with properly formatted HTML
            if (fullResponse) {
                const { marked } = await import("marked");
                const htmlResult = await marked.parse(fullResponse);

                // Select the raw streamed text range and replace with formatted HTML
                const endPos = startPos + fullResponse.length;
                editor.chain()
                    .focus()
                    .setTextSelection({ from: startPos, to: endPos })
                    .deleteSelection()
                    .insertContentAt(startPos, htmlResult)
                    .run();
            }

            onClose();
        } catch (error) {
            console.error(error);
            alert("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex flex-col w-[350px] bg-white dark:bg-[#252525] border border-[#E0E0E0] dark:border-[#3A3A3A] shadow-xl rounded-xl overflow-hidden pointer-events-auto"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center gap-2 p-3 bg-[#252525]/10 dark:bg-[#CFCFCF]/10 border-b border-[#E0E0E0] dark:border-[#3A3A3A]">
                <Sparkles size={16} className="text-[#252525] dark:text-[#CFCFCF]" />
                <span className="text-sm font-semibold text-[#252525] dark:text-[#CFCFCF]">Ask AI</span>
            </div>

            <div className="p-3 flex flex-col gap-3">
                <div className="relative">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSubmit();
                        }}
                        placeholder="Tell AI what to do..."
                        className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#3A3A3A] rounded-lg py-2 pl-3 pr-10 text-sm text-[#252525] dark:text-[#CFCFCF] focus:outline-none focus:border-[#252525] dark:focus:border-[#CFCFCF] transition-colors"
                        autoFocus
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSubmit()}
                        disabled={(!prompt && !selectedText) || isLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#252525] dark:text-[#CFCFCF] hover:bg-[#252525]/10 dark:hover:bg-[#CFCFCF]/10 rounded-md disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    </button>
                </div>

                {selectedText && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleSubmit("Improve writing")}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-[#F5F5F5] dark:bg-[#1A1A1A] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] text-[#545454] dark:text-[#CFCFCF] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                            Improve writing
                        </button>
                        <button
                            onClick={() => handleSubmit("Make it shorter")}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-[#F5F5F5] dark:bg-[#1A1A1A] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] text-[#545454] dark:text-[#CFCFCF] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                            Make shorter
                        </button>
                        <button
                            onClick={() => handleSubmit("Fix grammar")}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-[#F5F5F5] dark:bg-[#1A1A1A] hover:bg-[#E0E0E0] dark:hover:bg-[#3A3A3A] text-[#545454] dark:text-[#CFCFCF] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                            Fix grammar
                        </button>
                        <button
                            onClick={() => handleSubmit("Answer this")}
                            disabled={isLoading}
                            className="px-2.5 py-1 bg-[#252525]/10 dark:bg-[#CFCFCF]/10 hover:bg-[#252525]/20 dark:hover:bg-[#CFCFCF]/20 text-[#252525] dark:text-[#CFCFCF] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                        >
                            Answer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
