import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";

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

  const themeColors = [
    { name: "blue", class: "bg-blue-500" },
    { name: "purple", class: "bg-purple-500" },
    { name: "green", class: "bg-green-500" },
    { name: "red", class: "bg-red-500" },
    { name: "orange", class: "bg-orange-500" },
    { name: "gray", class: "bg-gray-500" },
  ];

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#252525] border border-[#CFCFCF] dark:border-[#7D7D7D] w-full max-w-md rounded-xl p-6 relative shadow-xl transition-colors">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#545454] dark:text-[#7D7D7D] hover:text-[#252525] dark:hover:text-[#CFCFCF] transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[#252525] dark:text-[#CFCFCF] mb-6">
          Create New Project
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Science Fair"
              className="w-full bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#CFCFCF] dark:border-[#545454] rounded-lg px-4 py-2 text-[#252525] dark:text-[#CFCFCF] focus:outline-none focus:border-[#7D7D7D] transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#545454] dark:text-[#7D7D7D] mb-2">
              Color Theme
            </label>
            <div className="flex gap-3">
              {themeColors.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setColorTheme(color.name)}
                  className={`w-8 h-8 rounded-full ${color.class} ${colorTheme === color.name ? "ring-2 ring-offset-2 ring-black dark:ring-white dark:ring-offset-[#252525]" : "opacity-80 hover:opacity-100"} transition-all`}
                  title={color.name}
                />
              ))}
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
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
