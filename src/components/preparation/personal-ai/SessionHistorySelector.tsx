import React, { useState } from "react";
import { History, ChevronDown, Clock, Search, Loader2, Trash2, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Session {
  id: string;
  title: string;
  note_id: string | null;
  updated_at: string;
}

interface Props {
  onSelect: (sessionId: string, noteId: string | null) => void;
  selectedSessionId: string | null;
  sessions: Session[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  allTrashedIds?: string[];
}

/** Strip the hidden archive tag and detect if a session is read-only */
function parseSession(session: Session, allTrashedIds: string[] = []) {
  const TAG = "||ORIGINAL_NOTE_ID||";
  const isArchived = session.title.includes(TAG);
  const cleanTitle = isArchived ? session.title.split(TAG)[0] : session.title;
  
  let status: "active" | "trashed" | "deleted" = "active";
  if (isArchived) {
    const parts = session.title.split(TAG);
    const originalId = parts[parts.length - 1];
    status = allTrashedIds.includes(originalId) ? "trashed" : "deleted";
  }
  
  return { cleanTitle, isArchived, status };
}

export default function SessionHistorySelector({ 
  onSelect, 
  selectedSessionId,
  sessions,
  isLoading,
  onDelete,
  allTrashedIds = []
}: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  const filteredSessions = sessions.filter((s) => {
    const { cleanTitle } = parseSession(s, allTrashedIds);
    return cleanTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;
  const selectedParsed = selectedSession ? parseSession(selectedSession, allTrashedIds) : null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl border transition-all duration-200
          ${isDark 
            ? "bg-[#1A1A1A] border-[#333] hover:bg-[#252525] text-white" 
            : "bg-white border-[#E8E5E0] hover:bg-[#F0EDE8] text-[#252525]"
          }`}
      >
        <History size={17} className={isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"} />
        <span className="text-[13px] font-semibold whitespace-nowrap hidden sm:inline">
          {selectedParsed ? selectedParsed.cleanTitle : "History"}
        </span>
        {selectedParsed?.isArchived && (
          <span title={selectedParsed.status === "trashed" ? "Read-only — note is in Trash" : "Read-only — note is permanently deleted"}>
            <Lock size={11} className={`${selectedParsed.status === "trashed" ? "text-amber-500" : "text-red-500"} shrink-0`} />
          </span>
        )}
        <ChevronDown size={15} className={isDark ? "text-[#545454]" : "text-[#BABABA]"} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute top-full left-0 mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden
            ${isDark ? "bg-[#1A1A1A] border-[#333]" : "bg-white border-[#E8E5E0]"}`}
          >
            <div className={`p-2 border-b ${isDark ? "border-[#333]" : "border-[#E8E5E0]"}`}>
               <div className={`flex items-center gap-2 px-3 py-2 rounded-lg 
                  ${isDark ? "bg-[#252525]" : "bg-[#F0EDE8]"}`}>
                  <Search size={16} className={isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search history..."
                    className="bg-transparent border-none outline-none text-sm w-full"
                    autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
                  />
               </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 size={24} className="animate-spin text-[#C2A27A]" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className={`text-center py-6 text-sm ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`}>
                  No history found.
                </div>
              ) : (
                <div className="p-1">
                  {filteredSessions.map((session) => {
                    const { cleanTitle, isArchived, status } = parseSession(session, allTrashedIds);
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          onSelect(session.id, session.note_id);
                          setIsOpen(false);
                        }}
                        className={`w-full group text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer
                          ${session.id === selectedSessionId 
                            ? (isDark ? "bg-[#252525] text-white" : "bg-[#F0EDE8] text-[#252525]")
                            : (isDark ? "hover:bg-[#252525] text-[#BABABA]" : "hover:bg-[#F0EDE8] text-[#545454]")
                          }`}
                      >
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            {isArchived && (
                              <span title={status === "trashed" ? "Read-only — note is in Trash" : "Read-only — note is permanently deleted"}>
                                <Lock size={11} className={`${status === "trashed" ? "text-amber-500" : "text-red-500"} shrink-0`} />
                              </span>
                            )}
                            <span className="text-sm font-medium truncate">{cleanTitle || "Untitled Session"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-70">
                            <Clock size={12} />
                            <span>{new Date(session.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          className={`p-1.5 rounded-md transition-all sm:opacity-0 group-hover:opacity-100
                            ${isDark 
                              ? "text-[#7D7D7D] hover:bg-red-500/10 hover:text-red-400" 
                              : "text-[#BABABA] hover:bg-red-50 hover:text-red-500"}`}
                          title="Delete session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
