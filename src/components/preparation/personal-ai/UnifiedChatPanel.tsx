"use client";

import React, {
  useState, useRef, useEffect, useCallback,
} from "react";
import {
  Send, Sparkles, User, AlertCircle, CheckCircle2,
  Loader2, Mic, Volume2, StopCircle, MicOff,
  Maximize2, Minimize2, Trash2, VolumeX, Plus, X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "chat" | "voice";
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
  inputType?: "text" | "voice"; // subtle mic icon for voice inputs
}

interface Props {
  mode: Mode;
  noteTitle: string;
  noteId?: string | null;
  noteContent: string;
  isPdf: boolean;
  isFocusMode?: boolean;
  onFocusModeChange?: (val: boolean) => void;
  sessionId?: string | null;
  onSessionCreated?: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMessageType(content: string): "correction" | "correct" | "normal" {
  const t = content.trimStart();
  if (t.startsWith("[CORRECTION]")) return "correction";
  if (t.startsWith("[CORRECT]")) return "correct";
  return "normal";
}

function cleanContent(content: string): string {
  return content
    .replace(/^\[CORRECTION\]\n?/i, "")
    .replace(/^\[CORRECT\]\n?/i, "")
    .trim();
}

/** Parse newline-delimited JSON stream */
async function* streamReader(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        const p = JSON.parse(t);
        if (p?.message?.content) yield p.message.content as string;
      } catch {
        yield t;
      }
    }
  }
  if (buffer.trim()) {
    try {
      const p = JSON.parse(buffer.trim());
      if (p?.message?.content) yield p.message.content as string;
    } catch {
      yield buffer.trim();
    }
  }
}

/** Strip markdown for TTS */
function cleanForSpeech(text: string): string {
  return text
    .replace(/^\[CORRECTION\]\n?/i, "")
    .replace(/^\[CORRECT\]\n?/i, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/\|[^|\n]+/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

/** Detect if text contains Devanagari (Hindi) characters */
function isHindi(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UnifiedChatPanel({
  mode, noteTitle, noteId, noteContent, isPdf, isFocusMode = false, onFocusModeChange,
  sessionId, onSessionCreated
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Core state ───────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);
  const [technicalError, setTechnicalError] = useState<string | null>(null);

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const transcriptRef = useRef("");
  const modeRef = useRef<Mode>(mode);
  const justCreatedRef = useRef(false);

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Browser API check ────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setVoiceSupported(ok);
    if (ok) synthRef.current = window.speechSynthesis;
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ─── Fetch Session ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    // Skip fetching if the session was just locally created
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    const fetchSession = async () => {
      try {
        setMessages([]); // Clear previous session messages immediately for instant feedback
        setIsLoading(true);
        const res = await fetch(`/api/personal-ai/sessions/${sessionId}`);
        if (res.ok) {
          const json = await res.json();
          const sessData = json.data;
          if (sessData?.session && sessData.session.messages) {
            setMessages(sessData.session.messages);
            setIsStarting(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch session", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // ─── Stream AI Response ───────────────────────────────────────────────────

  const streamResponse = useCallback(async (
    conversationMessages: Message[],
    opts: { isInit?: boolean; speakOnDone?: boolean } = {}
  ) => {
    const { isInit = false, speakOnDone = false } = opts;
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

      // Add empty AI bubble
      if (isInit) {
        setMessages([...conversationMessages, { role: "assistant", content: "" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      }

      let fullText = "";
      setVoiceState(speakOnDone ? "thinking" : "idle");

      for await (const chunk of streamReader(res.body)) {
        fullText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
      }

      // Speak in voice mode
      if (speakOnDone && modeRef.current === "voice" && fullText) {
        speakText(fullText, () => {
          // Auto-restart mic after speaking
          setTimeout(() => {
            if (modeRef.current === "voice") startListening();
          }, 500);
        });
      } else {
        setVoiceState("idle");
      }
      // ─── Save Session ───────────────────────────────────────────────────────
      const finalMessages = isInit
        ? [...conversationMessages, { role: "assistant", content: fullText }]
        : [...conversationMessages, { role: "assistant", content: fullText }];
        
      if (sessionId) {
        fetch(`/api/personal-ai/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: finalMessages })
        }).catch(console.error);
      } else if (onSessionCreated) {
        const title = noteTitle || "Study Session";
        fetch("/api/personal-ai/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId, title, messages: finalMessages })
        })
          .then(res => res.json())
          .then(json => {
            if (json.data?.session?.id) {
              justCreatedRef.current = true; // Mark as just created to skip redundant history fetch
              onSessionCreated(json.data.session.id);
            }
          })
          .catch(console.error);
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      const msg = err.message || "Something went wrong.";
      setTechnicalError(msg);
      setVoiceState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [noteTitle, noteContent, isPdf, sessionId, noteId, onSessionCreated]);

  // ─── Auto-start session ───────────────────────────────────────────────────

  useEffect(() => {
    // If we have a sessionId, we are loading an existing session, do not auto-start
    if (sessionId) return;
    
    setMessages([]);
    setIsStarting(true);
    setVoiceState("idle");
    setTranscript("");
    setTechnicalError(null);
    synthRef.current?.cancel();
    recognitionRef.current?.abort();

    const init = async () => {
      const initMsgs: Message[] = [{ role: "user", content: "SESSION_START" }];
      await streamResponse(initMsgs, { isInit: true, speakOnDone: false });
      setIsStarting(false);
    };
    init();
    return () => abortRef.current?.abort();
  }, [noteTitle, noteContent, sessionId]); // re-init when note changes and no session is selected

  // ─── TTS ──────────────────────────────────────────────────────────────────

  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();

    const spokenText = cleanForSpeech(text);
    if (!spokenText) { onEnd?.(); return; }

    const hindi = isHindi(spokenText);
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = hindi ? "hi-IN" : "en-US";
    utterance.rate = hindi ? 0.88 : 0.93;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const pickVoice = () => {
      const voices = synthRef.current!.getVoices();
      const preferred = hindi
        ? voices.find((v) =>
            v.name.includes("Google हिन्दी") ||
            v.name.includes("Google Hindi") ||
            v.name.includes("Lekha") ||
            v.lang.startsWith("hi"))
        : voices.find((v) =>
            v.name.includes("Google US English") ||
            v.name.includes("Samantha") ||
            v.name.includes("Natural") ||
            (v.lang === "en-US" && !v.name.includes("eSpeak")));
      if (preferred) utterance.voice = preferred;
    };

    pickVoice();
    if (synthRef.current.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice, { once: true });
    }

    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => { setVoiceState("idle"); onEnd?.(); };
    utterance.onerror = () => { setVoiceState("idle"); onEnd?.(); };

    synthRef.current.speak(utterance);
  }, []);

  // ─── Speech Recognition ───────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || !voiceSupported) return;
    if (voiceState === "speaking" || voiceState === "thinking") return;

    setTranscript("");
    transcriptRef.current = "";
    setVoiceState("listening");

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new API();
    recognitionRef.current = recognition;

    // Multi-language: try hi-IN first so both languages are captured
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      setTranscript(text);
      transcriptRef.current = text;
    };

    recognition.onend = () => {
      const spoken = transcriptRef.current.trim();
      if (spoken.length > 1) {
        const userMsg: Message = {
          role: "user",
          content: spoken,
          inputType: "voice",
        };
        setMessages((prev) => [...prev, userMsg]);
        setTranscript("");
        streamResponse([...messages, userMsg], { speakOnDone: true });
      } else {
        setVoiceState("idle");
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") {
        console.error("Speech recognition error:", e.error);
      }
      setVoiceState("idle");
    };

    recognition.start();
  }, [voiceSupported, voiceState, messages, streamResponse]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.abort();
    synthRef.current?.cancel();
    abortRef.current?.abort();
    setVoiceState("idle");
    setTranscript("");
    setIsLoading(false);
  }, []);

  // ─── Auto-start mic when entering voice mode ──────────────────────────────

  useEffect(() => {
    if (mode === "voice" && !isStarting && voiceState === "idle" && messages.length > 0) {
      // Small delay to let mode UI finish animating
      const t = setTimeout(() => {
        if (modeRef.current === "voice") startListening();
      }, 600);
      return () => clearTimeout(t);
    }
    if (mode === "chat") {
      // Stop voice when switching to chat
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
      setVoiceState("idle");
      setTranscript("");
    }
  }, [mode]); // Only fire on mode change

  // ─── Text mode send ───────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || isStarting) return;
    const userMsg: Message = { role: "user", content: input.trim(), inputType: "text" };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await streamResponse(updated);
  }, [input, isLoading, isStarting, messages, streamResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
  };

  // ─── Voice state config ───────────────────────────────────────────────────

  const voiceCfg: Record<VoiceState, {
    label: string; ringClass: string; btnClass: string; icon: React.ReactNode;
  }> = {
    idle: {
      label: "Tap to speak",
      ringClass: "",
      btnClass: isDark
        ? "bg-white text-[#252525] hover:bg-white/90"
        : "bg-[#252525] text-white hover:bg-[#1A1A1A]",
      icon: <Mic className="w-6 h-6" />,
    },
    listening: {
      label: "Listening…",
      ringClass: "bg-blue-400/25",
      btnClass: "bg-blue-500 text-white",
      icon: <Mic className="w-6 h-6" />,
    },
    thinking: {
      label: "Thinking…",
      ringClass: "bg-[#C2A27A]/25",
      btnClass: "bg-[#C2A27A] text-white",
      icon: <Loader2 className="w-6 h-6 animate-spin" />,
    },
    speaking: {
      label: "Speaking…",
      ringClass: "bg-emerald-400/25",
      btnClass: "bg-emerald-500 text-white",
      icon: <Volume2 className="w-6 h-6" />,
    },
  };

  const vc = voiceCfg[voiceState];
  const isVoiceActive = voiceState !== "idle";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
      
      {/* ── Focus Mode Toggle (Enter Only) ────────────────────────── */}
      {!isFocusMode && (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-30">
          <button
            onClick={() => onFocusModeChange?.(true)}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shrink-0
              ${isDark 
                ? "bg-[#252525]/80 border border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]" 
                : "bg-white/80 border border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#F0EDE8]"}`}
            title="Enter Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* ── Message Bubbles ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-5 pb-32 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col pt-4 space-y-3 sm:space-y-6">

        {/* Case A: New Session Initialization (Show Reading Status) */}
        {isStarting && messages.length === 0 && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
              ${isDark ? "bg-[#252525] border border-[#545454]" : "bg-[#F0EDE8] border border-[#7D7D7D]/30"}`}>
              <Sparkles className="w-4 h-4 text-[#C2A27A]" />
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex items-center gap-2
              ${isDark ? "bg-[#252525] text-white border border-[#545454]" : "bg-[#F0EDE8] text-[#252525]"}`}>
              <Loader2 className="w-4 h-4 animate-spin text-[#C2A27A]" />
              <span className="text-[#7D7D7D]">Reading your {isPdf ? "PDF" : "note"}…</span>
            </div>
          </div>
        )}

        {/* Case B: Resuming Existing Session (Show Skeleton Loader) */}
        {!isStarting && isLoading && messages.length === 0 && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* AI Skeleton 1 */}
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-full shrink-0 animate-pulse ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`} />
              <div className="flex flex-col gap-2 w-full max-w-[70%]">
                <div className={`h-4 rounded-lg animate-pulse w-3/4 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`} />
                <div className={`h-4 rounded-lg animate-pulse w-1/2 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`} />
              </div>
            </div>
            {/* User Skeleton */}
            <div className="flex gap-3 justify-end">
              <div className="flex flex-col gap-2 w-full max-w-[60%] items-end">
                <div className={`h-4 rounded-lg animate-pulse w-3/4 ${isDark ? "bg-white/10" : "bg-[#252525]/10"}`} />
              </div>
              <div className={`w-8 h-8 rounded-full shrink-0 animate-pulse ${isDark ? "bg-white/10" : "bg-[#252525]/10"}`} />
            </div>
          </div>
        )}

        {/* Message list */}
        {messages
          .filter((m) => !(m.role === "user" && m.content === "SESSION_START"))
          .map((msg, idx) => {
            const msgType = msg.role === "assistant" ? parseMessageType(msg.content) : "normal";
            const display = msg.role === "assistant" ? cleanContent(msg.content) : msg.content;

            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {/* AI Avatar */}
                {msg.role === "assistant" && (
                  <div className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center shrink-0 mt-1
                    ${isDark ? "bg-[#252525] border border-[#545454]" : "bg-[#F0EDE8] border border-[#7D7D7D]/30"}`}>
                    <Sparkles className="w-3.5 h-3.5 text-[#C2A27A]" />
                  </div>
                )}

                <div className={`flex flex-col gap-1 max-w-[95%] sm:max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {/* Correction / Correct badge */}
                  {msg.role === "assistant" && msgType !== "normal" && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit
                      ${msgType === "correction"
                        ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                      {msgType === "correction"
                        ? <><AlertCircle size={10} /> Correction</>
                        : <><CheckCircle2 size={10} /> Correct!</>}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all duration-200
                    ${msg.role === "user"
                      ? isDark
                        ? "bg-white text-[#252525] rounded-tr-sm"
                        : "bg-[#252525] text-white rounded-tr-sm"
                      : isDark
                        ? "bg-[#252525] text-white border border-[#545454] rounded-tl-sm"
                        : "bg-[#F0EDE8] text-[#252525] rounded-tl-sm"}`}>

                    {/* Voice mic indicator for user voice messages */}
                    {msg.role === "user" && msg.inputType === "voice" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-50 mr-1.5">
                        <Mic className="w-2.5 h-2.5" />
                      </span>
                    )}

                    {display ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ ...props }) => (
                            <div className="overflow-x-auto my-3 scrollbar-hide">
                              <table className={`min-w-full border-collapse border text-left text-xs
                                ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => (
                            <thead className={isDark ? "bg-[#333]" : "bg-[#252525]/5"} {...props} />
                          ),
                          th: ({ ...props }) => (
                            <th className={`px-3 py-2 border font-bold
                              ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                          ),
                          td: ({ ...props }) => (
                            <td className={`px-3 py-2 border
                              ${isDark ? "border-[#545454]" : "border-[#7D7D7D]/30"}`} {...props} />
                          ),
                          ul: ({ ...props }) => <ul className="list-disc ml-4 space-y-1 my-2" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal ml-4 space-y-1 my-2" {...props} />,
                          p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          code: ({ ...props }) => (
                            <code className={`px-1 py-0.5 rounded font-mono text-[11px]
                              ${isDark ? "bg-white/10" : "bg-black/5"}`} {...props} />
                          ),
                        }}
                      >
                        {display}
                      </ReactMarkdown>
                    ) : (
                      <span className="inline-flex gap-1 items-center text-[#BABABA]">
                        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.role === "user" && (
                  <div className={`hidden sm:flex w-7 h-7 rounded-full items-center justify-center shrink-0 mt-1
                    ${isDark ? "bg-white/10 border border-white/20" : "bg-[#252525]/10 border border-[#252525]/20"}`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>



      {/* ── Input Area ────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Subtle gradient to mask scroll behind bar */}
        <div className={`absolute inset-0 pointer-events-none h-16 bottom-0 top-auto translate-y-0 ${
          isDark 
            ? "bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/95 to-transparent" 
            : "bg-gradient-to-t from-white via-white/95 to-transparent"
        }`} />
        
        <div className="max-w-4xl mx-auto w-full relative z-10 px-4 sm:px-6 pb-2 pt-0">
          
          {/* Integrated Technical Error Banner */}
          {technicalError && (
            <div className="mb-2">
              <div className={`p-2.5 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm
                ${isDark ? "bg-red-900/40 border border-red-500/30" : "bg-red-50 border border-red-200"}`}>
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">System Error</p>
                    <button onClick={() => setTechnicalError(null)} className="text-[#7D7D7D] hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                  <p className={`text-xs leading-relaxed truncate-3-lines ${isDark ? "text-red-200/90" : "text-red-700 font-medium"}`}>
                    {technicalError.includes("429") 
                      ? "You've reached the free API limit. Please wait a moment."
                      : technicalError}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <button 
                      onClick={() => {
                        setTechnicalError(null);
                        const lastMsgs = [...messages];
                        if (lastMsgs.length > 0) streamResponse(lastMsgs, { speakOnDone: mode === "voice" });
                      }}
                      className="text-[10px] font-bold underline text-red-500 hover:text-red-600 uppercase"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ── TEXT MODE ── */}
          {mode === "chat" && (
            <div className="pt-1 pb-0 sm:p-4">
              <div className={`relative flex items-center w-full transition-all duration-300
                ${isDark 
                  ? "bg-[#252525] border-[#333] focus-within:border-[#C2A27A]/40" 
                  : "bg-white border-[#E5E5E5] focus-within:border-[#252525]/20"}
                border rounded-full min-h-[52px] px-3
              `}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything"
                  rows={1}
                  disabled={isLoading || isStarting}
                  className="flex-1 bg-transparent px-3 py-3 outline-none resize-none max-h-48 text-[15px]
                    text-[#252525] dark:text-white placeholder-[#9E9E9E] disabled:opacity-50 transition-all font-medium"
                />
                
                <div className="flex items-center pr-1">
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isStarting}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-95
                      ${!input.trim() || isLoading || isStarting
                        ? (isDark ? "bg-[#333] text-[#555]" : "bg-[#F5F5F5] text-[#BABABA]")
                        : (isDark ? "bg-white text-[#252525] hover:bg-neutral-100" : "bg-[#252525] text-white hover:bg-[#1A1A1A]")
                      }`}
                  >
                    {isLoading
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Send size={16} className={input.trim() ? "translate-x-0.5" : ""} />}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* ── VOICE MODE ── */}
        {mode === "voice" && (
          <div className="p-4 sm:p-5 flex flex-col items-center gap-3">

            {/* Unsupported browser */}
            {!voiceSupported && (
              <div className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl
                ${isDark ? "bg-red-900/20 text-red-400" : "bg-red-50 text-red-600"}`}>
                <MicOff className="w-4 h-4 shrink-0" />
                Voice not supported. Use Chrome or Edge.
              </div>
            )}

            {voiceSupported && (
              <>
                {/* Live transcript preview */}
                {voiceState === "listening" && transcript && (
                  <div className={`w-full max-w-sm px-4 py-2.5 rounded-xl text-sm text-center italic animate-in fade-in duration-200
                    ${isDark
                      ? "bg-[#252525] border border-blue-500/30 text-white/70"
                      : "bg-blue-50 text-[#252525]/70 border border-blue-200"}`}>
                    "{transcript}"
                  </div>
                )}

                {/* Orb + controls row */}
                <div className="flex items-center gap-4">

                  {/* Stop button (shown when active) */}
                  {isVoiceActive && (
                    <button
                      onClick={stopAll}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors
                        ${isDark
                          ? "bg-white/5 hover:bg-white/10 text-[#BABABA]"
                          : "bg-black/5 hover:bg-black/10 text-[#545454]"}`}
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      Stop
                    </button>
                  )}

                  {/* Mic orb */}
                  <div className="relative flex items-center justify-center">
                    {/* Pulse rings */}
                    {isVoiceActive && (
                      <>
                        <div className={`absolute w-20 h-20 rounded-full ${vc.ringClass} animate-ping opacity-50`} />
                        <div
                          className={`absolute w-16 h-16 rounded-full ${vc.ringClass} animate-ping opacity-70`}
                          style={{ animationDelay: "300ms" }}
                        />
                      </>
                    )}

                    <button
                      onClick={() => {
                        if (isVoiceActive) stopAll();
                        else startListening();
                      }}
                      disabled={isLoading || isStarting}
                      className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center
                        shadow-lg transition-all duration-200 active:scale-95 focus:outline-none
                        ${vc.btnClass}
                        ${isLoading || isStarting ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                      title={isVoiceActive ? "Stop" : "Start speaking"}
                    >
                      {vc.icon}
                    </button>
                  </div>

                  {/* Spacer for symmetry when stop button shown */}
                  {isVoiceActive && <div className="w-[72px]" />}
                </div>

                {/* State label */}
                <p className={`text-xs font-semibold text-center ${
                  voiceState === "listening" ? "text-blue-500"
                  : voiceState === "speaking" ? "text-emerald-500"
                  : voiceState === "thinking" ? "text-[#C2A27A]"
                  : isDark ? "text-[#545454]" : "text-[#BABABA]"
                }`}>
                  {vc.label}
                  {voiceState === "idle" && (
                    <span className={`block text-[10px] font-normal mt-0.5 ${isDark ? "text-[#3A3A3A]" : "text-[#D0CCC7]"}`}>
                      Tap to speak · Auto-detects Hindi & English
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
