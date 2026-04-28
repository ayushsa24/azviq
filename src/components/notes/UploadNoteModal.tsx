import React, { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Modal from "@/components/ui/Modal";

interface UploadNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    workspaceId?: string;
}

export function UploadNoteModal({ isOpen, onClose, onSuccess, workspaceId }: UploadNoteModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError("Please select a file to upload.");
            return;
        }
        if (!title.trim()) {
            setError("Please enter a title.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

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
            setError(err.message || "Failed to upload note.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal open={isOpen} onClose={onClose} title="Upload pdf">
            <div className={`py-2 ${isDark ? 'text-[#CFCFCF]' : 'text-[#252525]'}`}>
                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-5">
                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-[#7D7D7D]' : 'text-[#545454]'}`}>
                            Note Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Biology Lecture 1"
                            className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all ${isDark
                                ? 'bg-[#1A1A1A] border-[#333] text-white focus:border-[#545454]'
                                : 'bg-[#F0EDE8] border-[#E8E5E0] text-[#252525] focus:border-[#7D7D7D]'
                                }`}
                        />
                    </div>

                    <div>
                        <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-[#7D7D7D]' : 'text-[#545454]'}`}>
                            File (PDF)
                        </label>
                        <div className="flex items-center justify-center w-full">
                            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDark
                                ? 'bg-[#1A1A1A] border-[#333] hover:bg-[#252525] hover:border-[#545454]'
                                : 'bg-[#F0EDE8] border-[#E8E5E0] hover:bg-[#E8E5E1] hover:border-[#7D7D7D]'
                                }`}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className={`w-8 h-8 mb-2 ${isDark ? 'text-[#7D7D7D]' : 'text-[#545454]'}`} />
                                    <p className="mb-1 text-sm font-medium">
                                        {file ? file.name : "Choose a PDF Note"}
                                    </p>
                                    <p className={`text-xs ${isDark ? 'text-[#7D7D7D]' : 'text-[#9E9E9E]'}`}>
                                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Up to 8MB"}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const selected = e.target.files?.[0];
                                        if (selected) {
                                            setFile(selected);
                                            if (!title) setTitle(selected.name.replace(".pdf", ""));
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${!isLoading
                            ? isDark ? 'bg-white text-[#252525] hover:bg-white/90' : 'bg-[#252525] text-white hover:bg-[#1A1A1A]'
                            : isDark ? 'bg-[#252525] text-[#545454] cursor-not-allowed' : 'bg-[#E8E5E0] text-[#9E9E9E] cursor-not-allowed'
                            }`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                        {isLoading ? "Uploading..." : "Upload Note"}
                    </button>
                </form>
            </div>
        </Modal>
    );
}
