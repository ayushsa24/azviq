import React, { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";

interface AITaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projects?: any[];
}

export function AITaskModal({
    isOpen,
    onClose,
    onSuccess,
    projects = [],
}: AITaskModalProps) {
    const [prompt, setPrompt] = useState("");
    const [projectId, setProjectId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setError("Please enter what you want to achieve.");
            return;
        }

        try {
            setIsLoading(true);
            setError("");

            const aiRes = await fetch("/api/tasks/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            if (!aiRes.ok) throw new Error("Failed to generate tasks");

            const { tasks } = await aiRes.json();

            if (!tasks || tasks.length === 0) {
                throw new Error("No tasks were generated. Please try a different prompt.");
            }

            // Automatically create these tasks
            const createPromises = tasks.map((task: any) =>
                fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: task.title,
                        status: task.status || "not_started",
                        project_id: projectId || undefined,
                    }),
                })
            );

            await Promise.all(createPromises);

            setPrompt("");
            setProjectId("");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong.");
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

                <h2 className="text-xl flex items-center gap-2 font-bold text-[#252525] dark:text-[#CFCFCF] mb-6">
                    <Sparkles className="w-5 h-5 text-[#545454] dark:text-[#CFCFCF]" />
                    Generate with AI
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
                            What do you need to do?
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. Help me write a 5-page history essay by Friday"
                            rows={4}
                            className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#CFCFCF] dark:border-[#545454] rounded-lg px-4 py-3 text-[#252525] dark:text-[#CFCFCF] focus:outline-none focus:border-[#7D7D7D] transition-colors resize-none"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
                            Add to Project (Optional)
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#CFCFCF] dark:border-[#545454] rounded-lg px-4 py-2 text-[#252525] dark:text-[#CFCFCF] focus:outline-none focus:border-[#7D7D7D] transition-colors"
                        >
                            <option value="">No Project</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-2.5 bg-[#252525] dark:bg-[#CFCFCF] hover:bg-[#1A1A1A] dark:hover:bg-white text-white dark:text-[#252525] rounded-lg font-medium transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={18} />
                                Generating...
                            </>
                        ) : (
                            "Generate Breakdown"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
