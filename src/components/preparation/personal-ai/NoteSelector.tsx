"use client";

import React from "react";
import { FileText, ChevronDown } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Note {
  id: string;
  title: string;
  file_url?: string | null;
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

  return (
    <div className="relative flex-1 sm:max-w-xs">
      <select
        className={`w-full appearance-none px-4 py-2.5 pr-10 rounded-full border outline-none font-medium text-sm transition-all cursor-pointer
          ${isDark
            ? "bg-[#252525] border-[#545454] text-white focus:border-[#BABABA]"
            : "bg-white border-[#7D7D7D]/40 text-[#252525] focus:border-[#7D7D7D]"
          }`}
        value={selectedNoteId || ""}
        onChange={(e) => onSelect(e.target.value)}
        disabled={isLoading}
      >
        <option value="" disabled>
          {isLoading ? "Loading notes…" : "Select a Note or PDF"}
        </option>
        {notes.map((note) => (
          <option key={note.id} value={note.id}>
            {note.file_url ? "📄 " : "📝 "}{note.title}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {isLoading
          ? <div className="w-4 h-4 rounded-full border-2 border-[#BABABA] border-t-transparent animate-spin" />
          : <ChevronDown size={15} className="text-[#BABABA]" />
        }
      </div>
    </div>
  );
}
