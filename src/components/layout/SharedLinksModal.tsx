"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  X,
  MoreHorizontal,
  Trash2,
  Link as LinkIcon,
  ArchiveRestore,
  MessageSquare,
  File as FileIcon2,
  Loader2,
  Trash2 as TrashIcon,
  Users,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SharedLinksModalProps {
  showSharedLinks: boolean;
  setShowSharedLinks: (show: boolean) => void;
  linksType: "chat" | "note" | "archive" | "import" | "import-chat";
  isDark: boolean;
  fromParam: string;
  isLoadingLinks: boolean;
  sharedLinks: any[];
  showBulkMenu: boolean;
  setShowBulkMenu: (show: boolean) => void;
  deleteConfirmTarget: { id: string; title: string } | null;
  setDeleteConfirmTarget: (target: { id: string; title: string } | null) => void;
  revokingId: string | null;
  isBulkDeleting: boolean;
  handleRevokeLink: (id: string) => void;
  handleUnarchive: (id: string) => void;
  handleDeleteAll: () => void;
  handleArchiveAllHistory: () => void;
  handleDeleteAllHistory: () => void;
  onViewImporters?: (type: "chat" | "note", id: string) => void;
}

export const SharedLinksModal: React.FC<SharedLinksModalProps> = ({
  showSharedLinks,
  setShowSharedLinks,
  linksType,
  isDark,
  fromParam,
  isLoadingLinks,
  sharedLinks,
  showBulkMenu,
  setShowBulkMenu,
  deleteConfirmTarget,
  setDeleteConfirmTarget,
  revokingId,
  isBulkDeleting,
  handleRevokeLink,
  handleUnarchive,
  handleDeleteAll,
  handleArchiveAllHistory,
  handleDeleteAllHistory,
  onViewImporters
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close bulk menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) {
        setShowBulkMenu(false);
      }
    };
    if (showBulkMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBulkMenu, setShowBulkMenu]);

  const closeModal = () => {
    setShowSharedLinks(false);
    window.history.pushState(null, "", `/settings?from=${encodeURIComponent(fromParam)}`);
  };

  const rowPy = linksType === "archive" ? "py-4" : "py-3 sm:py-2.5";

  return (
    <AnimatePresence>
      {/* ── SHARED LINKS LIST MODAL ── */}
      {showSharedLinks && (
        <React.Fragment key="shared-links-list-group">
          <motion.div
            key="shared-links-backdrop"
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          <motion.div
            key="shared-links-sheet"
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
            transition={isMobile ? { duration: 0.25, ease: "easeOut" } : { type: "spring", damping: 25, stiffness: 400 }}
            className={`fixed z-[310] w-full bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-4xl
              ${isMobile ? "h-[95vh]" : "h-[620px]"}
              rounded-t-[20px] sm:rounded-3xl
              shadow-2xl overflow-hidden flex flex-col
              ${isDark ? "bg-[#1A1A1A] text-white" : "bg-[#F5F3EF] text-[#252525]"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden w-full flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* ── STICKY HEADER AREA ── */}
            <div 
              className={`flex-shrink-0 border-b ${isDark ? "bg-[#1A1A1A] border-[#3A3A3A]" : "bg-[#F5F3EF] border-[#D1D1D1]"}`}
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (!isMobile) return;
                const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX)) {
                  closeModal();
                }
              }}
            >
              {/* Title + Close btn */}
              <div className={`flex items-center justify-between px-4 sm:px-6 pt-2 sm:pt-4 pb-2.5 border-b ${isDark ? "border-[#3A3A3A]" : "border-[#E8E5E0]"}`}>
                <h3 className="text-lg font-bold sm:text-2xl">
                  {linksType === "chat"
                    ? "Chat Shared Links"
                    : linksType === "note"
                    ? "Note Shared Links"
                    : linksType === "import"
                    ? "Imported Notes"
                    : linksType === "import-chat"
                    ? "Imported Chats"
                    : "Archived Chats"}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Immutable Table Header Row */}
              <table className="w-full text-left border-collapse table-fixed">
                <thead
                  className={`text-[11px] uppercase tracking-wider font-bold
                    ${isDark ? "text-[#7D7D7D]" : "text-[#545454]"}`}
                >
                  <tr>
                    <th className={`px-6 ${rowPy} w-[40%] text-left`}>Name</th>
                    <th className={`px-6 ${rowPy} w-[15%] hidden sm:table-cell text-center`}>Type</th>
                    <th className={`px-6 ${rowPy} w-[30%] hidden sm:table-cell text-center`}>
                      {linksType === "archive" ? "Date" : (linksType === "import" || linksType === "import-chat") ? "Date imported" : "Date shared"}
                    </th>
                    <th className={`px-6 ${rowPy} w-[15%] text-right pr-6 relative`}>
                      {linksType !== "archive" && (
                        <button
                          onClick={() => setShowBulkMenu(!showBulkMenu)}
                          className={`p-1.5 rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 ${showBulkMenu ? "bg-black/5 dark:bg-white/10" : ""}`}
                        >
                          <MoreHorizontal size={16} className="ml-auto" />
                        </button>
                      )}

                      {/* Bulk Actions Menu */}
                      {showBulkMenu && (
                        <div
                          ref={bulkMenuRef}
                          className={`absolute top-full right-6 mt-1 w-48 rounded-2xl shadow-2xl z-[50] overflow-hidden border
                            animate-in slide-in-from-top-2 duration-200
                            ${isDark ? "bg-[#1C1C1B] border-[#2E2E2E]" : "bg-white border-[#E8E5E0]"}`}
                        >
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setDeleteConfirmTarget({ id: "all", title: linksType === "archive" ? "All Archives" : "All Shared Links" });
                                setShowBulkMenu(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={14} />
                              Delete All {linksType === "archive" ? "Archives" : "Links"}
                            </button>
                          </div>
                        </div>
                      )}
                    </th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* ── SCROLLABLE CONTENT AREA with swipe-to-close ─── */}
            <div
              ref={scrollContainerRef}
              onTouchStart={(e) => {
                touchStartY.current = e.touches[0].clientY;
                touchStartX.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (!isMobile) return;
                const el = scrollContainerRef.current;
                if (!el) return;
                const deltaY = e.changedTouches[0].clientY - touchStartY.current;
                const deltaX = e.changedTouches[0].clientX - touchStartX.current;
                // Only close if: swiped down 80px+ AND already at the very top AND purely vertical
                if (deltaY > 80 && Math.abs(deltaY) > Math.abs(deltaX) && el.scrollTop <= 0) {
                  closeModal();
                }
              }}
              className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
            >
              <table className="w-full text-left border-collapse table-fixed">
                {/* ── BODY ── */}
                <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-black/5"}`}>
                  {isLoadingLinks ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className={`px-6 ${rowPy} w-[40%]`}>
                          <div className="flex flex-col gap-1.5">
                            <div className="h-4 bg-black/5 dark:bg-white/5 rounded w-3/4" />
                            <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-1/2 sm:hidden mt-0.5" />
                          </div>
                        </td>
                        <td className={`px-6 ${rowPy} w-[15%] hidden sm:table-cell text-center`}>
                          <div className="h-5 bg-black/5 dark:bg-white/5 rounded-md w-14 mx-auto" />
                        </td>
                        <td className={`px-6 ${rowPy} w-[30%] hidden sm:table-cell text-center`}>
                          <div className="h-3 bg-black/5 dark:bg-white/5 rounded w-20 mx-auto" />
                        </td>
                        <td className={`px-6 ${rowPy} w-[15%] text-right pr-6`}>
                          <div className="flex justify-end gap-3 sm:gap-5">
                            <div className="h-7 w-7 bg-black/5 dark:bg-white/5 rounded-lg" />
                            <div className="h-7 w-7 bg-black/5 dark:bg-white/5 rounded-lg" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : sharedLinks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-[#7D7D7D]">
                        No {linksType === "archive" ? "archived chats" : (linksType === "import" || linksType === "import-chat") ? "imported items" : "shared links"} found.
                      </td>
                    </tr>
                  ) : (
                    sharedLinks.map((link: any) => (
                      <tr
                        key={link.id}
                        className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        {/* Name */}
                        <td className={`px-6 ${rowPy} w-[40%] text-sm font-medium`}>
                          <div className="flex flex-col gap-0.5">
                            {linksType === "archive" ? (
                              <a
                                href={`/ai/${link.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                              >
                                <LinkIcon size={14} />
                                <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                              </a>
                            ) : linksType === "import" ? (
                              <div className="flex flex-col gap-0.5">
                                <a
                                  href={`/library/note/${link.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                  <LinkIcon size={14} />
                                  <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                                </a>
                                {link.original_note?.user && (
                                  <span className="text-[10px] text-[#7D7D7D] flex items-center gap-1 ml-5">
                                    <Users size={10} />
                                    Imported from {link.original_note.user.name || link.original_note.user.email}
                                  </span>
                                )}
                              </div>
                            ) : linksType === "import-chat" ? (
                              <div className="flex flex-col gap-0.5">
                                <a
                                  href={`/ai/${link.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                  <LinkIcon size={14} />
                                  <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                                </a>
                                {link.original_shared_chat?.users && (
                                  <span className="text-[10px] text-[#7D7D7D] flex items-center gap-1 ml-5">
                                    <Users size={10} />
                                    Imported from {link.original_shared_chat.users.name || link.original_shared_chat.users.email}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <a
                                href={linksType === "chat" ? `/ai/${link.chat_id}` : `/library/note/${link.id}`}
                                target="_blank"
                                className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                              >
                                <LinkIcon size={14} />
                                <span className="truncate max-w-[200px] sm:max-w-[250px]">{link.title}</span>
                              </a>
                            )}
                            {/* Mobile-only date */}
                            <span className="text-[10px] text-[#7D7D7D] font-normal sm:hidden mt-1">
                              {new Date(link.created_at).toLocaleDateString("en-US", {
                                month: "long", day: "numeric", year: "numeric"
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Type (desktop) */}
                        <td className={`px-6 ${rowPy} w-[15%] hidden sm:table-cell text-center`}>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md
                            ${isDark ? "bg-[#333] text-[#BABABA]" : "bg-[#E8E5E0] text-[#545454]"}`}>
                            {linksType === "archive" ? "Archive" : linksType === "chat" ? "Chat" : linksType === "note" ? "Note" : "Imported"}
                          </span>
                        </td>

                        {/* Date (desktop) */}
                        <td className={`px-6 ${rowPy} w-[30%] text-xs text-[#7D7D7D] hidden sm:table-cell text-center`}>
                          {new Date(link.created_at).toLocaleDateString("en-US", {
                            month: "long", day: "numeric", year: "numeric"
                          })}
                        </td>

                        {/* Actions */}
                        <td className={`px-6 ${rowPy} w-[15%] text-right pr-6`}>
                          <div className="flex items-center justify-end gap-3 sm:gap-5">
                            {linksType === "archive" ? (
                              <button
                                onClick={() => handleUnarchive(link.id)}
                                disabled={revokingId === link.id}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110
                                  ${isDark ? "hover:bg-[#1C1C1B] text-[#BABABA] hover:text-white" : "hover:bg-white text-[#545454] hover:text-[#252525]"}`}
                                title="Unarchive chat"
                              >
                                {revokingId === link.id ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />}
                              </button>
                            ) : (linksType === "import" || linksType === "import-chat") && (
                              <button
                                onClick={() => window.open(linksType === "import" ? `/library/note/${link.id}` : `/ai/${link.id}`, "_blank")}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110
                                  ${isDark ? "hover:bg-[#1C1C1B] text-[#BABABA] hover:text-white" : "hover:bg-white text-[#545454] hover:text-[#252525]"}`}
                                title={linksType === "import" ? "Open note" : "Open chat"}
                              >
                                {linksType === "import" ? <ExternalLink size={14} /> : <MessageSquare size={14} />}
                              </button>
                            )}

                            {onViewImporters && (linksType === "chat" || linksType === "note") && (
                              <button
                                onClick={() => onViewImporters(linksType, linksType === "chat" ? link.chat_id : link.id)}
                                className={`p-1.5 rounded-lg transition-all hover:scale-110
                                  ${isDark ? "hover:bg-[#1C1C1B] text-[#BABABA] hover:text-white" : "hover:bg-white text-[#545454] hover:text-[#252525]"}`}
                                title={`View ${linksType === "chat" ? "Chat" : "Note"} Importers`}
                              >
                                <Users size={14} />
                              </button>
                            )}

                            <button
                              onClick={() => setDeleteConfirmTarget({ id: link.id, title: link.title || `Untitled ${linksType}` })}
                              disabled={revokingId === link.id}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110
                                ${isDark ? "hover:bg-red-500/10 text-red-500 hover:text-red-600" : "hover:bg-red-50 text-red-500 hover:text-red-700"}`}
                              title={`Delete ${linksType === "archive" ? "chat" : "link"}`}
                            >
                              {revokingId === link.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </React.Fragment>
      )}

      {/* ── DELETE CONFIRMATION DIALOG (Global) ── */}
      {deleteConfirmTarget && (
        <motion.div
          key="shared-links-confirm"
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDeleteConfirmTarget(null)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 400 }}
            className={`relative w-full max-w-[340px] rounded-3xl shadow-2xl p-6 border
              ${isDark ? "bg-[#1C1C1B] border-[#2E2E2E] text-white" : "bg-white border-[#E8E5E0] text-[#252525]"}`}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? "bg-[#C2A27A]/10 text-[#C2A27A]" : "bg-[#C2A27A]/10 text-[#B19169]"}`}>
                <TrashIcon size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold">Are you sure?</h4>
                <p className="text-sm text-[#7D7D7D] leading-relaxed">
                  Are you sure you want to{" "}
                  {deleteConfirmTarget.id === "archive-all-history" ? "archive" : "delete"}{" "}
                  <span className="text-[#C2A27A] font-bold">"{deleteConfirmTarget.title}"</span>?{" "}
                  <br />
                  {deleteConfirmTarget.id === "archive-all-history"
                    ? "You can always unarchive them later."
                    : "This action cannot be undone."}
                </p>
              </div>
              <div className="flex flex-col w-full gap-2 pt-2">
                <button
                  onClick={() => {
                    if (deleteConfirmTarget.id === "all") handleDeleteAll();
                    else if (deleteConfirmTarget.id === "archive-all-history") handleArchiveAllHistory();
                    else if (deleteConfirmTarget.id === "delete-all-archives") handleDeleteAllHistory();
                    else handleRevokeLink(deleteConfirmTarget.id);
                    setDeleteConfirmTarget(null);
                  }}
                  className={`w-full py-3 rounded-2xl text-white font-bold text-sm transition-all shadow-lg active:scale-95 ${deleteConfirmTarget.id === "archive-all-history"
                    ? "bg-[#C2A27A] hover:bg-[#B19169]"
                    : "bg-[#C2A27A] hover:bg-[#B19169]"
                    }`}
                >
                  {isBulkDeleting ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                  ) : deleteConfirmTarget.id === "archive-all-history" ? (
                    "YES, ARCHIVE"
                  ) : (
                    "YES, DELETE"
                  )}
                </button>
                <button
                  onClick={() => setDeleteConfirmTarget(null)}
                  className={`w-full py-3 rounded-2xl font-bold text-sm transition-all
                    ${isDark ? "hover:bg-[#2E2E2E] text-[#BABABA]" : "hover:bg-gray-100 text-[#7D7D7D]"}`}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
