import React, { useState } from "react";
import { Loader2, FolderPlus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Modal from "@/components/ui/Modal";

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
    const { theme } = useTheme();
    const isDark = theme === 'dark';

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
        <Modal open={isOpen} onClose={onClose} title="New Workspace">
            <div className={`py-2 ${isDark ? 'text-[#CFCFCF]' : 'text-[#252525]'}`}>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleCreate} className="space-y-5">
                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-[#7D7D7D]' : 'text-[#545454]'}`}>
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Biology 101"
                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${
                                isDark 
                                ? 'bg-[#1A1A1A] border-[#333] text-white focus:border-[#545454]' 
                                : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#252525] focus:border-[#7D7D7D]'
                            }`}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-[#7D7D7D]' : 'text-[#545454]'}`}>
                            Description (Optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What goes in this workspace?"
                            rows={3}
                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-none ${
                                isDark 
                                ? 'bg-[#1A1A1A] border-[#333] text-white focus:border-[#545454]' 
                                : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#252525] focus:border-[#7D7D7D]'
                            }`}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                isDark 
                                ? 'bg-[#252525] text-gray-300 hover:bg-[#333]' 
                                : 'bg-[#E8E5E0] text-gray-700 hover:bg-[#E8E5E1]'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                !isLoading
                                ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                                : isDark ? 'bg-[#252525] text-[#545454] cursor-not-allowed' : 'bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed'
                            }`}
                        >
                            {isLoading && <Loader2 className="animate-spin" size={16} />}
                            {isLoading ? "Creating..." : "Create Workspace"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
