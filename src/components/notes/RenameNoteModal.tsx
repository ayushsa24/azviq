import React, { useState, useEffect } from "react";
import { X, Loader2, Edit2 } from "lucide-react";
import { NoteItem } from "./NoteCard";

interface RenameNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    note: NoteItem | null;
}

export function RenameNoteModal({ isOpen, onClose, onSuccess, note }: RenameNoteModalProps) {
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (note) {
            setTitle(note.title);
        }
    }, [note]);

    if (!isOpen || !note) return null;

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Please enter a title.");
            return;
        }

        if (title.trim() === note.title) {
            onClose();
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const res = await fetch(`/api/notes/${note.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ title: title.trim() }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to rename note.");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to rename note.");
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
                    <Edit2 size={24} className="text-[#545454] dark:text-[#545454]" />
                    Rename Note
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRename} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
                            New Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter new title..."
                            className="w-full bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#545454] rounded-lg px-4 py-3 text-[#252525] dark:text-white placeholder-[#545454] dark:placeholder-[#7D7D7D] focus:outline-none focus:border-[#7D7D7D] transition-colors"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
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
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg font-medium text-white dark:text-[#252525] bg-[#252525] dark:bg-white hover:bg-[#1A1A1A] dark:hover:bg-white/90 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
