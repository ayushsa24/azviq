"use client";

import React, { useState, useEffect } from "react";
import { FileText, AlertCircle, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSearchParams, useRouter } from "next/navigation";
import NoteSelector from "./personal-ai/NoteSelector";
import SessionHistorySelector from "./personal-ai/SessionHistorySelector";
import ModeToggle, { Mode } from "./personal-ai/ModeToggle";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import UnifiedChatPanel from "./personal-ai/UnifiedChatPanel";

interface Note {
  id: string;
  title: string;
  file_url?: string | null;
  is_revoked?: boolean;
}

interface Props {
  isFocusMode?: boolean;
  onFocusModeChange?: (val: boolean) => void;
}

export default function AITeacherTab({ isFocusMode = false, onFocusModeChange }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("chat");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [notesWithSessions, setNotesWithSessions] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const lastCreatedSessionId = React.useRef<string | null>(null);

  const [isNotesLoading, setIsNotesLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);

  useStudyTracker({ activityType: "personal_ai", isEnabled: true });

  // Load extracted content when a note is selected
  const handleNoteSelect = React.useCallback(async (noteId: string, preSessionId?: string | null) => {
    const isNewNote = noteId !== selectedNoteId;
    
    setSelectedNoteId(noteId);
    
    // Only clear content if the note actually changed
    if (isNewNote) {
      setNoteContent(null);
      setIsPdf(false);
    }
    
    setContextError(null);

    // If it's a fresh selection (no preSessionId), increment resetKey to force remount
    if (!preSessionId) {
      setResetKey(prev => prev + 1);
      // Clear URL params immediately to prevent race conditions during load
      const params = new URLSearchParams(window.location.search);
      if (params.has("session_id")) {
        params.delete("session_id");
        router.push(`/preparation?${params.toString()}`, { scroll: false });
      }
    }

    try {
      setIsHistoryLoading(true);
      setContextError(null);

      // 1. Check for existing session first
      let currentSessionId = preSessionId ?? null;
      
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

    } catch (err: unknown) {
      setContextError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsContextLoading(false);
      setIsHistoryLoading(false);
    }
  }, []);

  // 1. Initial Load from URL (Run only once on mount)
  useEffect(() => {
    const urlSessionId = searchParams.get("session_id");
    if (urlSessionId) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Fetch all sessions
    const fetchAllSessions = async () => {
      try {
        setIsSessionsLoading(true);
        const res = await fetch("/api/personal-ai/sessions");
        if (res.ok) {
          const json = await res.json();
          const sessList = json.data?.sessions || [];
          setSessions(sessList);
          const sessionNotes = new Set<string>(
            sessList.map((s: any) => s.note_id).filter(Boolean)
          );
          setNotesWithSessions(sessionNotes);
        }
      } catch (e) {
        console.error("Failed to fetch all sessions", e);
      } finally {
        setIsSessionsLoading(false);
      }
    };
    fetchAllSessions();
  }, []);

  const fetchAllSessions = async () => {
    try {
      const res = await fetch("/api/personal-ai/sessions");
      if (res.ok) {
        const json = await res.json();
        const sessList = json.data?.sessions || [];
        setSessions(sessList);
        const sessionNotes = new Set<string>(
          sessList.map((s: any) => s.note_id).filter(Boolean)
        );
        setNotesWithSessions(sessionNotes);
      }
    } catch (e) {
      console.error("Failed to fetch all sessions", e);
    }
  };

  const handleSessionCreated = (id: string, noteId?: string | null) => {
    lastCreatedSessionId.current = id; // Track this to prevent key-driven remount
    setSessionId(id);
    if (noteId) {
      setNotesWithSessions(prev => new Set([...prev, noteId]));
    }
    // Refresh the sessions list immediately
    fetchAllSessions();
  };

  // Sync theme-color for mobile notch when entering/exiting fullscreen
  useEffect(() => {
    if (!isDark) {
      const color = isFocusMode ? '#FFFFFF' : '#F5F3EF';
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
        m.setAttribute('content', color);
      });
    }
  }, [isFocusMode, isDark]);

  const handleSessionDelete = async (id: string) => {
    if (!confirm("Delete this session history?")) return;
    try {
      const res = await fetch(`/api/personal-ai/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
        // Recalculate notes with sessions after delete
        setTimeout(fetchAllSessions, 100);
      }
    } catch (e) {
      console.error("Delete failed", e);
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
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 mx-auto w-full ${isFocusMode ? 'max-w-none gap-0 px-0' : 'max-w-3xl gap-4 px-3 sm:px-0 pb-4'}`}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className={`flex flex-row items-center gap-1 sm:gap-2.5 transition-all duration-300 
        ${isFocusMode 
          ? `px-4 h-14 shrink-0 border-b bg-white dark:bg-[#1A1A1A] border-[#7D7D7D]/40 dark:border-[#2E2E2E]` 
          : ''}`}
      >
        <div className="flex items-center gap-2.5 flex-1 h-full">
          {isFocusMode && <SidebarToggleButton />}
          <SessionHistorySelector
            onSelect={handleSessionSelect}
            selectedSessionId={sessionId}
            sessions={sessions}
            isLoading={isSessionsLoading}
            onDelete={handleSessionDelete}
          />
          <NoteSelector
            notes={notes.filter(n => !notesWithSessions.has(n.id) || n.id === selectedNoteId)}
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
      </motion.div>

      {/* Main Panel */}
      <div className={`flex flex-col flex-1 transition-all duration-500 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.02)]
        ${isFocusMode ? "rounded-none" : "rounded-xl border"}
        ${isDark ? "bg-[#1E1E1E] border-[#333]" : "bg-[#F5F5F5] border-[#E8E5E0]"}`}>

        <AnimatePresence>
          {!selectedNoteId ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col items-center justify-center p-10 text-center"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4
                ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
                <FileText size={26} className={isDark ? "text-[#545454]" : "text-[#BABABA]"} />
              </div>
              <h3 className="text-base font-semibold mb-1">Select a Note or PDF</h3>
              <p className={`text-sm max-w-xs leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#545454]"}`}>
                Choose a Note or PDF above. Your AI Teacher will read it and be ready to discuss it with you — in Text or Voice mode.
              </p>
            </motion.div>
          ) : (isContextLoading && !sessionId) ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col items-center justify-center p-10 text-center"
            >
              <div className="w-10 h-10 border-4 border-[#C2A27A] border-t-transparent rounded-full animate-spin mb-4" />
              <h3 className="text-sm font-semibold">Extracting Material</h3>
              <p className={`text-xs mt-1 ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
                Reading and preparing your document for the AI Teacher…
              </p>
            </motion.div>
          ) : contextError ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col items-center justify-center p-10 text-center gap-2"
            >
              <AlertCircle size={32} className="text-red-400 mb-2" />
              <h3 className="text-sm font-semibold text-red-500">Failed to load content</h3>
              <p className="text-sm text-red-400/80 max-w-xs">{contextError}</p>
            </motion.div>
          ) : (sessionId || (noteContent && !isHistoryLoading)) ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <UnifiedChatPanel
                key={sessionId && sessionId !== lastCreatedSessionId.current ? sessionId : `${selectedNoteId}-${resetKey}`}
                mode={mode}
                noteTitle={selectedNoteTitle}
                noteId={selectedNoteId}
                noteContent={noteContent || ""}
                isPdf={isPdf}
                isFocusMode={isFocusMode}
                onFocusModeChange={onFocusModeChange}
                sessionId={sessionId}
                onSessionCreated={(id) => handleSessionCreated(id, selectedNoteId)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
