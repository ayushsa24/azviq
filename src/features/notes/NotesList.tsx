"use client";

import type { Note } from "@/types";

export default function NotesList({ notes }: { notes: Note[] }) {
  if (!notes.length) return null;

  return (
    <div className="space-y-2">
      {notes.map(note => (
        <div key={note.id} className="border rounded p-3">
          <div className="font-medium">{note.title}</div>
          <div className="text-sm opacity-80">{note.content}</div>
        </div>
      ))}
    </div>
  );
}
