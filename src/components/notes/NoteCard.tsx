import React, { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, File, MoreVertical, Star, Pin, Edit2, MoveRight, Trash2 } from "lucide-react";

export interface NoteItem {
    id: string;
    title: string;
    file_url?: string;
    content?: string;
    created_at: string;
    user_id: string;
    is_favourite?: boolean;
    is_pinned?: boolean;
    is_pinned_in_favourites?: boolean;
    workspace_id?: string;
}

interface NoteCardProps {
    note: NoteItem;
    onClick: (note: NoteItem) => void;
    viewMode?: "grid" | "list";
    onRename?: (note: NoteItem) => void;
    onMove?: (note: NoteItem) => void;
    onDelete?: (note: NoteItem) => void;
    onToggleFavourite?: (note: NoteItem) => void;
    onTogglePin?: (note: NoteItem) => void;
    isPinnedOverride?: boolean;
}

export function NoteCard({
    note,
    onClick,
    viewMode = "grid",
    onRename,
    onMove,
    onDelete,
    onToggleFavourite,
    onTogglePin,
    isPinnedOverride
}: NoteCardProps) {
    const isPdf = note.file_url?.toLowerCase().endsWith(".pdf");
    const isList = viewMode === "list";
    const isPinned = isPinnedOverride !== undefined ? isPinnedOverride : !!note.is_pinned;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuSide, setMenuSide] = useState<"top" | "bottom">("bottom");
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Smart flip and position logic
            if (menuRef.current) {
                const rect = menuRef.current.getBoundingClientRect();
                const menuHeight = 220; // Note menu is taller
                const isMobile = window.innerWidth < 768;
                const bottomThreshold = isMobile ? 80 : 20;

                // Determine side (top or bottom) and absolute screen position
                if (isList) {
                    if (rect.bottom + menuHeight > window.innerHeight - bottomThreshold) {
                        setMenuSide("top");
                        setMenuPosition({ top: rect.top - menuHeight - 4, right: window.innerWidth - rect.right });
                    } else {
                        setMenuSide("bottom");
                        setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    }
                } else {
                    // Grid opens up by default, but flip if it hits the top header (approx 120px)
                    if (rect.top - menuHeight < 120 && rect.bottom + menuHeight < window.innerHeight - bottomThreshold) {
                        setMenuSide("bottom");
                        setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                    } else {
                        setMenuSide("top");
                        setMenuPosition({ top: rect.top - menuHeight - 4, right: window.innerWidth - rect.right });
                    }
                }
            }
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen, isList]);

    const handleMenuAction = (e: React.MouseEvent, action: () => void | undefined) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        if (action) action();
    };

    const handleTouchStart = () => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setIsMenuOpen(true);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleTouchMove = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            e.preventDefault();
            return;
        }
        onClick(note);
    };

    return (
        <div
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={`group p-3.5 rounded-xl cursor-pointer transition-all duration-200 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 bg-white dark:bg-[#CFCFCF]/10 hover:bg-[#F9F8F6] dark:hover:bg-[#CFCFCF]/20 hover:border-[#D1D1D1] dark:hover:border-[#444] relative shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md ${isList ? "flex flex-row items-center gap-3 h-auto py-3 px-4" : "flex flex-col justify-between h-40"
                }`}
        >
            {!isList && (isPinned || note.is_favourite) && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 transition-opacity">
                    {isPinned && (
                        <div className="bg-[#252525]/10 dark:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] p-1 rounded-full" title="Pinned">
                            <Pin size={10} fill="currentColor" strokeWidth={0} />
                        </div>
                    )}
                    {note.is_favourite && (
                        <div className="bg-[#252525]/10 dark:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] p-1 rounded-full">
                            <Star size={10} fill="currentColor" strokeWidth={0} />
                        </div>
                    )}
                </div>
            )}

            {!isList && (
                <div className="absolute top-3 right-3 bg-[#252525] text-white dark:text-[#CFCFCF] text-[10px] px-1.5 py-0.5 rounded shadow-sm opacity-80 group-hover:opacity-100">
                    {isPdf ? "PDF" : "NOTE"}
                </div>
            )}

            <div className={`flex items-center shrink-0 text-[#545454] dark:text-[#7D7D7D] group-hover:text-[#252525] dark:group-hover:text-[#CFCFCF] transition-colors ${isList ? "" : "flex-1 justify-center"
                }`}>
                {isPdf ? <FileText size={isList ? 24 : 40} strokeWidth={isList ? 2 : 1.5} /> : <File size={isList ? 24 : 40} strokeWidth={isList ? 2 : 1.5} />}
            </div>

            <div className={`border-[#CFCFCF] dark:border-[#7D7D7D]/20 transition-colors ${isList ? "flex-1 min-w-0 flex flex-row items-center justify-between border-none mt-0 pt-0 gap-2" : "mt-4 pt-4 border-t"
                }`}>
                <div className={`${isList ? "flex items-center gap-2 min-w-0" : "pr-6"}`}>
                    {isList && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            {isPinned && (
                                <Pin size={14} fill="currentColor" className="text-[#252525] dark:text-white" strokeWidth={0} />
                            )}
                            {note.is_favourite && (
                                <Star size={14} fill="currentColor" className="text-[#252525] dark:text-white" strokeWidth={0} />
                            )}
                            <div className="bg-[#252525] text-white dark:text-white/90 text-[10px] px-1.5 py-0.5 rounded opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {isPdf ? "PDF" : "NOTE"}
                            </div>
                        </div>
                    )}
                    <h3 className={`font-semibold truncate text-[#252525] dark:text-white transition-colors ${isList ? "text-sm sm:text-base" : "text-sm mb-1"
                        }`}>
                        {note.title}
                    </h3>
                </div>

                <div className={`flex items-center text-[#545454] dark:text-[#BABABA] transition-colors ${isList ? "text-xs sm:text-sm gap-2 shrink-0" : "justify-between text-xs w-full"
                    }`}>
                    <span className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>

                    <div ref={menuRef} className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(!isMenuOpen);
                            }}
                            className={`p-1.5 rounded-md hover:bg-[#E0E0E0] dark:hover:bg-[#545454] transition-colors ${isMenuOpen ? "bg-[#E0E0E0] dark:bg-[#545454] opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}
                        >
                            <MoreVertical size={16} className="text-[#545454] dark:text-[#CFCFCF]" />
                        </button>

                        {isMenuOpen && menuPosition && (
                            <div
                                className="fixed z-[9999] w-48 bg-white dark:bg-[#252525] rounded-lg shadow-xl border border-[#CFCFCF] dark:border-[#545454] py-1 transition-all animate-in fade-in zoom-in-95 duration-150"
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onTogglePin?.(note))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors"
                                >
                                    <Pin size={14} className={isPinned ? "fill-current" : ""} />
                                    {isPinned ? "Unpin" : "Pin to Top"}
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onToggleFavourite?.(note))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors"
                                >
                                    <Star size={14} className={note.is_favourite ? "fill-current" : ""} />
                                    {note.is_favourite ? "Remove Favourite" : "Add to Favourites"}
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onRename?.(note))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors"
                                >
                                    <Edit2 size={14} />
                                    Rename
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onMove?.(note))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors border-b border-[#F0F0F0] dark:border-[#333333]"
                                >
                                    <MoveRight size={14} />
                                    Move to Workspace
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onDelete?.(note))}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
