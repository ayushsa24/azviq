"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, User, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/contexts/ThemeContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TextChatPanelProps {
  noteTitle: string;
  noteContent: string;
  isPdf: boolean;
}

/** Parse AI response to identify correction/confirmation markers */
function parseMessageType(content: string): "correction" | "correct" | "normal" {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("[CORRECTION]")) return "correction";
  if (trimmed.startsWith("[CORRECT]")) return "correct";
  return "normal";
}

/** Remove the marker tokens from displayed content */
function cleanContent(content: string): string {
  return content
    .replace(/^\[CORRECTION\]\n?/i, "")
    .replace(/^\[CORRECT\]\n?/i, "")
    .trim();
}

export default function TextChatPanel({ noteTitle, noteContent, isPdf }: TextChatPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-start the session with a greeting from the AI
  const startSession = useCallback(async () => {
    setIsStarting(true);
    const initMessages: Message[] = [{ role: "user", content: "SESSION_START" }];
    await streamResponse(initMessages, true);
    setIsStarting(false);
  }, [noteTitle, noteContent, isPdf]);

  useEffect(() => {
    setMessages([]);
    startSession();
    return () => abortRef.current?.abort();
  }, [noteTitle, noteContent]);

  const streamResponse = async (conversationMessages: Message[], isInit = false) => {
    setIsLoading(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/personal-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: conversationMessages,
          noteTitle,
          noteContent,
          isPdf,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "AI request failed");
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Add empty assistant message to stream into
      if (!isInit) {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      } else {
        setMessages([...conversationMessages, { role: "assistant", content: "" }]);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `[CORRECTION]\nSomething went wrong: ${err.message}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await streamResponse(updatedMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {isStarting && messages.length === 0 && (
          <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isDark ? "bg-[#252525] border border-[#545454]" : "bg-[#F0EDE8] border border-[#7D7D7D]/30"}`}>
              <Sparkles className="w-4 h-4 text-[#C2A27A]" />
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex items-center gap-2 ${isDark ? "bg-[#252525] text-white border border-[#545454]" : "bg-[#F0EDE8] text-[#252525]"}`}>
              <Loader2 className="w-4 h-4 animate-spin text-[#C2A27A]" />
              <span className="text-[#7D7D7D]">Analysing your {isPdf ? "PDF" : "note"}…</span>
            </div>
          </div>
        )}

        {messages.filter(m => !(m.role === "user" && m.content === "SESSION_START")).map((message, idx) => {
          const msgType = message.role === "assistant" ? parseMessageType(message.content) : "normal";
          const displayContent = message.role === "assistant" ? cleanContent(message.content) : message.content;

          return (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDark ? "bg-[#252525] border border-[#545454]" : "bg-[#F0EDE8] border border-[#7D7D7D]/30"}`}>
                  <Sparkles className="w-4 h-4 text-[#C2A27A]" />
                </div>
              )}

              <div className="flex flex-col gap-1 max-w-[82%]">
                {/* Correction / Correct Badge */}
                {message.role === "assistant" && msgType !== "normal" && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit
                    ${msgType === "correction"
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {msgType === "correction"
                      ? <><AlertCircle size={10} /> Correction</>
                      : <><CheckCircle2 size={10} /> Correct!</>
                    }
                  </div>
                )}

                {/* Bubble */}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap transition-all duration-200
                  ${message.role === "user"
                    ? isDark
                      ? "bg-white text-[#252525] rounded-tr-sm"
                      : "bg-[#252525] text-white rounded-tr-sm"
                    : isDark
                      ? "bg-[#252525] text-white border border-[#545454] rounded-tl-sm"
                      : "bg-[#F0EDE8] text-[#252525] rounded-tl-sm"
                  }`}
                >
                  {displayContent ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 scrollbar-hide">
                            <table className={`min-w-full border-collapse border text-left text-xs ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead className={isDark ? "bg-[#333]" : "bg-[#252525]/5"} {...props} />
                        ),
                        th: ({ node, ...props }) => (
                          <th className={`px-3 py-2 border font-bold ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className={`px-3 py-2 border ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc ml-4 space-y-1 my-2" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal ml-4 space-y-1 my-2" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        code: ({ node, ...props }) => (
                          <code className={`px-1 py-0.5 rounded font-mono text-[11px] ${isDark ? "bg-white/10" : "bg-black/5"}`} {...props} />
                        )
                      }}
                    >
                      {displayContent}
                    </ReactMarkdown>
                  ) : (
                    <span className="inline-flex gap-1 items-center text-[#BABABA]">
                      <span className="animate-bounce delay-0">·</span>
                      <span className="animate-bounce delay-75">·</span>
                      <span className="animate-bounce delay-150">·</span>
                    </span>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDark ? "bg-white/10 border border-white/20" : "bg-[#252525]/10 border border-[#252525]/20"}`}>
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className={`p-3 sm:p-4 border-t transition-colors ${isDark ? "border-[#333]" : "border-[#E8E5E0]"}`}>
        <div className={`flex items-end gap-2 p-2 rounded-xl border transition-colors
          ${isDark ? "bg-[#1A1A1A] border-[#333]" : "bg-[#F0EDE8] border-[#E8E5E0]"}`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or discuss the material…"
            rows={1}
            disabled={isLoading || isStarting}
            className="flex-1 bg-transparent px-2 py-1.5 outline-none resize-none max-h-32 text-sm text-[#252525] dark:text-white placeholder-[#9E9E9E] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isStarting}
            className={`p-2.5 rounded-lg transition-all active:scale-95 shrink-0 disabled:opacity-40
              ${isDark ? "bg-white text-[#252525] hover:bg-white/90" : "bg-[#252525] text-white hover:bg-[#1A1A1A]"}`}
          >
            {isLoading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
        <p className={`text-[10px] mt-1.5 px-2 ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
