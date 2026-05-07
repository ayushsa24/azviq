"use client";

import React, { useState, useRef, useEffect } from "react";
import { FileText, ChevronDown, Search, X, File as FileIcon, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

interface Note {
  id: string;
  title: string;
  file_url?: string | null;
  is_revoked?: boolean;
}

interface NoteSelectorProps {
  notes: Note[];
  isLoading: boolean;
  selectedNoteId: string | null;
  onSelect: (noteId: string) => void;
}

export default function NoteSelector({
  notes,
  isLoading,
  selectedNoteId,
  onSelect,
}: NoteSelectorProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredNotes = notes.filter((n) =>
    !n.is_revoked && 
    n.id !== selectedNoteId &&
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderIcon = (title: string, fileUrl?: string | null) => {
    const iconMatch = title.match(/^\[(\w+)\]/);
    if (iconMatch && ICON_MAP[iconMatch[1]]) {
      const IconComp = ICON_MAP[iconMatch[1]];
      return <IconComp className="w-5 h-5" />;
    }
    return fileUrl ? (
      <FileIcon className="w-4 h-4 opacity-60" />
    ) : (
      <FileText className="w-4 h-4 opacity-60" />
    );
  };

  const cleanTitle = (title: string) => title.replace(/^\[\w+\]\s*/, "");

  return (
    <div className="relative flex-1 sm:max-w-xs" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`w-full flex items-center justify-between px-2.5 sm:px-4 py-2 rounded-xl border outline-none font-medium text-[13px] transition-all cursor-pointer
          ${isDark
            ? "bg-[#252525] border-[#545454] text-white hover:bg-[#2A2A2A]"
            : "bg-white border-[#7D7D7D]/40 text-[#252525] hover:bg-[#F9F8F6]"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedNote ? (
            <>
              {renderIcon(selectedNote.title, selectedNote.file_url)}
              <span className="truncate">{cleanTitle(selectedNote.title)}</span>
            </>
          ) : (
            <span className="opacity-60 truncate">
              {isLoading ? "..." : (
                <>
                  <span className="sm:hidden">Select...</span>
                  <span className="hidden sm:inline">Select Material</span>
                </>
              )}
            </span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${isDark ? "text-[#BABABA]" : "text-[#7D7D7D]"}`} 
        />
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 
            ${isDark ? "bg-[#252525] border-[#545454]" : "bg-white border-[#E8E5E0]"}`}
        >
          {/* Search Input */}
          <div className={`p-2 border-b ${isDark ? "border-[#545454]" : "border-[#F0EDE8]"}`}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40" />
              <input
                type="text"
                placeholder="Search notes..."
                autoFocus={typeof window !== 'undefined' && window.innerWidth >= 640}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-transparent pl-8 pr-8 py-1.5 text-xs outline-none ${isDark ? "text-white" : "text-[#252525]"}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3 opacity-40 hover:opacity-100" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    onSelect(note.id);
                    setIsOpen(false);
                    setSearchQuery("");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors
                    ${isDark 
                      ? "hover:bg-white/5 text-white" 
                      : "hover:bg-[#F5F3EF] text-[#252525]"
                    } ${selectedNoteId === note.id ? (isDark ? "bg-white/10" : "bg-[#F0EDE8]") : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {(() => {
                      const iconMatch = note.title.match(/^\[(\w+)\]/);
                      if (iconMatch && ICON_MAP[iconMatch[1]]) {
                        const IconComp = ICON_MAP[iconMatch[1]];
                        return <IconComp className="w-5 h-5" />;
                      }
                      return note.file_url ? (
                        <FileIcon className="w-4 h-4 opacity-60" />
                      ) : (
                        <FileText className="w-4 h-4 opacity-60" />
                      );
                    })()}
                    <span className={`truncate text-xs font-medium ${selectedNoteId === note.id ? "opacity-100" : "opacity-80"}`}>{cleanTitle(note.title)}</span>
                  </div>
                  {selectedNoteId === note.id && <Check className="w-3.5 h-3.5 shrink-0 opacity-60" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs opacity-50">
                No materials found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
