"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Upload, Plus, LayoutGrid, List, ArrowLeft } from "lucide-react";
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
  const [viewMode, setViewModeState] = useState<"grid" | "list">("grid");
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  useEffect(() => {
    // Clear the search query whenever this component mounts
    setSearchQuery("");

    const savedTab = sessionStorage.getItem('libraryActiveTab');
    if (savedTab) {
      setActiveTabState(savedTab as any);
    }

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
    sessionStorage.setItem('libraryActiveTab', tab);
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

  // Sync workspace state with URL (handles browser back/forward)
  useEffect(() => {
    const wsId = searchParams.get("workspace");
    if (wsId && workspaces.length > 0) {
      const found = workspaces.find((w) => w.id === wsId);
      if (found && activeWorkspace?.id !== found.id) {
        setActiveWorkspace(found);
        setActiveTab("notes");
      }
    } else if (!wsId && activeWorkspace) {
      // URL has no workspace param but we have an active one — user pressed back
      setActiveWorkspace(null);
      setActiveTab("workspaces");
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
    <div className="flex flex-col h-full bg-[#F5F5F5] dark:bg-[#1A1A1A] text-[#252525] dark:text-[#CFCFCF] p-4 sm:p-6 lg:p-8 overflow-hidden transition-colors">
      <div className="flex flex-col mb-5">
        <div className="flex items-center gap-3">
          {activeWorkspace && (
            <button
              onClick={handleBackToWorkspaces}
              className="text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors bg-[#E0E0E0] dark:bg-[#545454] p-2 rounded-lg"
              title="Back to Workspaces"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-3xl font-extrabold text-[#252525] dark:text-[#CFCFCF] tracking-tight transition-colors">
            {activeWorkspace ? activeWorkspace.name : "My Library"}
          </h1>
        </div>
        <p className="text-[#545454] dark:text-[#7D7D7D] mt-1 transition-colors">
          {activeWorkspace
            ? activeWorkspace.description || "Manage notes in this workspace"
            : "Manage and organize your study materials"
          }
        </p>
      </div>

      <div className="flex flex-row justify-between items-center gap-3 mb-5 w-full">
        <div className="relative flex-1 sm:w-96 sm:flex-none text-[#252525] dark:text-[#CFCFCF]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#545454] dark:text-[#7D7D7D] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#252525] border border-[#CFCFCF] dark:border-[#545454] rounded-full py-2 sm:py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#7D7D7D] focus:ring-1 focus:ring-[#7D7D7D] dark:focus:ring-[#7D7D7D] transition-all"
          />
        </div>

        <div className="flex gap-2 sm:gap-3 shrink-0">
          {!activeWorkspace && activeTab === "workspaces" ? (
            <button
              onClick={() => setIsWorkspaceModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Create Workspace</span>
            </button>
          ) : (
            <>
              {activeTab !== "notes" && activeTab !== "favourites" && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Upload size={18} />
                  <span className="hidden sm:inline">Upload File</span>
                </button>
              )}

              {activeTab !== "pdfs" && activeTab !== "favourites" && (
                <button
                  onClick={handleCreateNativeNote}
                  className="flex items-center justify-center gap-2 bg-[#252525] dark:bg-[#CFCFCF] text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-medium transition-all shadow-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Create Note</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-[#CFCFCF] dark:border-[#545454] mb-4 transition-colors justify-between items-end">
        <div className="flex">
          {!activeWorkspace && (
            <button
              onClick={() => setActiveTab("workspaces")}
              className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "workspaces"
                ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
                : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
                }`}
            >
              Workspaces
            </button>
          )}
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "notes"
              ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
              : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
              }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab("pdfs")}
            className={`px-1 py-2 border-b-2 font-medium text-sm mr-6 transition-colors ${activeTab === "pdfs"
              ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
              : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
              }`}
          >
            PDFs
          </button>
          <button
            onClick={() => setActiveTab("favourites")}
            className={`px-1 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === "favourites"
              ? "border-[#252525] dark:border-[#CFCFCF] text-[#252525] dark:text-[#CFCFCF]"
              : "border-transparent text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF]"
              }`}
          >
            Favourites
          </button>
        </div>

        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition-colors ${viewMode === "grid"
              ? "bg-[#E0E0E0] dark:bg-[#545454] text-[#252525] dark:text-[#CFCFCF]"
              : "text-[#7D7D7D] hover:bg-[#F0F0F0] dark:hover:bg-[#252525]"
              }`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list"
              ? "bg-[#E0E0E0] dark:bg-[#545454] text-[#252525] dark:text-[#CFCFCF]"
              : "text-[#7D7D7D] hover:bg-[#F0F0F0] dark:hover:bg-[#252525]"
              }`}
            title="List View"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2 pb-2">
        {isLoading ? (
          <div className="flex-1 h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#252525] dark:border-[#CFCFCF] transition-colors"></div>
          </div>
        ) : activeTab === "workspaces" && !activeWorkspace ? (
          filteredWorkspaces.length > 0 ? (
            <div className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5"
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
            <div className="flex-1 flex flex-col items-center justify-center text-[#545454] dark:text-[#7D7D7D] border-2 border-dashed border-[#CFCFCF] dark:border-[#545454] rounded-2xl bg-[#F5F5F5] dark:bg-[#252525]/30 transition-colors">
              <div className="w-16 h-16 mb-4 rounded-full bg-white dark:bg-[#252525] flex items-center justify-center shadow-sm transition-colors">
                <Search size={28} className="text-[#545454] dark:text-[#545454] transition-colors" />
              </div>
              <h3 className="text-lg font-medium text-[#252525] dark:text-[#CFCFCF] mb-1 transition-colors">No workspaces found</h3>
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
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5"
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
          <div className="flex-1 flex flex-col items-center justify-center text-[#545454] dark:text-[#7D7D7D] border-2 border-dashed border-[#CFCFCF] dark:border-[#545454] rounded-2xl bg-[#F5F5F5] dark:bg-[#252525]/30 transition-colors">
            <div className="w-16 h-16 mb-4 rounded-full bg-white dark:bg-[#252525] flex items-center justify-center shadow-sm transition-colors">
              <Search size={28} className="text-[#545454] dark:text-[#545454] transition-colors" />
            </div>
            <h3 className="text-lg font-medium text-[#252525] dark:text-[#CFCFCF] mb-1 transition-colors">No files found</h3>
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
