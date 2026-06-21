"use client";

import React, { useState, useEffect } from "react";
import { FileText, AlertCircle, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useStudyTracker } from "@/hooks/useStudyTracker";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import NoteSelector from "./personal-ai/NoteSelector";
import SessionHistorySelector from "./personal-ai/SessionHistorySelector";
import ModeToggle, { Mode } from "./personal-ai/ModeToggle";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import UnifiedChatPanel from "./personal-ai/UnifiedChatPanel";
import { useAppDialog } from "@/components/ui/AppDialog";
import { useToast } from "@/contexts/ToastContext";
import { useSWRConfig } from "swr";

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
  const dialog = useAppDialog();
  const { show } = useToast();
  const { mutate: globalMutate } = useSWRConfig();

  const router = useRouter();
  const pathname = usePathname();
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
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [allTrashedIds, setAllTrashedIds] = useState<string[]>([]);

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

  // Sync state if session_id query param updates while already mounted (e.g. from Command Palette)
  useEffect(() => {
    const urlSessionId = searchParams.get("session_id");
    if (urlSessionId && urlSessionId !== sessionId) {
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
          console.error("URL Session update failed", e);
        }
      };
      fetchSessionInfo();
    }
  }, [searchParams, sessionId, handleNoteSelect]); 

  // 2. Sync State to URL
  useEffect(() => {
    // Only sync if we are on the main preparation page or its AI Teacher tab.
    // If we've navigated to a modal route (like /trash or /settings), don't interfere with its URL.
    if (pathname !== "/preparation" && pathname !== "/preparation/ai_teacher") return;

    const params = new URLSearchParams(searchParams.toString());
    const currentParam = params.get("session_id");
    
    if (sessionId) {
      if (currentParam !== sessionId) {
        params.set("session_id", sessionId);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    } else {
      if (currentParam) {
        params.delete("session_id");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [sessionId, router, searchParams, pathname]);

  // Fetch available notes – also exposed so event listeners can trigger a re-fetch
  const fetchNotes = React.useCallback(async () => {
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
  }, []);

  // Initial load of notes + sessions + trash
  useEffect(() => {
    fetchNotes();
    fetchAllSessions();
    fetchTrash();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTrash = async () => {
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        setTrashItems(data.trashItems || []);
        setAllTrashedIds(data.allTrashedIds || []);
      }
    } catch (e) {
      console.error("Failed to fetch trash", e);
    }
  };

  // Re-fetch everything when an external event signals a refresh (e.g., note restored from Trash)
  useEffect(() => {
    const handleRefresh = async () => {
      await fetchNotes();
      await fetchTrash();
      const updatedSessions = await fetchAllSessions();

      // Critical: if the current session's note_id changed (note was restored from Trash),
      // update selectedNoteId to the original note so the chat unlocks.
      if (sessionId && updatedSessions) {
        const currentSession = updatedSessions.find((s: any) => s.id === sessionId);
        if (currentSession?.note_id && currentSession.note_id !== selectedNoteId) {
          setSelectedNoteId(currentSession.note_id);
          const contextRes = await fetch(`/api/personal-ai/context?note_id=${currentSession.note_id}`);
          if (contextRes.ok) {
            const contextData = await contextRes.json();
            setNoteContent(contextData.contentText);
            setIsPdf(contextData.isPdf);
            setContextError(null);
          }
          return; // done — context reloaded for new note
        }
      }

      // Fallback: reload context for the note currently selected
      if (selectedNoteId) {
        const contextRes = await fetch(`/api/personal-ai/context?note_id=${selectedNoteId}`);
        if (contextRes.ok) {
          const contextData = await contextRes.json();
          setNoteContent(contextData.contentText);
          setIsPdf(contextData.isPdf);
          setContextError(null);
        }
      }
    };
    window.addEventListener("personal-ai-refresh", handleRefresh);
    return () => window.removeEventListener("personal-ai-refresh", handleRefresh);
  }, [fetchNotes, selectedNoteId, sessionId]);

  // Returns sessions so callers (e.g., refresh handler) can inspect updated note_ids
  const fetchAllSessions = async (): Promise<any[]> => {
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
        return sessList;
      }
    } catch (e) {
      console.error("Failed to fetch all sessions", e);
    }
    return [];
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
    const previousSessions = [...sessions];

    // 1. Optimistically remove immediately
    setSessions(prev => prev.filter(s => s.id !== id));

    // 2. Start delete in background
    const deletePromise = fetch(`/api/personal-ai/sessions/${id}`, { method: "DELETE" }).then(res => {
      if (!res.ok) throw new Error("Delete failed");
      return res;
    });

    // 3. Show toast immediately
    show({
      message: "Moved to trash",
      type: "success",
      action: {
        label: "Undo",
        onClick: () => {
          // Instantly restore to UI
          setSessions(previousSessions);

          const performRestore = async () => {
            try {
              await deletePromise;
              const restoreRes = await fetch(`/api/trash/restore-by-item?item_id=${id}&type=personal_ai_session`, {
                method: "POST"
              });
              if (restoreRes.ok) {
                fetchAllSessions();
                globalMutate("/api/trash");
                window.dispatchEvent(new Event("recentActivityUpdated"));
              }
            } catch (err) {
              console.error("Undo failed:", err);
            }
          };
          performRestore();
        }
      }
    });

    try {
      await deletePromise;
      globalMutate("/api/trash");
      window.dispatchEvent(new Event("recentActivityUpdated"));
      setTimeout(fetchAllSessions, 100);
    } catch (e) {
      console.error("Delete failed", e);
      setSessions(previousSessions); // Rollback
      dialog.showAlert("Could not delete the session.", "error");
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
    <div className={`flex flex-col h-full overflow-hidden transition-all duration-500 mx-auto w-full ${isFocusMode ? 'max-w-none gap-0 px-0' : 'max-w-3xl gap-4 px-3 sm:px-0 pb-4'}`}>
      <div 
        className={`flex flex-row items-center gap-1 sm:gap-2.5 transition-all duration-500 border-b
        ${isFocusMode 
          ? `px-4 h-14 shrink-0 bg-white dark:bg-[#1A1A1A] border-[#7D7D7D]/40 dark:border-[#2E2E2E]` 
          : 'border-transparent'}`}
      >
        <div className="flex items-center gap-2.5 flex-1 h-full">
          <AnimatePresence mode="popLayout">
            {isFocusMode && (
              <motion.div
                initial={{ width: 0, opacity: 0, x: -10 }}
                animate={{ width: "auto", opacity: 1, x: 0 }}
                exit={{ width: 0, opacity: 0, x: -10 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden flex items-center shrink-0"
              >
                <SidebarToggleButton />
              </motion.div>
            )}
          </AnimatePresence>
          <SessionHistorySelector
            onSelect={handleSessionSelect}
            selectedSessionId={sessionId}
            sessions={sessions}
            isLoading={isSessionsLoading}
            onDelete={handleSessionDelete}
            allTrashedIds={allTrashedIds}
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
              className={`w-8 h-8 rounded-xl transition-all duration-500 hover:scale-110 active:scale-95 flex items-center justify-center shrink-0
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
      <div className={`flex flex-col flex-1 transition-all duration-500 overflow-hidden border
        ${isFocusMode 
          ? "rounded-none border-transparent shadow-none" 
          : "rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)] " + (isDark ? "border-[#333]" : "border-[#E8E5E0]")}
        ${isDark ? "bg-[#1E1E1E]" : "bg-[#F5F5F5]"}`}>

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
              <div className="w-10 h-10 border-4 border-[#C2A27A] border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
              <h3 className="text-sm font-semibold text-[#252525] dark:text-white">Extracting Material</h3>
              <p className={`text-xs mt-1 max-w-xs mx-auto leading-relaxed ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
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
                noteStatus={(() => {
                  if (!selectedNoteId) return "active";

                  // 1. Check if this is an archived session (source note was deleted/trashed)
                  const currentSession = sessions.find(s => s.id === sessionId);
                  if (currentSession?.title?.includes("||ORIGINAL_NOTE_ID||")) {
                    const parts = currentSession.title.split("||ORIGINAL_NOTE_ID||");
                    const originalId = parts[parts.length - 1];
                    if (allTrashedIds.includes(originalId)) return "trashed";
                    return "deleted";
                  }

                  // 2. Standard check for currently selected note
                  const noteExists = notes.some(n => n.id === selectedNoteId);
                  if (noteExists) return "active";
                  const noteInTrash = allTrashedIds.includes(selectedNoteId);
                  if (noteInTrash) return "trashed";
                  
                  // 3. Fallback for generic "Deleted Material" archive note
                  if (selectedNoteTitle === "Deleted Material" || selectedNoteTitle === "Unknown Document") {
                    return "deleted";
                  }

                  return "deleted";
                })()}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
