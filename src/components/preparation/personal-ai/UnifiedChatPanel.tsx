"use client";

import React, {
  useState, useRef, useEffect, useCallback,
} from "react";
import {
  Send, Sparkles, User, AlertCircle, CheckCircle2,
  Loader2, Mic, Volume2, StopCircle, MicOff,
  Maximize2, Minimize2, Trash2, VolumeX, Plus, X, Crown, ArrowRight, Square,
  Copy, Check, ChevronDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "chat" | "voice";
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
  inputType?: "text" | "voice"; // subtle mic icon for voice inputs
  isThinking?: boolean;
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
      if (!line) continue;
      try {
        const p = JSON.parse(line);
        if (p?.message?.content) yield p.message.content as string;
      } catch {
        yield line;
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
  const { openSettings } = useSettings();
  const isDark = theme === "dark";

  // ── Core state ───────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(!!sessionId);
  const [isStarting, setIsStarting] = useState(!sessionId); // Only starting if no session exists yet
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); // Used for smooth transitions
  const [technicalError, setTechnicalError] = useState<string | null>(null);

  // ── Voice state ──────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [audioLevel, setAudioLevel]  = useState(0); // 0–1 for orb glow visualization
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const justCreatedRef = useRef(false);

  const thinkingMessages = [
    "Thinking...",
    "Analyzing your context...",
    "Extracting key information...",
    "Synthesizing an answer...",
    "Applying advanced reasoning...",
    "Reviewing relevant topics...",
    "Generating a detailed response...",
    "Formulating helpful points..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading || isStarting || isHistoryLoading) {
      setThinkingIdx(0);
      interval = setInterval(() => {
        setThinkingIdx((prev) => (prev + 1) % thinkingMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading, isStarting, isHistoryLoading]);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const synthRef         = useRef<SpeechSynthesis | null>(null);
  const transcriptRef    = useRef("");
  const modeRef          = useRef<Mode>(mode);
  const messagesRef      = useRef<Message[]>([]); // always-fresh snapshot (avoids stale closures)
  const isSwitchingFocus = useRef(false);
  const savedScrollPos   = useRef(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  // MediaRecorder-based voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef   = useRef<MediaStream | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const animFrameRef     = useRef<number | null>(null);

  // Keep modeRef and messagesRef in sync with latest state
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Browser API check (MediaRecorder + TTS) ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Check MediaRecorder support (replaces Web Speech API)
    const ok =
      typeof MediaRecorder !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function";
    setVoiceSupported(ok);
    // Initialize TTS + pre-warm voice list
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      window.speechSynthesis.getVoices(); // trigger async voice load
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    // Don't auto-scroll if we are currently switching focus modes to avoid fighting the scroll preservation
    if (isSwitchingFocus.current) return;

    if (messagesEndRef.current && chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      
      if (isLoading || isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, isLoading]);

  // ── Preserve scroll on Focus Mode toggle ────────────────────────────────
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      // Store distance from bottom
      savedScrollPos.current = container.scrollHeight - container.scrollTop;
      isSwitchingFocus.current = true;

      // Restore position after the layout transition starts to settle
      // We use a few frames to ensure the new width is calculated
      const restore = () => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight - savedScrollPos.current;
          isSwitchingFocus.current = false;
        }
      };

      const timer = setTimeout(restore, 100);
      return () => clearTimeout(timer);
    }
  }, [isFocusMode]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
      synthRef.current?.cancel();
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ── Scroll Listener for 'Scroll to Bottom' button ──────────────────────
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button if we are more than 300px away from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
      setShowScrollDown(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages]); // Re-check when messages change

  // ─── Fetch Session ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    // Skip fetching if the session was just locally created
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    const controller = new AbortController();
    const fetchSession = async () => {
      try {
        setMessages([]); // Clear previous session messages immediately
        setIsHistoryLoading(true);
        setIsStarting(false); // We are no longer starting a new session
        setIsLoading(true);
        const res = await fetch(`/api/personal-ai/sessions/${sessionId}`, {
          signal: controller.signal
        });
        if (res.ok) {
          const json = await res.json();
          const sessData = json.data;
          if (sessData?.session && sessData.session.messages) {
            setMessages(sessData.session.messages);
            setIsStarting(false);
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Failed to fetch session", e);
        }
      } finally {
        setIsLoading(false);
        setIsHistoryLoading(false);
      }
    };
    fetchSession();
    return () => controller.abort();
  }, [sessionId]);

  // Laptop-only: Always keep input active when not loading
  useEffect(() => {
    if (!isLoading && !isStarting && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      textareaRef.current?.focus();
    }
  }, [isLoading, isStarting]);

  // ─── Stream AI Response ───────────────────────────────────────────────────

  const streamResponse = useCallback(async (
    conversationMessages: Message[],
    opts: { isInit?: boolean; speakOnDone?: boolean; detectedLang?: string } = {}
  ) => {
    const { isInit = false, speakOnDone = false, detectedLang = "en" } = opts;
    setIsLoading(true);
    abortRef.current = new AbortController();

    // Optimistically add thinking bubble
    if (isInit) {
      setMessages([{ role: "assistant", content: "", isThinking: true }]);
    } else {
      setMessages(prev => [...prev, { role: "assistant", content: "", isThinking: true }]);
    }

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

      // Clear thinking state as we start streaming
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { ...updated[updated.length - 1], isThinking: false };
        }
        return updated;
      });

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
        speakText(fullText, detectedLang, () => {
          // Auto-restart mic after speaking
          setTimeout(() => {
            if (modeRef.current === "voice") startListening();
          }, 500);
        });
      } else {
        setVoiceState("idle");
      }
      // ─── Save Session ───────────────────────────────────────────────────────
      const finalMessages = [...conversationMessages, { role: "assistant", content: fullText }];
        
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
    // (recognitionRef removed — now using MediaRecorder)

    const init = async () => {
      const initMsgs: Message[] = [{ role: "user", content: "SESSION_START" }];
      await streamResponse(initMsgs, { isInit: true, speakOnDone: false });
      setIsStarting(false);
    };
    init();
    return () => abortRef.current?.abort();
  }, [noteTitle, noteContent, sessionId]); // re-init when note changes and no session is selected

  // ─── TTS ─ Premium voice selection + sentence-chunked delivery ────────────

  /** Pick the best available non-robotic voice for the given language */
  const pickBestVoice = (voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null => {
    if (lang === "hi") {
      return (
        voices.find(v => v.name.includes("Google हिन्दी")) ||
        voices.find(v => v.name.includes("Lekha")) ||
        voices.find(v => v.lang === "hi-IN" && !v.localService) ||
        voices.find(v => v.lang.startsWith("hi")) ||
        null
      );
    }
    // English priority: neural > online > local fallback
    return (
      voices.find(v => v.name === "Google UK English Male") ||
      voices.find(v => v.name.includes("Microsoft Mark Online")) ||
      voices.find(v => v.name.includes("Microsoft David Online")) ||
      voices.find(v => v.name === "Google US English") ||
      voices.find(v =>
        v.name.includes("Natural") &&
        !v.localService &&
        v.lang.startsWith("en") &&
        !v.name.toLowerCase().includes("female")
      ) ||
      voices.find(v => !v.localService && v.lang === "en-US") ||
      voices.find(v => v.lang === "en-US") ||
      voices.find(v => v.lang.startsWith("en")) ||
      null
    );
  };

  const speakText = useCallback((text: string, lang: string = "en", onEnd?: () => void) => {
    if (!synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();

    const cleaned = cleanForSpeech(text);
    if (!cleaned.trim()) { onEnd?.(); return; }

    // Auto-detect language if mixed or unknown (fall back to script detection)
    const effectiveLang = (lang === "mixed" || !lang) ? (isHindi(cleaned) ? "hi" : "en") : lang;

    // Split into sentence-sized chunks for natural delivery rhythm
    const sentences = cleaned
      .split(/(?<=[.!?।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (sentences.length === 0) { onEnd?.(); return; }

    setVoiceState("speaking");

    const speakNext = (index: number) => {
      if (index >= sentences.length || modeRef.current === "chat") {
        setVoiceState("idle");
        onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[index]);
      utterance.lang   = effectiveLang === "hi" ? "hi-IN" : "en-US";
      utterance.rate   = effectiveLang === "hi" ? 0.85 : 0.88;  // slightly slower = clearer
      utterance.pitch  = effectiveLang === "hi" ? 1.0  : 0.92;  // lower pitch = authoritative male
      utterance.volume = 1.0;

      // Apply best available voice (retry if voices not yet loaded)
      const applyBestVoice = () => {
        const voices = synthRef.current!.getVoices();
        const best = pickBestVoice(voices, effectiveLang);
        if (best) utterance.voice = best;
      };
      applyBestVoice();
      if (synthRef.current!.getVoices().length === 0) {
        window.speechSynthesis.addEventListener("voiceschanged", applyBestVoice, { once: true });
      }

      utterance.onend   = () => speakNext(index + 1);
      utterance.onerror = () => { setVoiceState("idle"); onEnd?.(); };

      synthRef.current!.speak(utterance);
    };

    speakNext(0);
  }, []);

  // ─── Voice Recording (Gemini-powered, MediaRecorder) ──────────────────────

  const startListening = useCallback(async () => {
    if (!voiceSupported) return;
    if (voiceState === "speaking" || voiceState === "thinking" || voiceState === "listening") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      setVoiceState("listening");
      setTranscript("");

      // ── Silence detection via AudioContext analyser ──────────────────────
      const audioCtx = new AudioContext();
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const dataArray     = new Uint8Array(analyser.frequencyBinCount);
      let silenceStartMs: number | null = null;
      let hasSpoken       = false;

      const monitorAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const rms = dataArray.reduce((s, v) => s + v, 0) / dataArray.length;
        setAudioLevel(Math.min(rms / 25, 1));

        if (rms > 10) {
          hasSpoken      = true;
          silenceStartMs = null;
        } else if (hasSpoken) {
          if (!silenceStartMs) silenceStartMs = Date.now();
          if (Date.now() - silenceStartMs > 1500) { // 1.5 s of silence → auto-stop
            audioCtx.close();
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
            return;
          }
        }
        animFrameRef.current = requestAnimationFrame(monitorAudio);
      };
      animFrameRef.current = requestAnimationFrame(monitorAudio);

      // ── MediaRecorder setup ───────────────────────────────────────────────
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
        .find(t => MediaRecorder.isTypeSupported(t)) || "";
      const recorder  = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
        setAudioLevel(0);

        const mimeType  = preferred || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 2000) { setVoiceState("idle"); return; }

        setVoiceState("thinking");
        setTranscript("Transcribing…");

        try {
          const fd = new FormData();
          fd.append("audio", audioBlob, `rec.${mimeType.split("/")[1].split(";")[0]}`);
          fd.append("noteTitle", noteTitle);

          const res  = await fetch("/api/personal-ai/transcribe", { method: "POST", body: fd });
          const json = await res.json();

          if (!res.ok) {
            const msg = res.status === 429
              ? "Voice quota exceeded. Please wait a moment and try again."
              : (json.error || "Transcription failed. Please try again.");
            setTechnicalError(msg);
            setVoiceState("idle");
            setTranscript("");
            return;
          }

          const { transcript: spoken, language: detectedLang } = json;

          if (!spoken) { setVoiceState("idle"); setTranscript(""); return; }

          setTranscript(spoken);
          const userMsg: Message = { role: "user", content: spoken, inputType: "voice" };
          setMessages(prev => [...prev, userMsg]);
          setTranscript("");
          streamResponse([...messagesRef.current, userMsg], { speakOnDone: true, detectedLang });
        } catch (err: any) {
          console.error("Transcription error:", err);
          setTechnicalError("Voice transcription failed. Please try again.");
          setVoiceState("idle");
          setTranscript("");
        }
      };

      recorder.start(250);
    } catch (err: any) {
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      setTechnicalError(
        isDenied
          ? "Microphone access denied. Please allow it in your browser settings."
          : `Could not start recording: ${err.message}`
      );
      setVoiceState("idle");
    }
  }, [voiceSupported, voiceState, streamResponse, noteTitle]);

  const stopAll = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null; }
    synthRef.current?.cancel();
    abortRef.current?.abort();
    setVoiceState("idle"); setTranscript(""); setAudioLevel(0); setIsLoading(false);
  }, []);

  // ─── Auto-start mic when entering voice mode ───────────────────────────

  useEffect(() => {
    if (mode === "chat") {
      // Full cleanup when switching to text chat
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null; }
      synthRef.current?.cancel();
      setVoiceState("idle"); setTranscript(""); setAudioLevel(0);
    }
  }, [mode]);

  // ─── Text mode send ───────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || isStarting) return;
    const userMsg: Message = { role: "user", content: input.trim(), inputType: "text" };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    // Laptop-only: Keep keyboard active after sending
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      textareaRef.current?.focus();
    }
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeBlock(code);
    setTimeout(() => setCopiedCodeBlock(null), 2000);
  };

  // ─── Voice state config ───────────────────────────────────────────────────

  const voiceCfg: Record<VoiceState, {
    label: string; ringClass: string; btnClass: string; icon: React.ReactNode;
  }> = {
    idle: {
      label: "Voice Transcription",
      ringClass: "",
      btnClass: isDark
        ? "bg-[#2A2A2A] text-[#4A4A4A] cursor-not-allowed"
        : "bg-[#F0F0F0] text-[#BABABA] cursor-not-allowed",
      icon: (
        <span className="relative flex items-center justify-center w-6 h-6">
          <Mic className="w-6 h-6" />
          {/* Diagonal cross line */}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="block w-[2px] h-8 bg-red-500/80 rounded-full"
              style={{ transform: "rotate(45deg) translateY(-1px)" }} />
          </span>
        </span>
      ),
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
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar px-1 sm:px-4 pb-32"
      >
        <div className="flex flex-col pt-4 space-y-3 sm:space-y-6">

        {/* Case A: New Session Initialization (Show Reading Status) */}
        {isStarting && messages.length === 0 && (
          <div className="flex gap-3 md:gap-4 max-w-4xl min-w-0 mx-auto w-full px-3 md:px-4 animate-in fade-in duration-300">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <motion.img 
                src={isDark ? "/icon-dark.png" : "/icon-light.png"} 
                alt="AI" 
                className="w-8 h-8 object-contain" 
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.7, 1],
                  filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            <div className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex items-center gap-2
              ${isDark ? "bg-[#252525] text-white border border-[#545454]" : "bg-[#F0EDE8] text-[#252525]"}`}>
              <Loader2 className="w-4 h-4 animate-spin text-[#C2A27A]" />
              <span className="text-[#7D7D7D]">{isStarting ? (isPdf ? "Reading your PDF..." : "Reading your note...") : thinkingMessages[thinkingIdx % thinkingMessages.length]}</span>
            </div>
          </div>
        )}

        {/* Case B: Resuming Existing Session (Show Skeleton Loader) */}
        {((!isStarting && isLoading && messages.length === 0) || isHistoryLoading) && (
          <div className="flex-1 flex flex-col space-y-6 py-6 opacity-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-3 md:gap-4 max-w-4xl min-w-0 mx-auto w-full px-3 md:px-4 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                
                {/* AI Avatar Skeleton */}
                {i % 2 !== 0 && (
                  <div className={`hidden sm:flex w-10 h-10 rounded-full shrink-0 animate-pulse mt-0.5 ${isDark ? "bg-[#333]" : "bg-[#E8E5E0]"}`} />
                )}

                {/* Bubble Skeleton */}
                <div className={`flex flex-col gap-2 w-full animate-pulse px-4 py-4 ${i % 2 === 0 ? "max-w-md rounded-2xl rounded-tr-sm items-end " + (isDark ? "bg-[#333]" : "bg-[#E8E5E0]") : "md:w-[calc(100%-48px)] rounded-2xl rounded-tl-sm items-start " + (isDark ? "bg-[#252525] border border-[#333]" : "bg-[#F0EDE8]")}`}>
                  <div className={`h-3 rounded-full w-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
                  <div className={`h-3 rounded-full w-5/6 ${isDark ? "bg-white/10" : "bg-black/10"}`} />
                  {i % 2 !== 0 && <div className={`h-3 rounded-full w-4/6 ${isDark ? "bg-white/10" : "bg-black/10"}`} />}
                </div>

                {/* User Avatar Skeleton */}
                {i % 2 === 0 && (
                  <div className={`hidden sm:flex w-8 h-8 rounded-full shrink-0 animate-pulse mt-1 ${isDark ? "bg-[#333]" : "bg-[#E8E5E0]"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message list */}
        {(() => {
          const filteredMessages = messages.filter((m) => !(m.role === "user" && m.content === "SESSION_START"));
          return filteredMessages.map((msg, idx) => {
            const msgType = msg.role === "assistant" ? parseMessageType(msg.content) : "normal";
            const display = msg.role === "assistant" ? cleanContent(msg.content) : msg.content;
            const isLast = idx === filteredMessages.length - 1;

            return (
              <div
                key={idx}
                className={`group flex gap-3 md:gap-4 max-w-4xl min-w-0 mx-auto w-full px-3 md:px-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* AI Avatar */}
                {msg.role === "assistant" && (
                  <div className="hidden sm:flex w-10 h-10 items-center justify-center shrink-0 mt-0.5">
                    <motion.img 
                      src={isDark ? "/icon-dark.png" : "/icon-light.png"} 
                      alt="AI" 
                      className="w-9 h-9 object-contain" 
                      animate={isLoading && isLast ? {
                        scale: [1, 1.1, 1],
                        opacity: [1, 0.6, 1],
                        filter: ["brightness(1)", "brightness(1.4)", "brightness(1)"]
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </div>
                )}

                <div className={`flex flex-col gap-1 min-w-0 ${msg.role === "user" ? "items-end max-w-md" : "items-start w-full md:w-[calc(100%-48px)] max-w-full"}`}>
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
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all duration-200 max-w-full overflow-hidden
                    ${msg.role === "user"
                      ? isDark
                        ? "bg-white text-[#252525] rounded-tr-sm"
                        : "bg-[#252525] text-white rounded-tr-sm"
                      : isDark
                        ? "bg-[#252525] text-white border border-[#545454] rounded-tl-sm"
                        : "bg-[#F0EDE8] text-[#252525] rounded-tl-sm"}`}>

                    {/* Voice mic indicator for user voice messages */}
                    {msg.role === "user" && msg.inputType === "voice" && (
                      <span className="float-left mt-1 mr-2 opacity-60">
                        <Mic className="w-4 h-4" />
                      </span>
                    )}

                    {msg.role === "assistant" && msg.isThinking ? (
                      <div className="flex items-center py-1 px-0.5 min-w-[140px] animate-pulse">
                        <span className="text-[13px] font-medium opacity-80">
                          {thinkingMessages[thinkingIdx % thinkingMessages.length]}
                        </span>
                      </div>
                    ) : display ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ ...props }) => (
                            <div className="block w-full max-w-full overflow-x-auto mb-4 mt-2 border rounded-lg border-[#E8E5E0] dark:border-[#545454] custom-scrollbar">
                              <table className="w-full text-sm text-left border-collapse min-w-max" {...props} />
                            </div>
                          ),
                          thead: ({ ...props }) => (
                            <thead className={isDark ? "bg-[#545454]" : "bg-[#F0EDE8]"} {...props} />
                          ),
                          th: ({ ...props }) => (
                            <th className={`px-3 py-2 font-bold border-b
                              ${isDark ? "border-[#252525]" : "border-[#E8E5E0]"}`} {...props} />
                          ),
                          td: ({ ...props }) => (
                            <td className={`px-3 py-2 border-b
                              ${isDark ? "border-[#252525]" : "border-[#E8E5E0]"}`} {...props} />
                          ),
                          ul: ({ ...props }) => <ul className="list-disc ml-4 space-y-1 my-2" {...props} />,
                          ol: ({ ...props }) => <ol className="list-decimal ml-4 space-y-1 my-2" {...props} />,
                          p: ({ ...props }) => <div className="mb-2 last:mb-0" {...props} />,
                          pre: ({ children }) => <div className="not-prose">{children}</div>,
                          code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const codeString = String(children).replace(/\n$/, "");
                            if (inline) {
                              return (
                                <code className={`px-1 py-0.5 rounded font-mono text-[11px] ${isDark ? "bg-white/10 text-[#C2A27A]" : "bg-black/5 text-[#A2825A]"}`} {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="relative group/code mb-4 mt-3 block w-full max-w-full">
                                <div className={`flex items-center justify-between px-4 py-2 text-[10px] font-sans rounded-t-xl ${isDark ? "bg-[#2A2A2A] text-gray-400 border border-b-0 border-[#545454]" : "bg-gray-800 text-gray-400 border border-b-0 border-gray-800"}`}>
                                  <span className="uppercase font-bold tracking-widest">{match?.[1] || "code"}</span>
                                  <button onClick={() => handleCopyCode(codeString)} className="flex items-center gap-1.5 hover:text-white transition-colors">
                                    {copiedCodeBlock === codeString ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    <span className="font-bold">{copiedCodeBlock === codeString ? "Copied" : "Copy"}</span>
                                  </button>
                                </div>
                                <div className={`block w-full overflow-x-auto text-[13px] rounded-b-xl custom-scrollbar ${isDark ? "bg-[#161514] border border-[#545454]" : "bg-[#1e1e1e] border border-gray-800 shadow-lg"}`}>
                                  <SyntaxHighlighter 
                                    style={vscDarkPlus} 
                                    language={match?.[1] || "text"} 
                                    PreTag="div" 
                                    customStyle={{ margin: 0, padding: "1.25rem", background: "transparent", fontSize: "13px", lineHeight: "1.6" }} 
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              </div>
                            );
                          },
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
                  <div className={`hidden sm:flex w-8 h-8 rounded-full items-center justify-center shrink-0 mt-1
                    ${isDark ? "bg-white/10 border border-white/20" : "bg-[#252525]/10 border border-[#252525]/20"}`}>
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          });
        })()}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Scroll to Bottom Button ────────────────────────────────── */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className={`absolute bottom-[88px] left-1/2 -translate-x-1/2 z-30`}
          >
            <button
              onClick={scrollToBottom}
              className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg border transition-all active:scale-90
                ${isDark 
                  ? "bg-[#252525] border-[#545454] text-white hover:bg-[#333]" 
                  : "bg-white border-[#E8E5E0] text-[#252525] hover:bg-[#F9F8F6]"}`}
            >
              <ChevronDown size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Area ────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Subtle gradient to mask scroll behind bar */}
        <div className={`absolute inset-0 pointer-events-none h-16 bottom-0 top-auto translate-y-0 ${
          isDark 
            ? "bg-gradient-to-t from-[#1E1E1E] via-[#1E1E1E]/95 to-transparent" 
            : "bg-gradient-to-t from-white via-white/95 to-transparent"
        }`} />
        
        <div className={`${isFocusMode ? "max-w-4xl md:pl-16" : "max-w-2xl"} mx-auto w-full relative z-10 px-3 md:px-4 pb-2 pt-0`}>
          
          {/* Integrated Technical Error Banner */}
          {technicalError && (
            <div className="mb-2">
              {(() => {
                // Only show the Daily Limit banner if the message explicitly says "Daily AI quota reached"
                const isQuotaError = String(technicalError).toLowerCase().includes("daily ai quota reached");
                
                if (isQuotaError) {
                  return (
                    <div className={`p-3 rounded-2xl flex items-start gap-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 shadow-sm
                      ${isDark ? "bg-red-500/10 border border-red-500/30 text-red-200" : "bg-red-50/80 border border-red-200 text-red-700"}`}>
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <Crown size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                            Limit Reached
                          </p>
                          <button onClick={() => setTechnicalError(null)} className="text-[#7D7D7D] hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs leading-relaxed mb-3">
                          {technicalError}
                        </p>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('open-pricing'))}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 backdrop-blur-md border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            Upgrade Plan
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className={`p-2.5 rounded-xl flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 shadow-sm
                    ${isDark ? "bg-red-500/10 border border-red-500/30 text-red-200" : "bg-red-50/80 border border-red-200 text-red-700 font-medium"}`}>
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">System Error</p>
                        <button onClick={() => setTechnicalError(null)} className="text-[#7D7D7D] hover:text-red-500 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                      <p className={`text-xs leading-relaxed truncate-3-lines ${isDark ? "text-red-200/90" : "text-red-700 font-medium"}`}>
                        {String(technicalError)}
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
                );
              })()}
            </div>
          )}


          {/* ── TEXT MODE ── */}
          {mode === "chat" && (
            <div className="pt-1 pb-0">
              <div className={`relative flex flex-col w-full transition-all duration-300 p-1
                ${isDark 
                  ? "bg-[#252525] border-[#333] focus-within:border-[#C2A27A]/40" 
                  : "bg-white border-[#E5E5E5] focus-within:border-[#252525]/20"}
                border rounded-[28px]
              `}>
                <div className="flex items-center px-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything"
                    rows={1}
                    disabled={isLoading || isStarting}
                    className="flex-1 bg-transparent px-3 py-[9px] outline-none resize-none max-h-48 text-[15px] min-h-[40px] leading-tight
                      text-[#252525] dark:text-white placeholder-[#9E9E9E] disabled:opacity-50 transition-all font-medium"
                  />
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading || isStarting}
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-90
                        ${!input.trim() || isLoading || isStarting
                          ? (isDark ? "bg-[#333] text-[#555]" : "bg-[#F5F5F5] text-[#BABABA]")
                          : (isDark ? "bg-white text-[#252525] hover:bg-neutral-100" : "bg-[#252525] text-white hover:bg-[#1A1A1A]")
                        }`}
                    >
                      {isLoading
                        ? <Square size={12} className="fill-current" />
                        : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFocusMode && (
            <p className="text-center text-[11px] opacity-40 mt-1.5 hidden md:block select-none">
              Azviq AI is your teacher. Study and discuss based on this {isPdf ? "PDF" : "note"}.
            </p>
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

                {/* Premium feature badge (idle state only) */}
                {voiceState === "idle" && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all
                    ${isDark
                      ? "bg-white/10 border-white/10 text-white/90"
                      : "bg-[#4D4D4D] border-black/10 text-white shadow-sm"}`}>
                    <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Premium Feature
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
                      <Square className="w-3 h-3 fill-current" />
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
                      disabled={isLoading || isStarting || voiceState === "idle"}
                      className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center
                        shadow-lg transition-all duration-200 focus:outline-none
                        ${vc.btnClass}
                        ${(isLoading || isStarting || voiceState === "idle") ? "opacity-70 cursor-not-allowed" : "active:scale-95 cursor-pointer"}`}
                      style={voiceState === "listening" && audioLevel > 0.05 ? {
                        boxShadow: `0 0 ${10 + audioLevel * 28}px ${4 + audioLevel * 14}px rgba(59,130,246,${0.25 + audioLevel * 0.45})`
                      } : voiceState === "speaking" ? {
                        boxShadow: "0 0 20px 8px rgba(16,185,129,0.35)"
                      } : undefined}
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
                    <span className={`block text-[10px] font-normal mt-0.5 ${isDark ? "text-[#3A3A3A]" : "text-[#CBCBCB]"}`}>
                      Advanced Voice Mode · Coming Soon
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
