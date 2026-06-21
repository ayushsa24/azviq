"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useProfile } from "@/contexts/ProfileContext";
import {
  Search,
  Home,
  MessageSquare,
  Folder,
  BookOpen,
  CheckSquare,
  Sun,
  Moon,
  User,
  Settings,
  Trash2,
  CreditCard,
  CornerDownLeft,
  FileText,
  Mail,
  Sparkles
} from "lucide-react";
import { ICON_MAP } from "@/components/editor/EmojiPicker";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { theme, toggleTheme } = useTheme();
  const { openSettings } = useSettings();
  const { openProfile } = useProfile();

  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Close palette and clear loading state when path or query parameters change
  useEffect(() => {
    setIsOpen(false);
    setLoadingId(null);
  }, [pathname, searchParams]);

  const [dbItems, setDbItems] = useState<{
    notes: Array<{ id: string; title: string; file_url?: string }>;
    exercises: Array<{ id: string; title: string }>;
    revisions: Array<{ id: string; title: string }>;
    tasks: Array<{ id: string; title: string }>;
    projects: Array<{ id: string; title: string }>;
    aiSessions: Array<{ id: string; title: string }>;
  }>({
    notes: [],
    exercises: [],
    revisions: [],
    tasks: [],
    projects: [],
    aiSessions: [],
  });

  // Fetch search items when opening
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        const [notesRes, exercisesRes, revisionsRes, tasksRes, projectsRes, aiSessionsRes] = await Promise.all([
          fetch("/api/notes?all=true").then((res) => res.json()),
          fetch("/api/exercises").then((res) => res.json()),
          fetch("/api/revision").then((res) => res.json()),
          fetch("/api/tasks").then((res) => res.json()),
          fetch("/api/projects").then((res) => res.json()),
          fetch("/api/personal-ai/sessions").then((res) => res.json()),
        ]);

        setDbItems({
          notes: notesRes.notes || [],
          exercises: exercisesRes.exercises || [],
          revisions: revisionsRes.revisions || [],
          tasks: tasksRes.tasks || [],
          projects: projectsRes.projects || [],
          aiSessions: aiSessionsRes.data?.sessions || [],
        });
      } catch (err) {
        console.error("Failed to fetch search items:", err);
      }
    };

    fetchData();
  }, [isOpen]);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown and custom event listeners to trigger Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    const handleCustomEvent = () => {
      setIsOpen((prev) => !prev);
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("toggle-command-palette", handleCustomEvent);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("toggle-command-palette", handleCustomEvent);
    };
  }, []);

  // Autofocus input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      // Short timeout to let motion transition complete before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands = useMemo(() => [
    {
      id: "dashboard",
      name: "Go to Dashboard",
      category: "Navigation",
      icon: Home,
      action: () => router.push("/dashboard"),
    },
    {
      id: "ai-teacher",
      name: "Go to AI Teacher Chat",
      category: "Navigation",
      icon: MessageSquare,
      action: () => router.push("/ai"),
    },
    {
      id: "library",
      name: "Go to Study Library",
      category: "Navigation",
      icon: Folder,
      action: () => router.push("/library"),
    },
    {
      id: "preparation",
      name: "Go to Preparation & Revision",
      category: "Navigation",
      icon: BookOpen,
      action: () => router.push("/preparation"),
    },
    {
      id: "tasks",
      name: "Go to Tasks & Todos",
      category: "Navigation",
      icon: CheckSquare,
      action: () => router.push("/tasks"),
    },
    {
      id: "toggle-theme",
      name: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      category: "Quick Actions",
      icon: theme === "dark" ? Sun : Moon,
      action: () => toggleTheme(),
    },
    {
      id: "profile",
      name: "Open Profile Settings",
      category: "Quick Actions",
      icon: User,
      action: () => openProfile(),
    },
    {
      id: "settings",
      name: "Open App Settings",
      category: "Quick Actions",
      icon: Settings,
      action: () => openSettings("general"),
    },
    {
      id: "trash",
      name: "View Deleted Items (Trash)",
      category: "Quick Actions",
      icon: Trash2,
      action: () => {
        window.dispatchEvent(new CustomEvent("open-trash"));
      },
    },
    {
      id: "pricing",
      name: "Manage Subscription (Upgrade)",
      category: "Quick Actions",
      icon: CreditCard,
      action: () => {
        window.dispatchEvent(new CustomEvent("open-pricing"));
      },
    },
    {
      id: "feedback",
      name: "Give Feedback / Suggestions",
      category: "Help & Legal",
      icon: MessageSquare,
      action: () => router.push("/feedback"),
    },
    {
      id: "contact",
      name: "Contact Support / Portal",
      category: "Help & Legal",
      icon: Mail,
      action: () => router.push("/contact"),
    },
    {
      id: "terms",
      name: "Terms of Service",
      category: "Help & Legal",
      icon: FileText,
      action: () => router.push("/terms"),
    },
    {
      id: "privacy",
      name: "Privacy Policy",
      category: "Help & Legal",
      icon: FileText,
      action: () => router.push("/privacy"),
    },
  ], [theme, router, toggleTheme, openProfile, openSettings]);

  const dynamicCommands = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      category: string;
      icon: any;
      action: () => void;
    }> = [];

    // Map notes & PDFs
    dbItems.notes.forEach((note) => {
      const isPdf = !!note.file_url;
      const iconMatch = note.title.match(/^\[(\w+)\]/);
      const cleanTitle = note.title.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: isPdf ? `pdf-${note.id}` : `note-${note.id}`,
        name: cleanTitle || "Untitled Material",
        category: isPdf ? "PDF Documents" : "Study Notes",
        icon: isPdf ? BookOpen : FileText,
        titleIcon: TitleIcon,
        action: () => router.push(isPdf ? `/library/pdf/${note.id}` : `/library/note/${note.id}`),
      } as any);
    });

    // Map exercises
    dbItems.exercises.forEach((ex) => {
      const iconMatch = ex.title.match(/^\[(\w+)\]/);
      const cleanTitle = ex.title.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: `exercise-${ex.id}`,
        name: cleanTitle || "Untitled Exercise",
        category: "Exercise",
        icon: CheckSquare,
        titleIcon: TitleIcon,
        action: () => router.push(`/preparation/exercise/${ex.id}`),
      } as any);
    });

    // Map revisions
    dbItems.revisions.forEach((rev) => {
      const iconMatch = rev.title.match(/^\[(\w+)\]/);
      const cleanTitle = rev.title.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: `revision-${rev.id}`,
        name: cleanTitle || "Untitled Revision Sheet",
        category: "Revision",
        icon: Sparkles,
        titleIcon: TitleIcon,
        action: () => router.push(`/preparation/revision/${rev.id}`),
      } as any);
    });

    // Map tasks
    dbItems.tasks.forEach((task) => {
      const iconMatch = task.title.match(/^\[(\w+)\]/);
      const cleanTitle = task.title.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: `task-${task.id}`,
        name: cleanTitle || "Untitled Task",
        category: "Tasks & To-Dos",
        icon: CheckSquare,
        titleIcon: TitleIcon,
        action: () => router.push(`/tasks?id=${task.id}`),
      } as any);
    });

    // Map projects
    dbItems.projects.forEach((proj) => {
      const iconMatch = proj.title.match(/^\[(\w+)\]/);
      const cleanTitle = proj.title.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: `project-${proj.id}`,
        name: cleanTitle || "Untitled Project",
        category: "Projects",
        icon: Folder,
        titleIcon: TitleIcon,
        action: () => router.push(`/tasks?projectId=${proj.id}`),
      } as any);
    });

    // Map AI Chat Sessions
    dbItems.aiSessions.forEach((sess) => {
      let cleanTitle = sess.title || "AI Chat Session";
      if (cleanTitle.includes("||ORIGINAL_NOTE_ID||")) {
        cleanTitle = cleanTitle.split("||ORIGINAL_NOTE_ID||")[0].trim();
      }
      const iconMatch = cleanTitle.match(/^\[(\w+)\]/);
      cleanTitle = cleanTitle.replace(/^\[\w+\]\s*/, "");
      const TitleIcon = iconMatch && ICON_MAP[iconMatch[1]] ? ICON_MAP[iconMatch[1]] : null;

      list.push({
        id: `ai-session-${sess.id}`,
        name: cleanTitle || "Untitled AI Chat",
        category: "AI Teacher",
        icon: MessageSquare,
        titleIcon: TitleIcon,
        action: () => router.push(`/preparation/ai_teacher?session_id=${sess.id}`),
      } as any);
    });

    return list;
  }, [dbItems, router]);

  const filteredCommands = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return commands;

    const allAvailable = [...commands, ...dynamicCommands];
    return allAvailable.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
    );
  }, [searchQuery, commands, dynamicCommands]);

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleCommandClick(filteredCommands[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleCommandClick = (cmd: { id: string; action: () => void }) => {
    setLoadingId(cmd.id);
    cmd.action();

    const isNavigation = cmd.id.startsWith("note-") ||
      cmd.id.startsWith("pdf-") ||
      cmd.id.startsWith("exercise-") ||
      cmd.id.startsWith("revision-") ||
      cmd.id.startsWith("project-") ||
      cmd.id.startsWith("ai-session-") ||
      ["dashboard", "ai-teacher", "library", "preparation", "tasks", "feedback", "contact", "terms", "privacy"].includes(cmd.id);

    if (!isNavigation) {
      setIsOpen(false);
      setLoadingId(null);
    }
  };

  // Group commands by category for display
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: typeof filteredCommands } = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flattened list for key navigation mapping
  const flatGroupedCommands = useMemo(() => {
    const list: typeof filteredCommands = [];
    Object.keys(groupedCommands).forEach((cat) => {
      list.push(...groupedCommands[cat]);
    });
    return list;
  }, [groupedCommands]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[3px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md border border-black/[0.08] dark:border-white/[0.08] shadow-2xl rounded-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[70vh] z-10"
          >
            {/* Search Input Area */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <Search className="w-5 h-5 text-[#88888F]" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-[#1D1D1F] dark:text-white placeholder-[#88888F]"
              />
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06]">
                <span className="text-[10px] font-bold text-[#88888F] uppercase tracking-wider">ESC</span>
              </div>
            </div>

            {/* List Results */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-2 py-3 scrollbar-hide space-y-4"
            >
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[14px] text-[#88888F] font-medium">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                Object.keys(groupedCommands).map((category) => (
                  <div key={category} className="space-y-1">
                    {/* Group Label */}
                    <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#88888F] mb-2">
                      {category}
                    </p>

                    {/* Group Commands */}
                    {groupedCommands[category].map((cmd) => {
                      // Get flat list index to determine active state
                      const flatIndex = flatGroupedCommands.findIndex((c) => c.id === cmd.id);
                      const isActive = flatIndex === selectedIndex;

                      const Icon = cmd.icon;

                      return (
                        <button
                          key={cmd.id}
                          data-active={isActive ? "true" : "false"}
                          onClick={() => handleCommandClick(cmd)}
                          onMouseEnter={() => setSelectedIndex(flatIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-left ${isActive
                            ? "bg-[#E8E5E0] dark:bg-[#2E2E2E] text-[#252525] dark:text-white"
                            : "text-[#545454] dark:text-[#E2E2E2] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive
                                ? "bg-[#C2A27A] text-white"
                                : "bg-black/[0.03] dark:bg-white/[0.03] text-[#88888F]"
                                }`}
                            >
                              {loadingId === cmd.id ? (
                                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Icon className="w-4 h-4" />
                              )}
                            </div>
                            {(() => {
                              const TitleIcon = (cmd as any).titleIcon;
                              return (
                                <span className="text-[14px] font-semibold flex items-center gap-1.5">
                                  {TitleIcon && <TitleIcon className="w-4 h-4 text-[#C2A27A] shrink-0" />}
                                  {cmd.name}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Selection indicator hint */}
                          {isActive && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-[#C2A27A] opacity-80 animate-in fade-in duration-200">
                              <span>Select</span>
                              <CornerDownLeft className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer Navigation Tips */}
            <div className="bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.06] dark:border-white/[0.06] px-4 py-2.5 flex items-center justify-between text-[11px] font-semibold text-[#88888F]">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06]">↑↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06]">Enter</kbd>
                  to select
                </span>
              </div>
              <span className="hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06]">⌘ K</kbd> to toggle
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
