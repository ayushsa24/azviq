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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
            <div className="bg-[#F5F3EF] dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] w-full max-w-md rounded-[24px] p-5 relative shadow-2xl transition-colors overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-[20] text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                >
                    <X size={20} />
                </button>

                <div className="relative mb-6 -mx-5 -mt-5 p-6 bg-white dark:bg-[#1A1A1A] border-b border-[#E8E5E0] dark:border-[#333]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F5F3EF] dark:bg-[#252525] shadow-sm border border-[#E8E5E0] dark:border-[#545454] flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-[#252525] dark:text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#252525] dark:text-white">
                                Generate with AI
                            </h2>
                            <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Break down complex goals into actionable tasks</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] mb-1.5 uppercase tracking-[0.1em]">
                            What do you need to do?
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. create a task for me to complete my assignment"
                            rows={3}
                            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-3 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#7D7D7D] transition-all resize-none shadow-sm"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] mb-1.5 uppercase tracking-[0.1em]">
                            Add to Project (Optional)
                        </label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-2.5 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] transition-all cursor-pointer shadow-sm"
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
                        className="w-full mt-1 py-2.5 bg-[#252525] dark:bg-white hover:bg-black dark:hover:bg-white/90 text-white dark:text-[#252525] rounded-lg text-sm font-semibold transition-all flex justify-center items-center shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner-elegant !w-3.5 !h-3.5 text-white dark:text-[#252525] mr-2"></div>
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
