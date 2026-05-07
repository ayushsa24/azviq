import React, { useState, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { X, Trash2, AlertCircle, FileText, CheckSquare, RotateCcw, Box, BookOpen, FlaskConical, Loader2, RefreshCcw, Check, Trash, MessageSquare } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";
import { useAppDialog } from "@/components/ui/AppDialog";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getIconForType = (type: string) => {
  switch (type) {
    case "note":
    case "pdf": return FileText;
    case "workspace": return Box;
    case "project":
    case "task":
    case "todo": return CheckSquare;
    case "exercise": return FlaskConical;
    case "revision": return BookOpen;
    case "chat":
    case "personal_ai_session": return MessageSquare;
    default: return FileText;
  }
};

/**
 * Individual Row with Swipe Logic
 */
function TrashItemRow({
  item,
  isDark,
  isRestoring,
  onRestore,
  onDelete,
  onSwipeRestore,
  onSwipeDelete
}: any) {
  const x = useMotionValue(0);

  // Visual Indicators
  const bg = useTransform(x, [-100, 0, 100], ["#ef4444", "rgba(0,0,0,0)", "#C2A27A"]);
  const opacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0, 0, 0, 1]);
  const scale = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.8, 0.8, 0.8, 1]);

  const ItemIcon = getIconForType(item.item_type);
  const daysAgo = Math.floor((new Date().getTime() - new Date(item.deleted_at).getTime()) / (1000 * 3600 * 24));

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background Indicators */}
      <motion.div
        style={{ backgroundColor: bg }}
        className="absolute inset-0 flex items-center justify-between px-6 z-0"
      >
        <motion.div style={{ opacity, scale }} className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
          <Check size={18} /> Restore
        </motion.div>
        <motion.div style={{ opacity, scale }} className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest">
          Delete <Trash size={18} />
        </motion.div>
      </motion.div>

      {/* Draggable Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={(_, info) => {
          if (info.offset.x > 100) onSwipeRestore();
          else if (info.offset.x < -100) onSwipeDelete();
        }}
        style={{ x }}
        className={`relative z-10 flex items-center justify-between p-3 rounded-xl border transition-colors touch-pan-y ${isDark ? "bg-[#252525] border-[#3A3A3A]" : "bg-white border-[#E8E5E0]"
          }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
          <ItemIcon size={18} className="text-[#C2A27A] shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate transition-colors">{item.title}</p>
            <p className="text-[10px] text-[#7D7D7D]">
              {daysAgo === 0 ? 'Deleted today' : `Deleted ${daysAgo}d ago`} • {item.item_type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRestore}
            disabled={isRestoring}
            className={`p-2 rounded-lg transition-all active:scale-95 text-[#C2A27A] hover:bg-[#C2A27A]/10`}
            title="Restore"
          >
            {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg transition-all active:scale-95 text-red-500 hover:bg-red-500/10`}
            title="Delete permanently"
          >
            <Trash size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === "dark";
  const [activeCategory, setActiveCategory] = useState<"all" | "library" | "task" | "revision" | "chat">("all");
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isEmptying, setIsEmptying] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const dialog = useAppDialog();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "/dashboard";

  const handleClose = () => {
    if (typeof window !== "undefined") {
      window.history.pushState(null, '', fromParam);
    }
    onClose();
  };



  // Reset to "all" category whenever the modal is opened
  React.useEffect(() => {
    if (isOpen) {
      setActiveCategory("all");
      setShowNotice(true);
    }
  }, [isOpen]);

  const { data, mutate, isLoading } = useSWR(isOpen ? "/api/trash" : null, fetcher);

  const trashItems = data?.trashItems || [];

  const handleRestore = async (id: string, isSwipe: boolean = false) => {
    if (!isSwipe) setIsRestoring(id);
    try {
      mutate({ ...data, trashItems: trashItems.filter((i: any) => i.id !== id) }, false);
      const res = await fetch(`/api/trash/${id}/restore`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore item");
      mutate();
    } catch (error) {
      console.error(error);
      mutate();
      if (!isSwipe) dialog.showAlert("Could not restore item.", "error");
    } finally {
      if (!isSwipe) setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async (id: string, isSwipe: boolean = false) => {
    if (!isSwipe && !await dialog.showConfirm({ title: "Permanently Delete?", message: "Permanently delete this item? This cannot be undone.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true })) return;
    try {
      mutate({ ...data, trashItems: trashItems.filter((i: any) => i.id !== id) }, false);
      const res = await fetch(`/api/trash/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      mutate();
    } catch (error) {
      console.error(error);
      mutate();
      if (!isSwipe) dialog.showAlert("Could not delete item.", "error");
    }
  };

  const handleEmptyTrash = async () => {
    const categoryName = categories.find(c => c.id === activeCategory)?.label || "Trash bin";
    if (!await dialog.showConfirm({ title: "Empty Trash?", message: `Are you sure you want to permanently delete all items in ${categoryName}? This cannot be undone.`, confirmLabel: "Empty Trash", cancelLabel: "Cancel", danger: true })) return;

    setIsEmptying(true);
    try {
      // Optimistically update only items in current category
      const remainingItems = trashItems.filter((item: any) => {
        if (activeCategory === "all") return false;
        if (activeCategory === "library") return !["note", "pdf", "workspace", "project"].includes(item.item_type);
        if (activeCategory === "task") return item.item_type !== "task" && item.item_type !== "todo";
        if (activeCategory === "revision") return item.item_type !== "revision" && item.item_type !== "exercise";
        if (activeCategory === "chat") return item.item_type !== "chat" && item.item_type !== "personal_ai_session";
        return true;
      });

      mutate({ ...data, trashItems: remainingItems }, false);
      const res = await fetch(`/api/trash?type=${activeCategory}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to empty trash");
      mutate();
    } catch (error) {
      console.error(error);
      mutate();
      dialog.showAlert("Could not empty trash.", "error");
    } finally {
      setIsEmptying(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Items", icon: Trash2 },
    { id: "library", label: "Library", icon: FileText },
    { id: "task", label: "Tasks & To-Dos", icon: CheckSquare },
    { id: "chat", label: "AI Chats & Sessions", icon: MessageSquare },
    { id: "revision", label: "Exercise & Revision", icon: RotateCcw },
  ];

  const filteredItems = trashItems.filter((item: any) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "library") return ["note", "pdf", "workspace", "project"].includes(item.item_type);
    if (activeCategory === "task") return item.item_type === "task" || item.item_type === "todo";
    if (activeCategory === "revision") return item.item_type === "revision" || item.item_type === "exercise";
    if (activeCategory === "chat") return item.item_type === "chat" || item.item_type === "personal_ai_session";
    return true;
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in" onClick={handleClose} />

      <div className={`relative w-full h-full sm:h-[580px] sm:max-w-[760px] flex flex-col sm:flex-row rounded-none sm:rounded-xl shadow-2xl overflow-hidden transition-colors border-0 animate-in zoom-in-95 duration-200 ${isDark ? "bg-[#1A1A1A] md:bg-[#1F1F1F] text-white border-[#2E2E2E]" : "bg-[#F5F3EF] text-[#252525] border-[#E8E5E0]"
        }`}>

        <div className={`shrink-0 flex-none border-b sm:border-b-0 sm:border-r transition-colors flex flex-col ${isDark ? "bg-[#1A1A1A] md:bg-[#1F1F1F] border-[#2E2E2E]" : "bg-[#F0EDE8] border-[#E8E5E0]"
          } w-full sm:w-60`}>
          <div className={`shrink-0 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 border-b border-[#E8E5E0] dark:border-[#545454] bg-[#F5F3EF]/90 dark:bg-[#1A1A1A]/90 md:dark:bg-[#1F1F1F]/90 backdrop-blur-[2px] h-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:h-20 pt-[env(safe-area-inset-top,0px)] sm:pt-0`}>
            <h2 className="text-lg font-bold sm:text-2xl">{translations[language].trash || 'Trash'}</h2>
            <button onClick={handleClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><X size={20} /></button>
          </div>

          {/* Navigation - Sidebar on desktop, horizontal scroll on mobile */}
          <div className="flex sm:flex-col items-center sm:items-stretch overflow-x-auto sm:overflow-x-visible h-[3.25rem] sm:h-auto px-4 sm:px-2 sm:mt-2 pb-0 sm:pb-6 space-x-1 sm:space-x-0 sm:space-y-1 custom-scrollbar">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:py-2.5 rounded-xl transition-all text-[11px] sm:text-sm font-medium whitespace-nowrap shrink-0 sm:shrink outline-none ${activeCategory === cat.id
                      ? isDark ? "bg-[#2E2E2E] text-white" : "bg-white text-[#252525]"
                      : isDark ? "text-[#BABABA] hover:bg-[#252525]/50" : "text-[#545454] hover:bg-[#F0EDE8]/60"
                    }`}
                >
                  <Icon size={14} className="sm:w-[18px] sm:h-[18px]" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">

            <AnimatePresence>
              {showNotice && (
                <motion.div
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: "auto", opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95, marginBottom: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#C2A27A]/20 bg-[#C2A27A]/5 transition-colors overflow-hidden relative"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-[#C2A27A] shrink-0" />
                    <p className="text-[11px] font-bold text-[#C2A27A] uppercase tracking-wider">Permanently removed after 7 days automatically</p>
                  </div>
                  <button
                    onClick={() => setShowNotice(false)}
                    className="p-1 hover:bg-[#C2A27A]/10 rounded-lg text-[#C2A27A]/60 hover:text-[#C2A27A] transition-all active:scale-90"
                    title="Dismiss"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3 relative">
              <AnimatePresence initial={false}>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border animate-pulse ${isDark ? "bg-[#252525]/50 border-[#3A3A3A]" : "bg-[#F9F9F9] border-[#E8E5E0]"
                        }`}>
                        <div className={`w-9 h-9 rounded-lg shrink-0 ${isDark ? "bg-[#333]" : "bg-gray-200"}`} />
                        <div className="flex-1 space-y-2">
                          <div className={`h-3 w-1/3 rounded-full ${isDark ? "bg-[#333]" : "bg-gray-200"}`} />
                          <div className={`h-2 w-1/4 rounded-full ${isDark ? "bg-[#333]/60" : "bg-gray-100"}`} />
                        </div>
                        <div className={`w-16 h-7 rounded-lg ${isDark ? "bg-[#333]" : "bg-gray-200"}`} />
                      </div>
                    ))}
                  </div>
                ) : filteredItems.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex flex-col items-center justify-center min-h-[300px] text-center opacity-40"
                  >
                    <Trash2 size={40} className="mb-4 text-[#C2A27A]/60" />
                    <p className="text-sm font-black uppercase tracking-[0.2em]">No Items Found</p>
                    <p className="text-[10px] mt-1 font-bold opacity-60">This category is currently empty</p>
                  </motion.div>
                ) : (
                  filteredItems.map((item: any) => (
                    <TrashItemRow
                      key={item.id}
                      item={item}
                      isDark={isDark}
                      isRestoring={isRestoring === item.id}
                      onRestore={() => handleRestore(item.id)}
                      onDelete={() => handlePermanentDelete(item.id)}
                      onSwipeRestore={() => handleRestore(item.id, true)}
                      onSwipeDelete={() => handlePermanentDelete(item.id, true)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className={`px-6 py-4 border-t transition-colors ${isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"}`}>
            <button
              onClick={handleEmptyTrash}
              disabled={isEmptying || filteredItems.length === 0}
              className={`w-full h-11 flex items-center justify-center rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 ${isDark
                  ? "bg-white text-[#1A1A1A] hover:bg-[#F0F0F0]"
                  : "bg-[#252525] text-white hover:bg-[#1A1A1A]"
                }`}
            >
              {isEmptying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                `Empty ${activeCategory === 'all' ? 'Trash Bin' : (categories.find(c => c.id === activeCategory)?.label || 'Items')}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrashModalSuspense(props: TrashModalProps) {
  return (
    <Suspense fallback={null}>
      <TrashModal {...props} />
    </Suspense>
  );
}
