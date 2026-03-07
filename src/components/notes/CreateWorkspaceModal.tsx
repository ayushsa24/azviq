import React, { useState } from "react";
import { X, Loader2, FolderPlus } from "lucide-react";

interface CreateWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Please enter a workspace name.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, description }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create workspace.");
            }

            setName("");
            setDescription("");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create workspace.");
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
                    <FolderPlus size={24} className="text-[#545454] dark:text-[#545454]" />
                    Create Workspace
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreate} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Biology 101"
                            className="w-full bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#545454] rounded-lg px-4 py-3 text-[#252525] dark:text-white placeholder-[#545454] dark:placeholder-[#7D7D7D] focus:outline-none focus:border-[#7D7D7D] transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What goes in this workspace?"
                            rows={3}
                            className="w-full bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#545454] rounded-lg px-4 py-3 text-[#252525] dark:text-white placeholder-[#545454] dark:placeholder-[#7D7D7D] focus:outline-none focus:border-[#7D7D7D] transition-colors resize-none"
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
                                    Creating...
                                </>
                            ) : (
                                "Create"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
