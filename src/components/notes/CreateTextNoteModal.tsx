import React, { useState } from "react";
import { X, Loader2, FilePlus } from "lucide-react";

interface CreateTextNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workspaceId?: string;
}

export function CreateTextNoteModal({ isOpen, onClose, onSuccess, workspaceId }: CreateTextNoteModalProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Please enter a title.");
            return;
        }
        if (!content.trim()) {
            setError("Please enter some content for your note.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            // Convert text content to a Blob (txt file)
            const blob = new Blob([content], { type: "text/plain" });
            const file = new File([blob], `${title}.txt`, { type: "text/plain" });

            const formData = new FormData();
            formData.append("title", title);
            formData.append("file", file);
            if (workspaceId) {
                formData.append("workspace_id", workspaceId);
            }

            const res = await fetch("/api/notes", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Failed to save note record.");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create note.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-[#252525] border border-[#CFCFCF] dark:border-[#7D7D7D] w-full max-w-2xl rounded-xl p-6 relative shadow-xl transition-colors">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-[#252525] dark:text-[#CFCFCF] mb-6 flex items-center gap-2 transition-colors">
                    <FilePlus size={24} className="text-[#545454] dark:text-[#545454]" />
                    Create Note
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreate} className="space-y-5">
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your note a title..."
                            className="w-full bg-transparent border-b border-[#CFCFCF] dark:border-[#545454] px-2 py-3 text-lg text-[#252525] dark:text-[#CFCFCF] placeholder-[#545454] dark:placeholder-[#7D7D7D] focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#CFCFCF] transition-colors"
                        />
                    </div>

                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your note here..."
                            rows={10}
                            className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#CFCFCF] dark:border-[#545454] rounded-lg px-4 py-3 text-[#252525] dark:text-[#CFCFCF] placeholder-[#545454] dark:placeholder-[#7D7D7D] focus:outline-none focus:border-[#7D7D7D] transition-colors resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg font-medium text-[#545454] dark:text-[#CFCFCF] bg-transparent border border-[#CFCFCF] dark:border-[#545454] hover:bg-[#F5F5F5] dark:hover:bg-[#545454]/30 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg font-medium text-white dark:text-[#252525] bg-[#252525] dark:bg-[#CFCFCF] hover:bg-[#1A1A1A] dark:hover:bg-[#FFFFFF] transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                    Saving...
                                </>
                            ) : (
                                "Save Note"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
