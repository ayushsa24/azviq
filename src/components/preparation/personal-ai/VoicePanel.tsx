"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface VoicePanelProps {
  noteTitle: string;
  noteContent: string;
  isPdf: boolean;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

// Type declarations for Web Speech API (not in all TS versions)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoicePanel({ noteTitle, noteContent, isPdf }: VoicePanelProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState(""); // Last user speech
  const [aiResponse, setAiResponse] = useState("");  // Last AI response
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check browser support (SSR safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsSupported(supported);
    if (supported) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel(); // Cancel any ongoing speech

    // Strip AI markers from spoken text
    const cleanText = text
      .replace(/^\[CORRECTION\]\n?/i, "")
      .replace(/^\[CORRECT\]\n?/i, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = "en-US";

    // Try to select a natural-sounding voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Natural") ||
        v.name.includes("Premium") ||
        (v.lang === "en-US" && !v.name.includes("eSpeak"))
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setVoiceState("speaking");
    utterance.onend = () => {
      setVoiceState("idle");
      onEnd?.();
    };
    utterance.onerror = () => setVoiceState("idle");

    synthRef.current.speak(utterance);
  }, []);

  const sendToAI = useCallback(
    async (spokenText: string) => {
      setVoiceState("thinking");
      setError(null);

      const userMessage = { role: "user" as const, content: spokenText };
      const updatedHistory = [...history, userMessage];
      setHistory(updatedHistory);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/personal-ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            messages: updatedHistory,
            noteTitle,
            noteContent,
            isPdf,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "AI request failed");
        }

        if (!res.body) throw new Error("No response stream");

        // Read full streamed response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setAiResponse(fullText);
        }

        const assistantMessage = { role: "assistant" as const, content: fullText };
        setHistory((prev) => [...prev, assistantMessage]);

        // Speak the response when done
        speak(fullText, () => {
          // After AI finishes speaking, auto-start listening again
          setTimeout(() => startListening(), 300);
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "Something went wrong. Please try again.");
        setVoiceState("idle");
      }
    },
    [history, noteTitle, noteContent, isPdf, speak]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || !isSupported) return;
    // Don't listen while speaking
    if (voiceState === "speaking") return;

    setError(null);
    setTranscript("");

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setVoiceState("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latest = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join("");
      setTranscript(latest);
    };

    recognition.onend = () => {
      const currentTranscript = transcript;
      if (currentTranscript.trim().length > 2) {
        sendToAI(currentTranscript.trim());
      } else {
        setVoiceState("idle");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        setVoiceState("idle");
      } else {
        setError(`Microphone error: ${event.error}. Check browser permissions.`);
        setVoiceState("idle");
      }
    };

    recognition.start();
  }, [isSupported, voiceState, transcript, sendToAI]);

  const stopAll = useCallback(() => {
    recognitionRef.current?.abort();
    synthRef.current?.cancel();
    abortRef.current?.abort();
    setVoiceState("idle");
    setError(null);
  }, []);

  const handleMicClick = () => {
    if (voiceState === "idle") {
      startListening();
    } else {
      stopAll();
    }
  };

  const stateConfig = {
    idle: {
      label: "Tap to speak",
      sublabel: "I'm ready to teach",
      pulseColor: isDark ? "bg-white/10" : "bg-[#252525]/8",
      btnClass: isDark ? "bg-white text-[#252525]" : "bg-[#252525] text-white",
      icon: <Mic className="w-8 h-8" />,
    },
    listening: {
      label: "Listening…",
      sublabel: "Speak clearly — I'm all ears",
      pulseColor: "bg-blue-400/20",
      btnClass: "bg-blue-500 text-white",
      icon: <Mic className="w-8 h-8" />,
    },
    thinking: {
      label: "Thinking…",
      sublabel: "Your AI Teacher is preparing a response",
      pulseColor: "bg-[#C2A27A]/20",
      btnClass: "bg-[#C2A27A] text-white",
      icon: <Loader2 className="w-8 h-8 animate-spin" />,
    },
    speaking: {
      label: "Speaking…",
      sublabel: "Tap to stop",
      pulseColor: "bg-green-400/20",
      btnClass: "bg-green-500 text-white",
      icon: <Volume2 className="w-8 h-8" />,
    },
  };

  const current = stateConfig[voiceState];

  if (!isSupported) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <h3 className="text-base font-semibold">Voice Not Supported</h3>
        <p className={`text-sm max-w-xs leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
          Your browser doesn't support the Web Speech API. Please use Google Chrome or Microsoft Edge for voice mode.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 gap-6">
      {/* Note title */}
      <div className="text-center">
        <p className={`text-xs font-medium uppercase tracking-widest mb-1 ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>
          Discussing
        </p>
        <h3 className="text-sm font-semibold">{noteTitle}</h3>
      </div>

      {/* Pulsing Mic Button */}
      <button
        onClick={handleMicClick}
        className="group relative focus:outline-none"
        title={voiceState === "idle" ? "Start speaking" : "Stop"}
      >
        {/* Outer pulse ring */}
        <div className={`absolute -inset-5 rounded-full transition-all duration-500
          ${voiceState !== "idle" ? `${current.pulseColor} animate-ping opacity-60` : "opacity-0"}`}
        />
        {/* Inner glow */}
        <div className={`absolute -inset-3 rounded-full blur-lg transition-opacity duration-300
          ${voiceState !== "idle" ? `${current.pulseColor} opacity-100` : "opacity-0"}`}
        />
        {/* Button */}
        <div className={`w-24 h-24 rounded-full flex items-center justify-center relative z-10 shadow-lg transition-all duration-200 active:scale-95 ${current.btnClass}`}>
          {current.icon}
        </div>
      </button>

      {/* State label */}
      <div className="text-center">
        <p className="text-base font-semibold">{current.label}</p>
        <p className={`text-xs mt-0.5 ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>
          {current.sublabel}
        </p>
      </div>

      {/* Live transcript */}
      {transcript && voiceState === "listening" && (
        <div className={`w-full max-w-sm px-4 py-3 rounded-2xl text-sm text-center animate-in fade-in duration-200
          ${isDark ? "bg-[#252525] border border-[#545454] text-white" : "bg-[#F0EDE8] text-[#252525]"}`}>
          "{transcript}"
        </div>
      )}

      {/* AI response text */}
      {aiResponse && voiceState !== "listening" && (
        <div className={`w-full max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed animate-in fade-in duration-300
          ${isDark ? "bg-[#252525] border border-[#545454] text-[#CFCFCF]" : "bg-[#F0EDE8] text-[#252525]"}`}>
          <p className={`text-[10px] font-bold mb-1 uppercase tracking-wider ${isDark ? "text-[#C2A27A]" : "text-[#C2A27A]"}`}>
            Avyx Teach
          </p>
          {aiResponse
            .replace(/^\[CORRECTION\]\n?/i, "")
            .replace(/^\[CORRECT\]\n?/i, "")}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Instructions */}
      {voiceState === "idle" && !error && history.length === 0 && (
        <p className={`text-xs text-center max-w-xs leading-relaxed ${isDark ? "text-[#545454]" : "text-[#BABABA]"}`}>
          Tap the mic and start talking about your {isPdf ? "PDF" : "note"}. Your AI Teacher will listen, respond, and automatically start listening again.
        </p>
      )}
    </div>
  );
}
