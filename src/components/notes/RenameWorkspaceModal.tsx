import React, { useState, useEffect } from "react";
import { X, Loader2, Edit2, Type, AlignLeft } from "lucide-react";
import { Workspace } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface RenameWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workspace: Workspace | null;
}

export function RenameWorkspaceModal({ isOpen, onClose, onSuccess, workspace }: RenameWorkspaceModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (workspace) {
            setName(workspace.name);
            setDescription(workspace.description || "");
        }
    }, [workspace]);

    if (!isOpen || !workspace) return null;

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError("Please enter a workspace name.");
            return;
        }

        if (name.trim() === workspace.name && description.trim() === (workspace.description || "")) {
            onClose();
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const res = await fetch(`/api/workspaces/${workspace.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim()
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update workspace.");
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to update workspace.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && workspace && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#2E2E2E] w-full max-w-sm rounded-2xl p-6 md:p-7 relative shadow-2xl transition-colors z-[160]"
                    >
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 p-2 rounded-full text-[#7D7D7D] hover:bg-[#F5F3EF] dark:hover:bg-[#252525] transition-colors"
                        >
                            <X size={18} />
                        </button>
        
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-[#252525] dark:text-white flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-[#F5F3EF] dark:bg-[#252525]">
                                    <Edit2 size={18} className="text-[#252525] dark:text-white" />
                                </div>
                                Rename Workspace
                            </h2>
                        </div>
        
                        {error && (
                            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-xl flex items-center gap-2">
                                <X size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}
        
                        <form onSubmit={handleRename} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-[#7D7D7D] flex items-center gap-2">
                                    <Type size={14} />
                                    Workspace Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Biology 101"
                                    className="w-full bg-[#F5F3EF] dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#333] rounded-xl px-4 py-3 text-[#252525] dark:text-white placeholder-[#7D7D7D] outline-none focus:border-[#7D7D7D] dark:focus:border-[#545454] transition-all font-medium"
                                    autoFocus
                                />
                            </div>
        
                            <div className="space-y-2">
                                <label className="text-[13px] font-bold uppercase tracking-wider text-[#7D7D7D] flex items-center gap-2">
                                    <AlignLeft size={14} />
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe this workspace..."
                                    className="w-full bg-[#F5F3EF] dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#333] rounded-xl px-4 py-3 text-[#252525] dark:text-white placeholder-[#7D7D7D] outline-none focus:border-[#7D7D7D] dark:focus:border-[#545454] transition-all font-medium resize-none h-28"
                                />
                            </div>
        
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-[#252525] dark:text-white border border-[#E8E5E0] dark:border-[#333] hover:bg-[#F5F3EF] dark:hover:bg-[#252525] transition-all disabled:opacity-50 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[1.5] px-6 py-3 rounded-xl font-bold text-white dark:text-[#252525] bg-[#252525] dark:bg-white hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed active:scale-95"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" size={18} />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
