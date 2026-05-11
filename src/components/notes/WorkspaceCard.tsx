import React, { useState, useRef, useEffect } from "react";
import { Folder, MoreVertical, Pin, Edit2, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Workspace } from "@/types";

interface WorkspaceCardProps {
    workspace: Workspace;
    onClick: (workspace: Workspace) => void;
    viewMode?: "grid" | "list";
    onRename?: (workspace: Workspace) => void;
    onDelete?: (workspace: Workspace) => void;
    onTogglePin?: (workspace: Workspace) => void;
}

export function WorkspaceCard({
    workspace,
    onClick,
    viewMode = "grid",
    onRename,
    onDelete,
    onTogglePin
}: WorkspaceCardProps) {
    const isList = viewMode === "list";
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileApp, setIsMobileApp] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

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
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScrollOrResize, true);
            window.addEventListener('resize', handleScrollOrResize);
            
            // Calculate fixed position
            if (menuRef.current) {
                const rect = menuRef.current.getBoundingClientRect();
                const menuHeight = 160; 
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                    setMenuPosition({ top: rect.top - menuHeight - 4, right: window.innerWidth - rect.right });
                } else {
                    setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
        setIsMenuOpen(false);
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
        onClick(workspace);
    };

    return (
        <div
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 bg-white dark:bg-white/5 hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] relative shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md ${isList ? "flex flex-row items-center gap-4 h-auto py-3 px-4" : "flex flex-col justify-between h-44"
                } ${isMenuOpen ? "z-[110] ring-1 ring-black/5 dark:ring-white/5 shadow-xl" : "z-0"}`}
        >
            {/* Pin indicator - Grid view */}
            {!isList && workspace.is_pinned && (
                <div className="absolute top-3 left-3 bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white p-1 rounded-full" title="Pinned">
                    <Pin className="w-2.5 h-2.5" strokeWidth={1.5} fill="none" />
                </div>
            )}

            <div className={`flex items-center shrink-0 text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors ${isList ? "w-10 h-10 items-center justify-center rounded-full bg-[#F0EDE8] dark:bg-white/10" : "flex-1 justify-center"
                }`}>
                <Folder strokeWidth={1.5} className={isList ? "w-5 h-5" : "w-10 h-10 transition-transform group-hover:scale-110 mb-1"} />
            </div>

            <div className={`transition-colors min-w-0 ${isList ? "flex-1 flex flex-row items-center justify-between" : "mt-3 pt-3 border-t border-[#E8E5E0] dark:border-[#7D7D7D]/20"
                }`}>
                <div className={`min-w-0 ${isList ? "flex-1 flex flex-col justify-center" : "w-full pb-1"}`}>
                    <h3 className={`font-semibold truncate text-[#545454] dark:text-[#BABABA] group-hover:text-black dark:group-hover:text-white transition-colors flex items-center gap-1.5 ${isList ? "text-sm" : "text-sm"
                        }`} title={workspace.name}>
                        {isList && workspace.is_pinned && (
                            <Pin className="w-3.5 h-3.5 text-[#252525] dark:text-white shrink-0" strokeWidth={1.5} fill="none" />
                        )}
                        <span className="truncate">{workspace.name}</span>
                    </h3>

                    <div className={`${isList ? "mt-0.5 text-[10px] text-[#BABABA]" : "justify-between text-[0.625rem] w-full flex items-center text-[#545454] dark:text-[#BABABA] transition-colors mt-auto"
                        }`}>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            {(() => {
                                const date = new Date(workspace.created_at);
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
                                className="fixed z-[9999] w-48 bg-white/95 backdrop-blur-xl dark:bg-[#1C1C1C]/95 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-[#E8E5E0] dark:border-[#333333] py-1.5 transition-all animate-in fade-in zoom-in-95 duration-100"
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                            >
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onTogglePin?.(workspace))}
                                    className="w-full text-left px-4 py-2.5 text-sm text-[#252525] dark:text-white hover:bg-[#F5F5F3] dark:hover:bg-[#2A2A2A] flex items-center gap-2.5 transition-colors"
                                >
                                    <Pin className={`w-3.5 h-3.5 ${workspace.is_pinned ? "fill-current" : ""}`} />
                                    {workspace.is_pinned ? "Unpin" : "Pin to Top"}
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onRename?.(workspace))}
                                    className="w-full text-left px-4 py-2.5 text-sm text-[#252525] dark:text-white hover:bg-[#F5F5F3] dark:hover:bg-[#2A2A2A] flex items-center gap-2.5 transition-colors border-b border-[#F0F0F0] dark:border-[#333333]"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Rename Workspace
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onDelete?.(workspace))}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Move to Trash
                                </button>
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
