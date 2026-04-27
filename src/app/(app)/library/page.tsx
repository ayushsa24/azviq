"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, Plus, LayoutGrid, List, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import { NoteItem, NoteCard } from "@/components/notes/NoteCard";
import { UploadNoteModal } from "@/components/notes/UploadNoteModal";
import { WorkspaceCard } from "@/components/notes/WorkspaceCard";
import { CreateWorkspaceModal } from "@/components/notes/CreateWorkspaceModal";
import { RenameWorkspaceModal } from "@/components/notes/RenameWorkspaceModal";
import { RenameNoteModal } from "@/components/notes/RenameNoteModal";
import { MoveNoteModal } from "@/components/notes/MoveNoteModal";
import { Workspace } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTabState] = useState<"workspaces" | "notes" | "pdfs" | "all" | "favourites">("workspaces");
  const [viewMode, setViewModeState] = useState<"grid" | "list">(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem('libraryViewMode');
        if (saved === "grid" || saved === "list") return saved;
      }
      return "grid";
    }
  );

  const tabCls = (active: boolean) =>
    `relative px-1 py-2.5 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors outline-none ${active
      ? "text-[#252525] dark:text-white"
      : "text-[#545454] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white"
    }`;

  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Clear the search query whenever this component mounts
    setSearchQuery("");

    // Removed libraryActiveTab persistence - always start with workspaces
    const savedView = localStorage.getItem('libraryViewMode');
    if (savedView === "grid" || savedView === "list") {
      setViewModeState(savedView);
    }
  }, []);

  // Clear search whenever the user switches tabs or changes the active workspace
  useEffect(() => {
    setSearchQuery("");
  }, [activeTab, activeWorkspace]);

  const setActiveTab = (tab: "workspaces" | "notes" | "pdfs" | "all" | "favourites") => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  const setViewMode = (mode: "grid" | "list") => {
    setViewModeState(mode);
    localStorage.setItem('libraryViewMode', mode);
  };

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isRenameWorkspaceModalOpen, setIsRenameWorkspaceModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [selectedWorkspaceForRename, setSelectedWorkspaceForRename] = useState<Workspace | null>(null);

  const { data: wsData, isLoading: wsLoading, mutate: mutateWorkspaces } = useSWR("/api/workspaces", fetcher);
  const workspaces: Workspace[] = wsData?.workspaces || [];

  const notesUrl = activeWorkspace ? `/api/notes?workspace_id=${activeWorkspace.id}` : "/api/notes";
  const { data: notesData, isLoading: notesLoading, mutate: mutateNotes } = useSWR(notesUrl, fetcher);
  const notes: NoteItem[] = notesData?.notes || [];

  const isLoading = wsLoading || notesLoading;

  const refetchData = () => {
    mutateWorkspaces();
    mutateNotes();
  };

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Filter by Search Query
    if (searchQuery.trim()) {
      filtered = filtered.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Tab Type (Note: we assume URLs for PDFs end in .pdf)
    if (activeTab === "notes") {
      filtered = filtered.filter((n) => !n.file_url?.toLowerCase().endsWith(".pdf"));
    } else if (activeTab === "pdfs") {
      filtered = filtered.filter((n) => n.file_url?.toLowerCase().endsWith(".pdf"));
    } else if (activeTab === "favourites") {
      filtered = filtered.filter((n) => n.is_favourite);
    }

    // Sort: pinned first, then by created_at
    filtered.sort((a, b) => {
      const pinA = activeTab === "favourites" ? a.is_pinned_in_favourites : a.is_pinned;
      const pinB = activeTab === "favourites" ? b.is_pinned_in_favourites : b.is_pinned;
      if (pinA && !pinB) return -1;
      if (!pinA && pinB) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [notes, searchQuery, activeTab]);

  const filteredWorkspaces = useMemo(() => {
    let filtered = workspaces;
    if (searchQuery.trim()) {
      filtered = filtered.filter((w) =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Sort: pinned first, then by created_at
    filtered = [...filtered].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return filtered;
  }, [workspaces, searchQuery]);

  const handleOpenNote = (note: NoteItem) => {
    if (note.file_url && note.file_url.toLowerCase().endsWith(".pdf")) {
      router.push(`/library/pdf/${note.id}`);
    } else {
      router.push(`/library/note/${note.id}`);
    }
  };

  const handleOpenWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    if (activeTab === "workspaces" || activeTab === "all") {
      setActiveTab("notes");
    }
    router.push(`/library?workspace=${workspace.id}`, { scroll: false });
  };

  const handleBackToWorkspaces = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("workspace");
    params.set("tab", "workspaces");
    router.push(`/library?${params.toString()}`, { scroll: false });
  };

  // Sync state with URL (handles browser back/forward + deep links)
  useEffect(() => {
    const wsId = searchParams.get("workspace");
    const tabParam = searchParams.get("tab") as any;

    // Handle Tab Param
    if (tabParam && ["workspaces", "notes", "pdfs", "all", "favourites"].includes(tabParam)) {
      if (activeTab !== tabParam) {
        setActiveTabState(tabParam);
      }
    }

    // Handle Workspace Param
    if (wsId && workspaces.length > 0) {
      const found = workspaces.find((w) => w.id === wsId);
      if (found && activeWorkspace?.id !== found.id) {
        setActiveWorkspace(found);
        // If a tab wasn't explicitly provided, default to notes for workspace view
        if (!tabParam) setActiveTabState("notes");
      }
    } else if (!wsId && activeWorkspace) {
      // URL has no workspace param but we have an active one — user pressed back
      setActiveWorkspace(null);
      // Only default to workspaces if no tab param is present in URL
      if (!tabParam) setActiveTabState("workspaces");
    }

    // Handle Action Param
    const actionParam = searchParams.get("action");
    if (actionParam === "upload-pdf") {
      setIsUploadModalOpen(true);
      // clean up URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("action");
      router.replace(`/library?${newParams.toString()}`, { scroll: false });
    } else if (actionParam === "new-note") {
      handleCreateNativeNote();
      // clean up URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("action");
      router.replace(`/library?${newParams.toString()}`, { scroll: false });
    }

    // Handle Search Param (deep linking from old notifications)
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
      
      // If notes are loaded, try to find an exact match to auto-open
      if (notes && notes.length > 0) {
        const exactMatch = notes.find(n => n.title.toLowerCase() === searchParam.toLowerCase());
        if (exactMatch) {
          // Clean up URL
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete("search");
          window.history.replaceState({}, "", `/library?${newParams.toString()}`);
          
          // Open it
          handleOpenNote(exactMatch);
        }
      }
    }
  }, [searchParams, workspaces, notes]);

  const handleRenameClick = (note: NoteItem) => {
    setSelectedNote(note);
    setIsRenameModalOpen(true);
  };

  const handleMoveClick = (note: NoteItem) => {
    setSelectedNote(note);
    setIsMoveModalOpen(true);
  };

  const handleDeleteClick = async (note: NoteItem) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      // Optimistic update
      mutateNotes((currentData: { notes: NoteItem[] } | undefined) => ({
        ...currentData,
        notes: (currentData?.notes || []).filter((n: NoteItem) => n.id !== note.id)
      }) as { notes: NoteItem[] }, false);
      
      try {
        const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete note");
        mutateNotes();
      } catch (err) {
        console.error(err);
        alert("Could not delete the note.");
        mutateNotes(); // Revert on failure
      }
    }
  };

  const handleToggleFavourite = async (note: NoteItem) => {
    // Optimistic update
    mutateNotes((currentData: { notes: NoteItem[] } | undefined) => ({
      ...currentData,
      notes: (currentData?.notes || []).map((n: NoteItem) => 
        n.id === note.id ? { ...n, is_favourite: !note.is_favourite } : n
      )
    }) as { notes: NoteItem[] }, false);
    
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favourite: !note.is_favourite }),
      });
      if (!res.ok) throw new Error("Failed to toggle favourite");
      mutateNotes();
    } catch (err) {
      console.error(err);
      alert("Could not update the note.");
      mutateNotes(); // Revert on failure
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    const isFavTab = activeTab === "favourites";
    
    // Optimistic update
    mutateNotes((currentData: { notes: NoteItem[] } | undefined) => ({
      ...currentData,
      notes: (currentData?.notes || []).map((n: NoteItem) => 
        n.id === note.id ? { 
          ...n, 
          ...(isFavTab ? { is_pinned_in_favourites: !note.is_pinned_in_favourites } : { is_pinned: !note.is_pinned })
        } : n
      )
    }) as { notes: NoteItem[] }, false);
    
    try {
      const body = isFavTab
        ? { is_pinned_in_favourites: !note.is_pinned_in_favourites }
        : { is_pinned: !note.is_pinned };

      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      mutateNotes();
    } catch (err) {
      console.error(err);
      alert("Could not update the note.");
      mutateNotes(); // Revert on failure
    }
  };

  const handleCreateNativeNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Note",
          content: "",
          workspace_id: activeWorkspace?.id || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create note");

      const { note } = await res.json();
      router.push(`/library/note/${note.id}?new=true`);
    } catch (err) {
      console.error(err);
      alert("Could not create the note.");
    }
  };

  const handleRenameWorkspaceClick = (workspace: Workspace) => {
    setSelectedWorkspaceForRename(workspace);
    setIsRenameWorkspaceModalOpen(true);
  };

  const handleDeleteWorkspaceClick = async (workspace: Workspace) => {
    if (window.confirm(`Are you sure you want to delete the "${workspace.name}" workspace? This will ALSO DELETE ALL FILES inside it.`)) {
      // Optimistic update
      mutateWorkspaces((currentData: { workspaces: Workspace[] } | undefined) => ({
        ...currentData,
        workspaces: (currentData?.workspaces || []).filter((w: Workspace) => w.id !== workspace.id)
      }) as { workspaces: Workspace[] }, false);
      
      try {
        const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete workspace");

        // If we just deleted the workspace we were currently viewing, go back to root
        if (activeWorkspace?.id === workspace.id) {
          setActiveWorkspace(null);
          router.push("/library", { scroll: false });
        }

        refetchData();
      } catch (err) {
        console.error(err);
        alert("Could not delete the workspace.");
        mutateWorkspaces(); // Revert on failure
      }
    }
  };

  const handleTogglePinWorkspace = async (workspace: Workspace) => {
    // Optimistic update
    mutateWorkspaces((currentData: { workspaces: Workspace[] } | undefined) => ({
      ...currentData,
      workspaces: (currentData?.workspaces || []).map((w: Workspace) => 
        w.id === workspace.id ? { ...w, is_pinned: !workspace.is_pinned } : w
      )
    }) as { workspaces: Workspace[] }, false);
    
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !workspace.is_pinned }),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      mutateWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Could not update the workspace.");
      mutateWorkspaces(); // Revert on failure
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] md:dark:bg-[#1F1F1F] text-[#252525] dark:text-white overflow-hidden transition-colors">
      <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:pt-6 pb-2 px-4 sm:px-6">
        <SidebarToggleButton />
        {activeWorkspace && (
          <button
            onClick={handleBackToWorkspaces}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 text-[#545454] dark:text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
            title="Back to Workspaces"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-[1.4375rem] sm:text-2xl font-extrabold text-[#252525] dark:text-white tracking-tight transition-colors">
            {activeWorkspace ? activeWorkspace.name : "My Library"}
          </h1>
          <p className="text-xs text-[#7D7D7D] mt-0.5">
            {activeWorkspace
              ? activeWorkspace.description || "Manage notes in this workspace"
              : "Manage and organize your data"}
          </p>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center gap-3 mb-3 w-full px-4 sm:px-6">
        <div className="relative flex-1 sm:w-80 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#7D7D7D] w-4 h-4" />
          <input
            type="text"
            placeholder={
              activeWorkspace 
                ? `Search in ${activeWorkspace.name}...` 
                : activeTab === "workspaces" 
                  ? "Search workspaces..." 
                  : activeTab === "notes" 
                    ? "Search notes..." 
                    : activeTab === "pdfs" 
                      ? "Search PDFs..." 
                      : activeTab === "favourites" 
                        ? "Search favourites..." 
                        : "Search notes..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#7D7D7D]/40 dark:border-[#545454] rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#BABABA] transition-all text-[#252525] dark:text-white placeholder-[#9E9E9E]"
          />
        </div>

        <div className="flex gap-2 sm:gap-3 shrink-0">
          {!activeWorkspace && activeTab === "workspaces" ? (
            <button
              onClick={() => setIsWorkspaceModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] hover:scale-105 active:scale-95 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-[1.125rem] h-[1.125rem]" />
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Workspace</span>
            </button>
          ) : (
            <>
              {activeTab !== "notes" && activeTab !== "favourites" && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] hover:scale-105 active:scale-95 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Upload className="w-[1.125rem] h-[1.125rem]" />
                  <span className="sm:hidden">Upload</span>
                  <span className="hidden sm:inline">Upload File</span>
                </button>
              )}

              {activeTab !== "pdfs" && activeTab !== "favourites" && (
                <button
                  onClick={handleCreateNativeNote}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0] hover:scale-105 active:scale-95 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Plus className="w-[1.125rem] h-[1.125rem]" />
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create Note</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <div className="relative flex border-b border-[#7D7D7D]/40 dark:border-[#333] mb-2 justify-between items-end">
          <div className="flex overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x flex-1 pr-10">
            {[
              ...(!activeWorkspace ? [{ id: "workspaces", label: "Workspaces" }] : []),
              { id: "notes", label: "Notes" },
              { id: "pdfs", label: "PDFs" },
              { id: "favourites", label: "Favourites" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={tabCls(activeTab === tab.id)}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="libraryTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#252525] dark:bg-white"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pb-2 shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition-all duration-300 hover:scale-110 ${viewMode === "grid"
                ? "bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-white shadow-sm"
                : "text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
                }`}
              title="Grid View"
            >
              <LayoutGrid className="w-[1.125rem] h-[1.125rem]" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-xl transition-all duration-300 hover:scale-110 ${viewMode === "list"
                ? "bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-white shadow-sm"
                : "text-[#7D7D7D] hover:bg-[#F0EDE8] dark:hover:bg-[#545454] hover:text-[#252525] dark:hover:text-white"
                }`}
              title="List View"
            >
              <List className="w-[1.125rem] h-[1.125rem]" />
            </button>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0 px-4 sm:px-6 mt-2 scrollbar-hide">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 pt-1 animate-pulse"
                  : "grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1 animate-pulse"
              }
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={`rounded-2xl bg-white dark:bg-white/5 border border-[#E8E5E0] dark:border-[#545454]/20 p-4 sm:p-5 flex flex-col justify-between ${viewMode === 'list' ? 'h-24 flex-row items-center' : 'h-40 sm:h-[11.25rem]'}`}>
                  {viewMode === 'grid' ? (
                    <>
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className="w-8 h-8 rounded-full bg-[#F0EDE8] dark:bg-white/10"></div>
                        <div className="w-4 h-4 rounded bg-[#F0EDE8] dark:bg-white/10"></div>
                      </div>
                      <div className="space-y-2 pointer-events-none">
                        <div className="h-5 bg-[#F0EDE8] dark:bg-white/10 rounded w-3/4"></div>
                        <div className="h-3 bg-[#F0EDE8] dark:bg-white/10 rounded w-1/2"></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 w-full cursor-default select-none pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-[#F0EDE8] dark:bg-white/10 shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-[#F0EDE8] dark:bg-white/10 rounded w-1/3"></div>
                          <div className="h-3 bg-[#F0EDE8] dark:bg-white/10 rounded w-1/4"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeTab + (activeWorkspace?.id || "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex-1 flex flex-col"
            >
              {activeTab === "workspaces" && !activeWorkspace ? (
                <motion.div 
                  layout
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
                      : "grid grid-cols-1 lg:grid-cols-3 gap-4"
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {filteredWorkspaces.length > 0 ? filteredWorkspaces.map((ws) => (
                      <motion.div
                        key={ws.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <WorkspaceCard
                          workspace={ws}
                          onClick={handleOpenWorkspace}
                          viewMode={viewMode}
                          onRename={handleRenameWorkspaceClick}
                          onDelete={handleDeleteWorkspaceClick}
                          onTogglePin={handleTogglePinWorkspace}
                        />
                      </motion.div>
                    )) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`col-span-full flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] border-[#DEDBD6] dark:border-[#333]`}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm bg-white dark:bg-[#252525]`}>
                          <Search className={`w-6 h-6 text-[#252525] dark:text-[#BABABA]`} />
                        </div>
                        <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                        <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                          {searchQuery
                            ? "Try adjusting your search query."
                            : "Create your first workspace to get started."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
                      : "grid grid-cols-1 lg:grid-cols-3 gap-4"
                  }
                >
                  <AnimatePresence mode="popLayout">
                    {filteredNotes.length > 0 ? filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <NoteCard
                          key={note.id}
                          note={note}
                          onClick={handleOpenNote}
                          viewMode={viewMode}
                          onRename={handleRenameClick}
                          onMove={handleMoveClick}
                          onDelete={handleDeleteClick}
                          onToggleFavourite={handleToggleFavourite}
                          onTogglePin={handleTogglePin}
                          isPinnedOverride={activeTab === "favourites" ? !!note.is_pinned_in_favourites : !!note.is_pinned}
                        />
                      </motion.div>
                    )) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`col-span-full flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-3xl min-h-[400px] border-[#DEDBD6] dark:border-[#333]`}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 shadow-sm bg-white dark:bg-[#252525]`}>
                          <Search className={`w-6 h-6 text-[#252525] dark:text-[#BABABA]`} />
                        </div>
                        <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1">No files found</h3>
                        <p className="text-sm text-[#7D7D7D] dark:text-[#BABABA] max-w-xs">
                          {searchQuery
                            ? "Try adjusting your search query."
                            : activeWorkspace
                              ? "Upload a file or create a note in this workspace."
                              : "Upload a file or create a note to get started."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UploadNoteModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={refetchData}
        workspaceId={activeWorkspace?.id}
      />
      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSuccess={refetchData}
      />
      <RenameWorkspaceModal
        isOpen={isRenameWorkspaceModalOpen}
        onClose={() => setIsRenameWorkspaceModalOpen(false)}
        onSuccess={refetchData}
        workspace={selectedWorkspaceForRename}
      />
      <RenameNoteModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSuccess={refetchData}
        note={selectedNote}
      />
      <MoveNoteModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onSuccess={refetchData}
        note={selectedNote}
        workspaces={workspaces}
      />
    </div >
  );
}
