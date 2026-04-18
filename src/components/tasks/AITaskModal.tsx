import React, { useState, useEffect } from "react";
import { X, Sparkles, Loader2, ChevronDown, Crown, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";

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
    const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
    const { openSettings } = useSettings();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
            const msg = err.message || "Something went wrong.";
            setError(msg);
            if (msg.includes("Daily limit reached") || msg.includes("QUOTA_EXCEEDED")) {
                setIsQuotaExceeded(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex flex-col sm:justify-center sm:items-center px-0 sm:px-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 sm:backdrop-blur-sm"
                    />

                    {/* Sheet/Modal Container */}
                    <motion.div
                        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
                        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                        transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
                        drag={isMobile ? "y" : false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 150) onClose();
                        }}
                        className="bg-[#F5F3EF] dark:bg-[#1A1A1A] w-full sm:max-w-md rounded-t-[20px] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454] mt-auto sm:mt-0 z-10 p-5 sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Mobile Drag Handle */}
                        <div className="sm:hidden w-full flex justify-center pt-0 pb-4 cursor-grab active:cursor-grabbing">
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
                        </div>

                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 z-[20] text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#252525] shadow-sm border border-[#E8E5E0] dark:border-[#545454] flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-6 h-6 text-[#252525] dark:text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[#252525] dark:text-white">
                                    Generate with AI
                                </h2>
                                <p className="text-xs text-[#7D7D7D] dark:text-[#BABABA]">Break down goals into actionable tasks</p>
                            </div>
                        </div>

                        {error && (
                            <div className={`mb-4 p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm
                                ${isQuotaExceeded 
                                    ? "bg-[#C2A27A]/10 border border-[#C2A27A]/30 text-[#8B6F4E] dark:text-[#C2A27A]" 
                                    : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400"
                                }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                                    ${isQuotaExceeded ? "bg-[#C2A27A]/20" : "bg-red-500/10"}`}>
                                    {isQuotaExceeded ? <Crown size={16} className="text-[#C2A27A]" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5
                                        ${isQuotaExceeded ? "text-[#C2A27A]" : "text-red-500"}`}>
                                        {isQuotaExceeded ? "Limit Reached" : "Error"}
                                    </p>
                                    <p className="text-xs leading-relaxed">
                                        {error}
                                    </p>
                                    {isQuotaExceeded && (
                                        <button 
                                            onClick={() => openSettings("subscription")}
                                            className="mt-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#C2A27A] hover:underline"
                                        >
                                            Upgrade Plan
                                            <ArrowRight size={10} />
                                        </button>
                                    )}
                                </div>
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
                                    className="w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-3 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] dark:focus:border-[#7D7D7D] transition-all resize-none shadow-sm"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] mb-1.5 uppercase tracking-[0.1em]">
                                    Add to Project (Optional)
                                </label>
                                <div className="relative">
                                    <select
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-2.5 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] transition-all cursor-pointer shadow-sm appearance-none"
                                    >
                                        <option value="">No Project</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 bg-[#252525] dark:bg-white hover:bg-black dark:hover:bg-white/90 text-white dark:text-[#252525] rounded-xl text-sm font-semibold transition-all flex justify-center items-center shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-2 sm:mb-0"
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
                    </motion.div>
                    <div className="h-[env(safe-area-inset-bottom,20px)] sm:hidden bg-[#F5F3EF] dark:bg-[#1A1A1A]" />
                </div>
            )}
        </AnimatePresence>
    );
}
