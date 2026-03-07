import React, { useState } from "react";
import { X, Loader2, MoveRight, Folder } from "lucide-react";
import { NoteItem } from "./NoteCard";
import { Workspace } from "@/types";

interface MoveNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    note: NoteItem | null;
    workspaces: Workspace[];
}

export function MoveNoteModal({ isOpen, onClose, onSuccess, note, workspaces }: MoveNoteModalProps) {
    // Current workspace ID or "root" if none
    const initialWorkspace = note?.workspace_id || "root";
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(initialWorkspace);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Reset selection when note changes
    React.useEffect(() => {
        if (note) {
            setSelectedWorkspaceId(note.workspace_id || "root");
        }
    }, [note]);

    if (!isOpen || !note) return null;

    const handleMove = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedWorkspaceId === initialWorkspace) {
            onClose();
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const newWorkspaceId = selectedWorkspaceId === "root" ? null : selectedWorkspaceId;

            const res = await fetch(`/api/notes/${note.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ workspace_id: newWorkspaceId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to move note.");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to move note.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white/80 backdrop-blur-md dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#7D7D7D] w-full max-w-md rounded-xl p-6 relative shadow-xl transition-colors">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-[#252525] dark:text-white mb-6 flex items-center gap-2 transition-colors">
                    <MoveRight size={24} className="text-[#545454] dark:text-white" />
                    Move Note
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleMove} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-3">
                            Select destination
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {/* Root Option */}
                            <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedWorkspaceId === "root"
                                ? "bg-[#F0EDE8] dark:bg-[#545454] border-[#7D7D7D]"
                                : "bg-white dark:bg-[#1A1A1A] border-[#E8E5E0] dark:border-[#545454] hover:bg-[#F5F3EF] dark:hover:bg-[#2A2A2A]"
                                }`}>
                                <input
                                    type="radio"
                                    name="workspace"
                                    value="root"
                                    checked={selectedWorkspaceId === "root"}
                                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                    className="hidden"
                                />
                                <Folder className="mr-3 text-[#545454] dark:text-white" size={20} />
                                <span className="font-medium text-[#252525] dark:text-white">Main Library (No Workspace)</span>
                            </label>

                            {/* Workspaces list */}
                            {workspaces.map((ws) => (
                                <label key={ws.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedWorkspaceId === ws.id
                                    ? "bg-[#F0EDE8] dark:bg-[#545454] border-[#7D7D7D]"
                                    : "bg-white dark:bg-[#1A1A1A] border-[#E8E5E0] dark:border-[#545454] hover:bg-[#F5F3EF] dark:hover:bg-[#2A2A2A]"
                                    }`}>
                                    <input
                                        type="radio"
                                        name="workspace"
                                        value={ws.id}
                                        checked={selectedWorkspaceId === ws.id}
                                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                                        className="hidden"
                                    />
                                    <Folder fill="currentColor" className="mr-3 text-[#7D7D7D] dark:text-[#7D7D7D] opacity-20" size={20} />
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[#252525] dark:text-white">{ws.name}</span>
                                        {ws.description && <span className="text-xs text-[#545454] dark:text-[#7D7D7D] truncate max-w-[200px]">{ws.description}</span>}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E5E0] dark:border-[#545454]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg font-medium text-[#545454] dark:text-white bg-transparent border border-[#E8E5E0] dark:border-[#545454] hover:bg-[#F5F3EF] dark:hover:bg-[#545454]/30 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || selectedWorkspaceId === initialWorkspace}
                            className="px-6 py-2.5 rounded-lg font-medium text-white dark:text-[#252525] bg-[#252525] dark:bg-white hover:bg-[#1A1A1A] dark:hover:bg-white/90 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                    Moving...
                                </>
                            ) : (
                                "Move"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
