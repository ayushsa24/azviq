"use client";

import React, { useState, useEffect } from "react";
import { FileText, AlertCircle, Minimize2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSearchParams, useRouter } from "next/navigation";
import NoteSelector from "./personal-ai/NoteSelector";
import SessionHistorySelector from "./personal-ai/SessionHistorySelector";
import ModeToggle, { Mode } from "./personal-ai/ModeToggle";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import UnifiedChatPanel from "./personal-ai/UnifiedChatPanel";

interface Props {
  isFocusMode?: boolean;
  onFocusModeChange?: (val: boolean) => void;
}

export default function PersonalAITab({ isFocusMode = false, onFocusModeChange }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("chat");
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useStudyTracker({ activityType: "personal_ai", isEnabled: true });

  // 1. Initial Load from URL
  useEffect(() => {
    const urlSessionId = searchParams.get("session_id");
    if (urlSessionId && !sessionId) {
      // We have a session in URL but not in state. 
      // We need to find which note it belongs to first to load correctly.
      const fetchSessionInfo = async () => {
        try {
          const res = await fetch(`/api/personal-ai/sessions/${urlSessionId}`);
          if (res.ok) {
            const json = await res.json();
            const sess = json.data?.session;
            if (sess?.note_id) {
              handleNoteSelect(sess.note_id, sess.id);
            }
          }
        } catch (e) {
          console.error("URL Session init failed", e);
        }
      };
      fetchSessionInfo();
    }
  }, []);

  // 2. Sync State to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentParam = params.get("session_id");
    
    if (sessionId) {
      if (currentParam !== sessionId) {
        params.set("session_id", sessionId);
        router.push(`/preparation?${params.toString()}`, { scroll: false });
      }
    } else {
      if (currentParam) {
        params.delete("session_id");
        router.push(`/preparation?${params.toString()}`, { scroll: false });
      }
    }
  }, [sessionId, router, searchParams]);

  // Fetch available notes on mount
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

  // Load extracted content when a note is selected
  const handleNoteSelect = async (noteId: string, preSessionId?: string | null) => {
    setSelectedNoteId(noteId);
    setNoteContent(null);
    setContextError(null);
    setIsPdf(false);

    try {
      setIsHistoryLoading(true);
      setContextError(null);

      // 1. Check for existing session first
      let currentSessionId = preSessionId;
      if (!currentSessionId) {
        const sessionRes = await fetch(`/api/personal-ai/sessions?note_id=${noteId}`);
        if (sessionRes.ok) {
          const json = await sessionRes.json();
          currentSessionId = json.data?.sessions?.[0]?.id || null;
        }
      }
      
      setSessionId(currentSessionId);
      setIsHistoryLoading(false);

      // 2. Fetch context (note/pdf text)
      // If we already have a session, we load context in the background silently
      // but we still want the UI to feel "ready"
      if (!currentSessionId) {
        setIsContextLoading(true);
      }

      const contextRes = await fetch(`/api/personal-ai/context?note_id=${noteId}`);
      const contextData = await contextRes.json();
      
      if (!contextRes.ok) throw new Error(contextData.error || "Failed to load note context");
      
      setNoteContent(contextData.contentText);
      setIsPdf(contextData.isPdf);

    } catch (err: any) {
      setContextError(err.message);
    } finally {
      setIsContextLoading(false);
      setIsHistoryLoading(false);
    }
  };

  const rawNote = notes.find((n) => n.id === selectedNoteId);
  const selectedNoteTitle = rawNote
    ? rawNote.title.replace(/^\[\w+\]\s*/, "")
    : "Unknown Document";

  const handleSessionSelect = (newSessionId: string, noteId: string | null) => {
    if (noteId) {
      handleNoteSelect(noteId, newSessionId);
    } else {
      // General session without a specific note? We require notes currently.
      setSessionId(newSessionId);
    }
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-300 mx-auto w-full ${isFocusMode ? 'max-w-none gap-0 px-0' : 'max-w-3xl gap-4 px-0 pb-4'}`}>
      {/* Controls Row - Now visible in Focus Mode as well */}
      <div className={`flex flex-row items-center gap-1 sm:gap-2.5 animate-in fade-in slide-in-from-top-2 transition-all duration-300 
        ${isFocusMode 
          ? `px-4 h-14 shrink-0 border-b ${isDark ? 'bg-[#1E1E1E] border-[#333]' : 'bg-[#FAFAFA] border-[#7D7D7D]/40'}` 
          : ''}`}>
        <div className="flex items-center gap-2.5 flex-1 h-full">
          {isFocusMode && <SidebarToggleButton />}
          <SessionHistorySelector
            onSelect={handleSessionSelect}
            selectedSessionId={sessionId}
          />
          <NoteSelector
            notes={notes}
            isLoading={isNotesLoading}
            selectedNoteId={selectedNoteId}
            onSelect={(noteId) => handleNoteSelect(noteId, null)}
          />
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        {isFocusMode && (
          <div className="ml-auto">
            <button
              onClick={() => onFocusModeChange?.(false)}
              className={`w-8 h-8 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shrink-0
                ${isDark 
                  ? "bg-[#252525] border border-[#545454] text-[#BABABA] hover:bg-[#545454] hover:text-white hover:border-[#545454]" 
                  : "bg-white border border-[#7D7D7D]/40 text-[#545454] hover:bg-[#F0EDE8] hover:text-[#252525] hover:border-[#F0EDE8]"}`}
              title="Exit Fullscreen"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className={`flex flex-col flex-1 transition-all duration-500 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]
        ${isFocusMode ? "rounded-none" : "rounded-xl border"}
        ${isDark ? "bg-[#1E1E1E] border-[#333]" : "bg-white border-[#E8E5E0]"}`}>

        {!selectedNoteId ? (
          /* State 1: No note selected */
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
              ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
              <FileText size={26} className={isDark ? "text-[#545454]" : "text-[#BABABA]"} />
            </div>
            <h3 className="text-base font-semibold mb-1">Select a Note or PDF</h3>
            <p className={`text-sm max-w-xs leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
              Choose a Note or PDF above. Your AI Teacher will read it and be ready to discuss it with you — in Text or Voice mode.
            </p>
          </div>
        ) : (isContextLoading && !sessionId) ? (
          /* State 2: Loading context (only for new sessions) */
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-10 h-10 border-4 border-[#C2A27A] border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-semibold">Extracting Material</h3>
            <p className={`text-xs mt-1 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
              Reading and preparing your document for the AI Teacher…
            </p>
          </div>
        ) : contextError ? (
          /* State 3: Error */
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-2">
            <AlertCircle size={32} className="text-red-400 mb-2" />
            <h3 className="text-sm font-semibold text-red-500">Failed to load content</h3>
            <p className="text-sm text-red-400/80 max-w-xs">{contextError}</p>
          </div>
        ) : (sessionId || (noteContent && !isHistoryLoading)) ? (
          /* State 4: Ready — show panel if we have a session OR if context is ready */
          <UnifiedChatPanel
            mode={mode}
            noteTitle={selectedNoteTitle}
            noteId={selectedNoteId}
            noteContent={noteContent || ""}
            isPdf={isPdf}
            isFocusMode={isFocusMode}
            onFocusModeChange={onFocusModeChange}
            sessionId={sessionId}
            onSessionCreated={(id) => setSessionId(id)}
          />
        ) : null}
      </div>
    </div>
  );
}
