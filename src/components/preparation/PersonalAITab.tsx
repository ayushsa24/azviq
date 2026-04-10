"use client";

import React, { useState, useEffect } from "react";
import { FileText, AlertCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import NoteSelector from "./personal-ai/NoteSelector";
import ModeToggle, { Mode } from "./personal-ai/ModeToggle";
import TextChatPanel from "./personal-ai/TextChatPanel";
import VoicePanel from "./personal-ai/VoicePanel";

export default function PersonalAITab() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<Mode>("chat");
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Context state (extracted from the selected note)
  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  // Track time spent in this tab
  useStudyTracker({ activityType: "personal_ai", isEnabled: true });

  // 1. Fetch available notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsNotesLoading(true);
        const res = await fetch("/api/notes?all=true");
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsNotesLoading(false);
      }
    };
    fetchNotes();
  }, []);

  // 2. Fetch extracted plain-text context when a note is selected
  const handleNoteSelect = async (noteId: string) => {
    setSelectedNoteId(noteId);
    setNoteContent(null);
    setContextError(null);
    setIsPdf(false);

    try {
      setIsContextLoading(true);
      const res = await fetch(`/api/personal-ai/context?note_id=${noteId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load note context");
      }

      setNoteContent(data.contentText);
      setIsPdf(data.isPdf);
    } catch (err: any) {
      setContextError(err.message);
    } finally {
      setIsContextLoading(false);
    }
  };

  const selectedNoteTitle = notes.find((n) => n.id === selectedNoteId)?.title || "Unknown Document";

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full h-full">
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <NoteSelector
          notes={notes}
          isLoading={isNotesLoading}
          selectedNoteId={selectedNoteId}
          onSelect={handleNoteSelect}
        />
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Main Panel Area */}
      <div
        className={`flex flex-col flex-1 min-h-[420px] rounded-xl border transition-all duration-200 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]
          ${isDark ? "border-[#333] bg-[#1A1A1A]" : "border-[#E8E5E0] bg-white"}
        `}
      >
        {!selectedNoteId ? (
          // State 1: Nothing selected
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
              <FileText size={26} className={isDark ? "text-[#545454]" : "text-[#BABABA]"} />
            </div>
            <h3 className="text-base font-semibold mb-1">Select Context Below</h3>
            <p className={`text-sm max-w-xs leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
              Choose a Note or PDF above. Your AI Teacher will read it and be ready to discuss it with you.
            </p>
          </div>
        ) : isContextLoading ? (
          // State 2: Extracting text from DB/PDF
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-10 h-10 border-4 border-[#C2A27A] border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-semibold">Extracting Material</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
              Reading and preparing your document for the AI Teacher…
            </p>
          </div>
        ) : contextError ? (
          // State 3: Extraction failed
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-2">
            <AlertCircle size={32} className="text-red-400 mb-2" />
            <h3 className="text-sm font-semibold text-red-500">Failed to load content</h3>
            <p className="text-sm text-red-400/80 max-w-xs">{contextError}</p>
          </div>
        ) : noteContent ? (
          // State 4: Ready - Render selected mode
          mode === "chat" ? (
            <TextChatPanel
              noteTitle={selectedNoteTitle}
              noteContent={noteContent}
              isPdf={isPdf}
            />
          ) : (
            <VoicePanel
              noteTitle={selectedNoteTitle}
              noteContent={noteContent}
              isPdf={isPdf}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
