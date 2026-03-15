"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, Plus, LayoutGrid, List, ArrowLeft } from "lucide-react";
import SidebarToggleButton from "@/components/layout/SidebarToggleButton";
import { NoteItem, NoteCard } from "@/components/notes/NoteCard";
import { UploadNoteModal } from "@/components/notes/UploadNoteModal";
import { WorkspaceCard } from "@/components/notes/WorkspaceCard";
import { CreateWorkspaceModal } from "@/components/notes/CreateWorkspaceModal";
import { RenameWorkspaceModal } from "@/components/notes/RenameWorkspaceModal";
import { RenameNoteModal } from "@/components/notes/RenameNoteModal";
import { MoveNoteModal } from "@/components/notes/MoveNoteModal";
import { Workspace } from "@/types";

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotesAndWorkspaces = async () => {
    try {
      setIsLoading(true);

      const wsUrl = new URL("/api/workspaces", window.location.origin);
      const wsRes = await fetch(wsUrl.toString());
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaces(wsData.workspaces || []);
      }

      const notesUrl = new URL("/api/notes", window.location.origin);
      if (activeWorkspace) {
        notesUrl.searchParams.set("workspace_id", activeWorkspace.id);
      }
      const res = await fetch(notesUrl.toString());
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndWorkspaces();
  }, [activeWorkspace]);

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
    setActiveWorkspace(null);
    if (activeTab !== "favourites") {
      setActiveTab("workspaces");
    }
    router.push("/library", { scroll: false });
  };

  // Sync state with URL (handles browser back/forward + deep links)
  useEffect(() => {
    const wsId = searchParams.get("workspace");
    const tabParam = searchParams.get("tab") as any;

    // Handle Tab Param
    if (tabParam && ["workspaces", "notes", "pdfs", "all", "favourites"].includes(tabParam)) {
      if (activeTab !== tabParam) {
        setActiveTab(tabParam);
      }
    }

    // Handle Workspace Param
    if (wsId && workspaces.length > 0) {
      const found = workspaces.find((w) => w.id === wsId);
      if (found && activeWorkspace?.id !== found.id) {
        setActiveWorkspace(found);
        // If a tab wasn't explicitly provided, default to notes for workspace view
        if (!tabParam) setActiveTab("notes");
      }
    } else if (!wsId && activeWorkspace) {
      // URL has no workspace param but we have an active one — user pressed back
      setActiveWorkspace(null);
      if (!tabParam) setActiveTab("workspaces");
    }
  }, [searchParams, workspaces]);

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
      try {
        const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete note");
        fetchNotesAndWorkspaces();
      } catch (err) {
        console.error(err);
        alert("Could not delete the note.");
      }
    }
  };

  const handleToggleFavourite = async (note: NoteItem) => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favourite: !note.is_favourite }),
      });
      if (!res.ok) throw new Error("Failed to toggle favourite");
      fetchNotesAndWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Could not update the note.");
    }
  };

  const handleTogglePin = async (note: NoteItem) => {
    try {
      const isFavTab = activeTab === "favourites";
      const body = isFavTab
        ? { is_pinned_in_favourites: !note.is_pinned_in_favourites }
        : { is_pinned: !note.is_pinned };

      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      fetchNotesAndWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Could not update the note.");
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
      try {
        const res = await fetch(`/api/workspaces/${workspace.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete workspace");

        // If we just deleted the workspace we were currently viewing, go back to root
        if (activeWorkspace?.id === workspace.id) {
          setActiveWorkspace(null);
          router.push("/library", { scroll: false });
        }

        fetchNotesAndWorkspaces();
      } catch (err) {
        console.error(err);
        alert("Could not delete the workspace.");
      }
    }
  };

  const handleTogglePinWorkspace = async (workspace: Workspace) => {
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !workspace.is_pinned }),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      fetchNotesAndWorkspaces();
    } catch (err) {
      console.error(err);
      alert("Could not update the workspace.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F3EF] dark:bg-[#1A1A1A] text-[#252525] dark:text-white px-4 sm:px-6 lg:px-8 overflow-hidden transition-colors">
      <div className="flex items-center gap-3 pt-[calc(env(safe-area-inset-top,0px)+8px)] sm:pt-6 pb-2">
        <SidebarToggleButton />
        {activeWorkspace && (
          <button
            onClick={handleBackToWorkspaces}
            className="text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors bg-[#F0EDE8] dark:bg-[#545454] p-2 rounded-lg"
            title="Back to Workspaces"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 className="text-[23px] sm:text-2xl font-extrabold text-[#252525] dark:text-white tracking-tight transition-colors">
            {activeWorkspace ? activeWorkspace.name : "My Library"}
          </h1>
          <p className="text-xs text-[#7D7D7D] mt-0.5">
            {activeWorkspace
              ? activeWorkspace.description || "Manage notes in this workspace"
              : "Manage and organize your data"}
          </p>
        </div>
      </div>

      <div className="flex flex-row justify-between items-center gap-3 mb-3 w-full">
        <div className="relative flex-1 sm:w-80 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#7D7D7D]" size={16} />
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
              className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Plus size={18} />
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Workspace</span>
            </button>
          ) : (
            <>
              {activeTab !== "notes" && activeTab !== "favourites" && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Upload size={18} />
                  <span className="sm:hidden">Upload</span>
                  <span className="hidden sm:inline">Upload File</span>
                </button>
              )}

              {activeTab !== "pdfs" && activeTab !== "favourites" && (
                <button
                  onClick={handleCreateNativeNote}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Plus size={18} />
                  <span className="sm:hidden">Create</span>
                  <span className="hidden sm:inline">Create Note</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-[#E8E5E0] dark:border-[#545454] mb-4 transition-colors justify-between items-end gap-2 w-full relative">
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex overflow-x-auto flex-nowrap pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x w-full pr-10"
          >
            {!activeWorkspace && (
              <button
                onClick={() => setActiveTab("workspaces")}
                className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${activeTab === "workspaces"
                  ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
                  : "border-transparent text-[#545454] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white"
                  }`}
              >
                Workspaces
              </button>
            )}
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${activeTab === "notes"
                ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
                : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab("pdfs")}
              className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 whitespace-nowrap snap-start transition-colors ${activeTab === "pdfs"
                ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
                : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setActiveTab("favourites")}
              className={`px-1 py-2 border-b-2 font-medium text-sm mr-2 whitespace-nowrap snap-start transition-colors ${activeTab === "favourites"
                ? "border-[#252525] dark:border-white text-[#252525] dark:text-white"
                : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white"
                }`}
            >
              Favourites
            </button>
          </div>

          {/* Right Scroll Indicator for Mobile */}
          <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-[#F5F3EF] dark:from-[#1A1A1A] to-transparent pointer-events-none flex justify-end items-center pr-0 sm:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#7D7D7D] dark:text-[#545454]"><path d="m9 18 6-6-6-6" /></svg>
          </div>
        </div>

        <div className="flex gap-2 pb-2 shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition-colors ${viewMode === "grid"
              ? "bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-white"
              : "text-[#7D7D7D] hover:bg-[#F0F0F0] dark:hover:bg-[#252525]"
              }`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list"
              ? "bg-[#F0EDE8] dark:bg-[#545454] text-[#252525] dark:text-white"
              : "text-[#7D7D7D] hover:bg-[#F0F0F0] dark:hover:bg-[#252525]"
              }`}
            title="List View"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto min-h-0 pr-2 pb-0">
        {isLoading ? (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 pt-1 animate-pulse"
              : "grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1 animate-pulse"
          }>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`rounded-2xl bg-white dark:bg-white/5 border border-[#E8E5E0] dark:border-[#545454]/20 p-4 sm:p-5 flex flex-col justify-between ${viewMode === 'list' ? 'h-24 flex-row items-center' : 'h-40 sm:h-[180px]'}`}>
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
          </div>
        ) : activeTab === "workspaces" && !activeWorkspace ? (
          filteredWorkspaces.length > 0 ? (
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
                : "grid grid-cols-1 lg:grid-cols-2 gap-4"
            }>
              {filteredWorkspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  onClick={handleOpenWorkspace}
                  viewMode={viewMode}
                  onRename={handleRenameWorkspaceClick}
                  onDelete={handleDeleteWorkspaceClick}
                  onTogglePin={handleTogglePinWorkspace}
                />
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#545454] dark:text-[#7D7D7D] border-2 border-dashed border-[#E8E5E0] dark:border-[#545454] rounded-2xl transition-colors">
              <div className="w-16 h-16 mb-4 rounded-full bg-white/80 backdrop-blur-md dark:bg-[#252525] flex items-center justify-center shadow-sm transition-colors">
                <Search size={28} className="text-[#252525] dark:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-bold text-[#252525] dark:text-white mb-1 transition-colors">No workspaces found</h3>
              <p className="text-sm">
                {searchQuery
                  ? "Try adjusting your search query."
                  : "Create a workspace to organize your files."}
              </p>
            </div>
          )
        ) : filteredNotes.length > 0 ? (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
              : "grid grid-cols-1 lg:grid-cols-2 gap-4"
          }>
            {filteredNotes.map((note) => (
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
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#545454] dark:text-[#7D7D7D] border-2 border-dashed border-[#DEDBD6] dark:border-[#545454] rounded-2xl transition-colors">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/80 backdrop-blur-md dark:bg-[#252525] flex items-center justify-center shadow-sm transition-colors">
              <Search size={28} className="text-[#252525] dark:text-[#CFCFCF] transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-[#252525] dark:text-[#CFCFCF] mb-1 transition-colors">No files found</h3>
            <p className="text-sm">
              {searchQuery
                ? "Try adjusting your search query."
                : activeWorkspace
                  ? "Upload a file or create a note in this workspace."
                  : "Upload a file or create a note to get started."}
            </p>
          </div>
        )}
      </div>

      <UploadNoteModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchNotesAndWorkspaces}
        workspaceId={activeWorkspace?.id}
      />
      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onSuccess={fetchNotesAndWorkspaces}
      />
      <RenameWorkspaceModal
        isOpen={isRenameWorkspaceModalOpen}
        onClose={() => setIsRenameWorkspaceModalOpen(false)}
        onSuccess={fetchNotesAndWorkspaces}
        workspace={selectedWorkspaceForRename}
      />
      <RenameNoteModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onSuccess={fetchNotesAndWorkspaces}
        note={selectedNote}
      />
      <MoveNoteModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onSuccess={fetchNotesAndWorkspaces}
        note={selectedNote}
        workspaces={workspaces}
      />
    </div >
  );
}
