import React, { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { FileText, File, MoreVertical, Star, Pin, Edit2, MoveRight, Trash2, Clock, EyeOff, ChevronLeft, Folder, Loader2 } from "lucide-react";
import { ICON_MAP } from "@/components/editor/EmojiPicker";
import { Workspace } from "@/types";

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
    is_revoked?: boolean;
    original_note_id?: string;
}

interface NoteCardProps {
    note: NoteItem;
    onClick: (note: NoteItem) => void;
    viewMode?: "grid" | "list";
    onRename?: (note: NoteItem) => void;
    onMove?: (note: NoteItem, workspaceId: string | null) => void;
    onDelete?: (note: NoteItem) => void;
    onToggleFavourite?: (note: NoteItem) => void;
    onTogglePin?: (note: NoteItem) => void;
    isPinnedOverride?: boolean;
    workspaces?: Workspace[];
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
    isPinnedOverride,
    workspaces = []
}: NoteCardProps) {
    const isPdf = note.file_url?.toLowerCase().endsWith(".pdf");
    const isList = viewMode === "list";
    const isPinned = isPinnedOverride !== undefined ? isPinnedOverride : !!note.is_pinned;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [tempTitle, setTempTitle] = useState(note.title.replace(/^\[\w+\]\s*/, ""));
    const [isMoving, setIsMoving] = useState(false);
    const [isMovingNote, setIsMovingNote] = useState(false);
    const [isMobileApp, setIsMobileApp] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    // Sync tempTitle with note.title when it changes externally
    useEffect(() => {
        setTempTitle(note.title.replace(/^\[\w+\]\s*/, ""));
    }, [note.title]);

    // Auto-scroll into view on mobile when renaming starts
    useEffect(() => {
        if (isRenaming && typeof window !== "undefined" && window.innerWidth < 768) {
            const el = document.getElementById(`note-card-${note.id}`);
            if (el) {
                // Small delay to allow keyboard to start opening
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }
    }, [isRenaming, note.id]);

    const handleRenameSubmit = async () => {
        const cleanOldTitle = note.title.replace(/^\[\w+\]\s*/, "");
        if (tempTitle.trim() === cleanOldTitle || !tempTitle.trim()) {
            setIsRenaming(false);
            setTempTitle(cleanOldTitle);
            return;
        }

        try {
            // Keep the emoji prefix if it exists
            const iconMatch = note.title.match(/^\[\w+\]/);
            const prefix = iconMatch ? iconMatch[0] + " " : "";
            const finalTitle = prefix + tempTitle.trim();

            const res = await fetch(`/api/notes/${note.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: finalTitle }),
            });

            if (res.ok) {
                // Trigger the onRename prop if it exists, which usually refetches data in parent
                onRename?.(note);
            }
        } catch (e) {
            console.error("Failed to rename note", e);
        }
        setIsRenaming(false);
    };

    useEffect(() => {
        if (typeof window !== "undefined") {
            const checkIsPWA =
                window.matchMedia("(display-mode: standalone)").matches ||
                ("standalone" in window.navigator &&
                    (window.navigator as any).standalone);
            setIsMobileApp(!!checkIsPWA);
        }

        const handleScrollOrResize = () => {
            if (isMenuOpen) setIsMenuOpen(false);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setIsMoving(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
            
            // Calculate fixed position
            if (menuRef.current) {
                const rect = menuRef.current.getBoundingClientRect();
                const menuHeight = 220; 
                const menuWidth = 208; // w-52 is 208px
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                // Horizontal positioning: check if we would overflow the left edge
                const wouldOverflowLeft = rect.right < menuWidth;
                
                let verticalTop = rect.bottom + 4;
                if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                    verticalTop = rect.top - menuHeight - 4;
                }

                if (wouldOverflowLeft) {
                    setMenuPosition({ 
                        top: verticalTop, 
                        left: Math.max(8, rect.left) // At least 8px from left edge
                    } as any);
                } else {
                    setMenuPosition({ 
                        top: verticalTop, 
                        right: window.innerWidth - rect.right 
                    } as any);
                }
            }
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isMenuOpen]);

    const handleMenuAction = (e: React.MouseEvent, action: () => void | undefined) => {
        e.preventDefault();
        e.stopPropagation();
        if (action) action();
        if (!isMoving) setIsMenuOpen(false);
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
            id={`note-card-${note.id}`}
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 bg-white dark:bg-white/5 hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] relative shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md ${isList ? "flex flex-row items-center gap-4 h-auto py-3 px-4" : "flex flex-col justify-between h-44"
                } ${isMenuOpen ? "z-[110] ring-1 ring-black/5 dark:ring-white/5 shadow-xl" : "z-0"}`}
        >
            {!isList && (isPinned || note.is_favourite) && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 transition-opacity">
                    {isPinned && (
                        <div className="bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white p-1 rounded-full" title="Pinned">
                            <Pin className="w-2.5 h-2.5" strokeWidth={1.5} fill="none" />
                        </div>
                    )}
                    {note.is_favourite && (
                        <div className="bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white p-1 rounded-full">
                            <Star className="w-2.5 h-2.5" strokeWidth={1.5} fill="none" />
                        </div>
                    )}
                </div>
            )}

            {!isList && (
                <div className="absolute top-3 right-3 rounded shadow-sm transition-all bg-[#252525] dark:bg-white text-white dark:text-[#252525] text-[0.5rem] sm:text-[0.625rem] px-1 py-0 sm:px-1.5 sm:py-0.5 font-bold transform-gpu">
                    {note.original_note_id ? "IMPORTED" : (isPdf ? "PDF" : "NOTE")}
                </div>
            )}

            <div className={`flex items-center shrink-0 text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors ${isList ? "w-10 h-10 items-center justify-center rounded-full bg-[#F0EDE8] dark:bg-white/10" : "flex-1 justify-center"
                }`}>
                {(() => {
                    const iconMatch = note.title.match(/^\[(\w+)\]/);
                    if (iconMatch && ICON_MAP[iconMatch[1]]) {
                        const IconComp = ICON_MAP[iconMatch[1]];
                        return <IconComp className={isList ? "w-5 h-5" : "w-10 h-10 transition-transform group-hover:scale-110 mb-1"} strokeWidth={1.5} />;
                    }
                    return isPdf ? (
                        <File className={isList ? "w-5 h-5" : "w-10 h-10 transition-transform group-hover:scale-110 mb-1"} strokeWidth={1.5} />
                    ) : (
                        <FileText className={isList ? "w-5 h-5" : "w-10 h-10 transition-transform group-hover:scale-110 mb-1"} strokeWidth={1.5} />
                    );
                })()}
            </div>

            <div className={`transition-colors min-w-0 ${isList ? "flex-1 flex flex-row items-center justify-between" : "mt-3 pt-3 border-t border-[#E8E5E0] dark:border-[#7D7D7D]/20"
                }`}>
                <div className={`min-w-0 ${isList ? "flex-1 flex flex-col justify-center" : "w-full pb-1"}`}>
                    <h3 className={`font-semibold truncate text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1.5 ${isList ? "text-sm" : "text-sm"
                        }`} title={note.title}>
                        {isList && (isPinned || note.is_favourite) && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                {isPinned && (
                                    <Pin className="w-3.5 h-3.5 text-[#252525] dark:text-white" strokeWidth={1.5} fill="none" />
                                )}
                                {note.is_favourite && (
                                    <Star className="w-3.5 h-3.5 text-[#252525] dark:text-white" strokeWidth={1.5} fill="none" />
                                )}
                            </div>
                        )}
                        {isRenaming ? (
                            <input
                                type="text"
                                value={tempTitle}
                                autoFocus
                                className="bg-transparent border-b border-[#7D7D7D] outline-none text-sm w-full py-0 px-0"
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={handleRenameSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSubmit();
                                    if (e.key === "Escape") {
                                        setTempTitle(note.title);
                                        setIsRenaming(false);
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="truncate">{note.title.replace(/^\[\w+\]\s*/, "")}</span>
                        )}
                        {note.is_revoked && !isRenaming && (
                            <span title="Access Revoked (Private Note)" className="flex items-center">
                                <EyeOff className="w-3.5 h-3.5 text-[#7D7D7D] shrink-0" />
                            </span>
                        )}
                    </h3>
                    
                    <div className={`${isList ? "mt-0.5 text-[10px] text-[#BABABA]" : "justify-between text-[0.625rem] w-full flex items-center text-[#545454] dark:text-[#BABABA] transition-colors mt-auto"
                        }`}>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {(() => {
                                const date = new Date(note.created_at);
                                const now = new Date();
                                const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffInDays < 3) {
                                    return formatDistanceToNow(date, { addSuffix: true });
                                }
                                return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                            })()}
                        </span>
                    </div>
                </div>

                <div className={`flex items-center gap-2 shrink-0 ${isList ? "" : "absolute bottom-3 right-3"}`}>
                    <div ref={menuRef} className="relative">
                        {!isMobileApp && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                                className={`p-1.5 rounded-md hover:bg-[#F0EDE8] dark:hover:bg-[#545454] transition-colors ${isMenuOpen ? "bg-[#F0EDE8] dark:bg-[#545454] opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                    }`}
                            >
                                <MoreVertical className="w-4 h-4 text-[#545454] dark:text-white" />
                            </button>
                        )}
                        
                        {/* Menu Dropdown - Fixed to screen for 100% visibility */}
                        {isMenuOpen && menuPosition && (
                            <div
                                className="fixed z-[9999] w-44 bg-white dark:bg-[#2A2A2A] rounded-xl shadow-xl border border-gray-200 dark:border-[#444] transition-all animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                                style={{ 
                                    top: menuPosition.top, 
                                    ...(menuPosition as any).right !== undefined ? { right: (menuPosition as any).right } : { left: (menuPosition as any).left }
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                            >
                                {!isMoving ? (
                                    <>
                                        <button
                                            onClick={(e) => handleMenuAction(e, () => onTogglePin?.(note))}
                                            className="group/btn w-full text-left px-2.5 py-1.5 text-sm text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333] flex items-center gap-2 transition-colors"
                                        >
                                            <Pin className={`w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110 ${isPinned ? "fill-current" : ""}`} />
                                            {isPinned ? "Unpin" : "Pin to Top"}
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuAction(e, () => onToggleFavourite?.(note))}
                                            className="group/btn w-full text-left px-2.5 py-1.5 text-sm text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333] flex items-center gap-2 transition-colors"
                                        >
                                            <Star className={`w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110 ${note.is_favourite ? "fill-current" : ""}`} />
                                            {note.is_favourite ? "Remove Favourite" : "Add to Favourites"}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsRenaming(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="group/btn w-full text-left px-2.5 py-1.5 text-sm text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333] flex items-center gap-2 transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                                            Rename
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setIsMoving(true);
                                            }}
                                            className="group/btn w-full text-left px-2.5 py-1.5 text-sm text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333] flex items-center gap-2 transition-colors border-b border-[#F0F0F0] dark:border-[#333333]"
                                        >
                                            <MoveRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                                            Move to Workspace
                                        </button>
                                        <button
                                            onClick={(e) => handleMenuAction(e, () => onDelete?.(note))}
                                            className="group/btn w-full text-left px-2.5 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                                            Move to Trash
                                        </button>
                                    </>
                                ) : (
                                    <div className="animate-in slide-in-from-right-4 duration-200">
                                        <div className="pl-2 pr-3 py-1.5 flex items-center gap-2 border-b border-[#F0F0F0] dark:border-[#333333] mb-0.5">
                                            <button 
                                                onClick={() => setIsMoving(false)}
                                                className="group/btn p-1 rounded-full hover:bg-[#F0EDE8] dark:hover:bg-[#333] transition-colors"
                                            >
                                                <ChevronLeft size={14} className="transition-transform duration-200 group-hover/btn:scale-110" />
                                            </button>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7D7D7D]">Select Workspace</span>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto scrollbar-hide">
                                            {/* Root Option */}
                                            <button
                                                disabled={isMovingNote || !note.workspace_id}
                                                onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsMovingNote(true);
                                                    await onMove?.(note, null);
                                                    setIsMovingNote(false);
                                                    setIsMenuOpen(false);
                                                    setIsMoving(false);
                                                }}
                                                className={`group/btn w-full text-left px-2.5 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                                                    !note.workspace_id 
                                                    ? "text-[#BABABA] dark:text-[#545454] cursor-default" 
                                                    : "text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333]"
                                                }`}
                                            >
                                                <Folder className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
                                                <span className="truncate flex-1">Main Library</span>
                                                {isMovingNote && <Loader2 size={12} className="animate-spin" />}
                                            </button>
                                            
                                            {workspaces.map((ws) => (
                                                <button
                                                    key={ws.id}
                                                    disabled={isMovingNote || note.workspace_id === ws.id}
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setIsMovingNote(true);
                                                        await onMove?.(note, ws.id);
                                                        setIsMovingNote(false);
                                                        setIsMenuOpen(false);
                                                        setIsMoving(false);
                                                    }}
                                                    className={`group/btn w-full text-left px-2.5 py-1.5 text-sm flex items-center gap-2 transition-colors ${
                                                        note.workspace_id === ws.id 
                                                        ? "text-[#BABABA] dark:text-[#545454] cursor-default" 
                                                        : "text-[#252525] dark:text-white hover:bg-[#F0EDE8] dark:hover:bg-[#333]"
                                                    }`}
                                                >
                                                    <Folder className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:scale-110" fill="currentColor" fillOpacity={0.1} />
                                                    <span className="truncate flex-1">{ws.name}</span>
                                                    {isMovingNote && <Loader2 size={12} className="animate-spin" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {isList && (
                        <div className="w-5 h-5 flex items-center justify-center text-[#BABABA] shrink-0">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
