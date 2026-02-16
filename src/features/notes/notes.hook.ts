"use client";

import { useEffect, useState } from "react";
import type { NoteEntity } from "./notes.service";
import { listNotes } from "./notes.service";

export function useNotes() {
  const [notes, setNotes] = useState<NoteEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await listNotes();
        setNotes(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { notes, loading };
}
