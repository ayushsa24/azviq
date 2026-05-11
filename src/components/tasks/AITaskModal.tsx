import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, ChevronDown, Crown, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import Modal from "@/components/ui/Modal";

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
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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
        <Modal open={isOpen} onClose={onClose} title="Generate with AI">
            <div className="space-y-5">
                {/* AI Header Style matching Create Workspace style header if needed, but Modal provides title */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E5E0] dark:border-[#545454] bg-white dark:bg-[#252525] shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-[#252525] dark:text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[#252525] dark:text-white leading-tight">
                            AI Breakdown
                        </h3>
                        <p className="text-[11px] text-[#7D7D7D] dark:text-[#BABABA]">Turn goals into actionable tasks automatically</p>
                    </div>
                </div>

                {error && (
                    <div className={`p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm
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

                <form onSubmit={handleGenerate} className="space-y-5 pb-1">
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
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className={`w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-2.5 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] transition-all cursor-pointer shadow-sm flex items-center justify-between ${isDropdownOpen ? 'ring-2 ring-black/5 dark:ring-white/5 border-[#7D7D7D]' : ''}`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {projectId ? (
                                        <>
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projects.find(p => p.id === projectId)?.color_theme || '#7D7D7D' }} />
                                            <span className="truncate">{projects.find(p => p.id === projectId)?.title}</span>
                                        </>
                                    ) : (
                                        <span className="text-gray-500 dark:text-gray-400">No Project</span>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="absolute z-[100] w-full mt-2 bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.3)] overflow-hidden"
                                    >
                                        <div className="p-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setProjectId("");
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${!projectId ? 'bg-[#F5F3EF] dark:bg-[#333] font-bold text-[#252525] dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-[#F5F3EF] dark:hover:bg-[#333] hover:text-[#252525] dark:hover:text-white'}`}
                                            >
                                                <span>No Project</span>
                                                {!projectId && <Check size={14} className="text-[#252525] dark:text-white" />}
                                            </button>
                                            
                                            {projects.length > 0 && <div className="h-px bg-[#E8E5E0] dark:bg-[#333] my-1 mx-2" />}
                                            
                                            {projects.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setProjectId(p.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between group ${projectId === p.id ? 'bg-[#F5F3EF] dark:bg-[#333] font-bold text-[#252525] dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-[#F5F3EF] dark:hover:bg-[#333] hover:text-[#252525] dark:hover:text-white'}`}
                                                >
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color_theme || '#7D7D7D' }} />
                                                        <span className="truncate">{p.title}</span>
                                                    </div>
                                                    {projectId === p.id && <Check size={14} className="text-[#252525] dark:text-white" />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#E8E5E0] dark:bg-[#252525] text-[#545454] dark:text-[#BABABA] hover:bg-[#E8E5E1] dark:hover:bg-[#333] transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[1.5] py-3 bg-[#252525] dark:bg-white hover:bg-black dark:hover:bg-white/90 text-white dark:text-[#252525] rounded-xl text-sm font-bold transition-all flex justify-center items-center shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                </form>
            </div>
        </Modal>
    );
}
