import React, { useState } from "react";
import { X, UploadCloud, Loader2 } from "lucide-react";

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

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-[#252525] border border-[#CFCFCF] dark:border-[#7D7D7D] w-full max-w-md rounded-xl p-6 relative shadow-xl transition-colors">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-[#252525] dark:text-[#CFCFCF] mb-6 transition-colors">Upload Note</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg transition-colors">
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpload} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1 transition-colors">
                            Note Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Biology Lecture 1"
                            className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#CFCFCF] dark:border-[#545454] rounded-lg px-4 py-2 text-[#252525] dark:text-[#CFCFCF] focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#7D7D7D] transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1 transition-colors">
                            File (PDF)
                        </label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-[#F5F5F5] dark:bg-[#1A1A1A] border-[#CFCFCF] dark:border-[#545454] hover:bg-white dark:hover:bg-[#252525] hover:border-[#7D7D7D] transition-all">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 text-[#545454] dark:text-[#7D7D7D] mb-2 transition-colors" />
                                    <p className="mb-1 text-sm text-[#252525] dark:text-[#CFCFCF] transition-colors">
                                        {file ? file.name : <span className="font-semibold">Click to upload</span>}
                                    </p>
                                    <p className="text-xs text-[#545454] dark:text-[#7D7D7D] transition-colors">
                                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF up to 10MB"}
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
                        className="w-full py-2.5 rounded-lg font-medium text-white dark:text-[#252525] bg-[#252525] dark:bg-[#CFCFCF] hover:bg-[#1A1A1A] dark:hover:bg-[#FFFFFF] transition-colors flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={18} />
                                Uploading...
                            </>
                        ) : (
                            "Upload File"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
