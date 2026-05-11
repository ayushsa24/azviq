import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [colorTheme, setColorTheme] = useState("blue");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const themeColors = [
    { name: "blue", class: "bg-blue-500" },
    { name: "purple", class: "bg-purple-500" },
    { name: "green", class: "bg-green-500" },
    { name: "red", class: "bg-red-500" },
    { name: "orange", class: "bg-orange-500" },
    { name: "gray", class: "bg-gray-500" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a project title.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, color_theme: colorTheme }),
      });

      if (!res.ok) throw new Error("Failed to create project");

      setTitle("");
      setColorTheme("blue");
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex flex-col sm:justify-center sm:items-center px-0 sm:px-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
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
            className="bg-[#F5F3EF] dark:bg-[#1A1A1A] w-full sm:max-w-md rounded-t-[20px] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative border-none sm:border sm:border-[#E8E5E0] sm:dark:border-[#545454] mt-auto sm:mt-0 z-10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-full flex justify-center pt-0 pb-6 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700/50 rounded-full" />
            </div>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-[#252525] dark:text-white mb-6">
              Create New Project
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] mb-1.5 uppercase tracking-[0.1em]">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Science Fair"
                  className="w-full bg-white dark:bg-[#252525] border border-[#E8E5E0] dark:border-[#545454] rounded-xl px-4 py-3 text-sm text-[#252525] dark:text-white focus:outline-none focus:border-[#7D7D7D] transition-all shadow-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#7D7D7D] dark:text-[#BABABA] mb-3 uppercase tracking-[0.1em]">
                  Color Theme
                </label>
                <div className="flex gap-4 flex-wrap">
                  {themeColors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setColorTheme(color.name)}
                      className={`w-9 h-9 rounded-full ${color.class} ${colorTheme === color.name ? "ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-[#1A1A1A]" : "opacity-80 hover:opacity-100"} transition-all shadow-sm`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-white dark:text-[#252525] bg-[#252525] dark:bg-white hover:bg-black dark:hover:bg-white/90 transition-all flex justify-center items-center shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mb-2 sm:mb-0"
              >
                {isLoading ? (
                  <>
                    <div className="spinner-elegant !w-3.5 !h-3.5 text-white dark:text-[#252525] mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create Project"
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
