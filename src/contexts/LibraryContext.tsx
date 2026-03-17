"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { NoteItem } from "@/components/notes/NoteCard";
import { Workspace } from "@/types";

interface LibraryContextType {
  notes: NoteItem[];
  workspaces: Workspace[];
  isLoading: boolean;
  fetchLibraryData: (activeWorkspaceId?: string) => Promise<void>;
  setNotes: React.Dispatch<React.SetStateAction<NoteItem[]>>;
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const lastWorkspaceId = React.useRef<string | undefined>(undefined);
  const lastFetchTime = React.useRef<number>(0);

  const fetchLibraryData = useCallback(async (activeWorkspaceId?: string) => {
    const now = Date.now();
    
    // Safety Brake: If we already have data and it's been less than 30 seconds 
    // since the last refresh, don't hit the server again. 
    // This prevents "overloading" and saves battery/data.
    if (hasLoadedOnce && activeWorkspaceId === lastWorkspaceId.current && (now - lastFetchTime.current < 30000)) {
      return; 
    }

    try {
      // If we are switching workspaces, we might want to clear existing notes 
      if (activeWorkspaceId !== lastWorkspaceId.current) {
        setNotes([]);
      }

      lastWorkspaceId.current = activeWorkspaceId;
      lastFetchTime.current = now;

      // Only show loading skeletal if it's the VERY first time ever loading
      if (!hasLoadedOnce) {
        setIsLoading(true);
      }

      // 1. Fetch Workspaces
      const wsUrl = new URL("/api/workspaces", window.location.origin);
      const wsRes = await fetch(wsUrl.toString());
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaces(wsData.workspaces || []);
      }

      // 2. Fetch Notes
      const notesUrl = new URL("/api/notes", window.location.origin);
      if (activeWorkspaceId) {
        notesUrl.searchParams.set("workspace_id", activeWorkspaceId);
      }
      const res = await fetch(notesUrl.toString());
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
      
      setHasLoadedOnce(true);
    } catch (error) {
      console.error("Failed to fetch library data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedOnce]);

  return (
    <LibraryContext.Provider value={{ 
      notes, 
      workspaces, 
      isLoading, 
      fetchLibraryData,
      setNotes,
      setWorkspaces
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error("useLibrary must be used within a LibraryProvider");
  }
  return context;
}
