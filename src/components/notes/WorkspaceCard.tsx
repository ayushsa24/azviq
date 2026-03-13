import React, { useState, useRef, useEffect } from "react";
import { Folder, MoreVertical, Pin, Edit2, Trash2 } from "lucide-react";
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
    const [menuSide, setMenuSide] = useState<"top" | "bottom">("bottom");
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
                const menuHeight = 160;
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
        onClick(workspace);
    };

    return (
        <div
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            className={`group p-3.5 rounded-xl cursor-pointer transition-all duration-200 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 bg-white dark:bg-white/5 hover:bg-[#F9F8F6] dark:hover:bg-white/10 hover:border-[#D1D1D1] dark:hover:border-[#444] relative shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-md ${isList ? "flex flex-row items-center gap-3 h-auto py-3 px-4" : "flex flex-col justify-between h-40"
                }`}
        >
            {/* Pin indicator - Grid view */}
            {!isList && workspace.is_pinned && (
                <div className="absolute top-3 left-3 bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white p-1 rounded-full" title="Pinned">
                    <Pin size={10} fill="currentColor" strokeWidth={0} />
                </div>
            )}

            <div className={`flex items-center shrink-0 text-[#545454] dark:text-[#7D7D7D] group-hover:text-[#252525] dark:group-hover:text-white transition-colors ${isList ? "" : "flex-1 justify-center"
                }`}>
                <Folder size={isList ? 24 : 40} strokeWidth={isList ? 2 : 1.5} fill="currentColor" className="opacity-20 hidden dark:block" />
                <Folder size={isList ? 24 : 40} strokeWidth={isList ? 2 : 1.5} className="dark:hidden" />
            </div>

            <div className={`border-[#E8E5E0] dark:border-[#7D7D7D]/20 transition-colors ${isList ? "flex-1 min-w-0 flex flex-row items-center justify-between border-none mt-0 pt-0 gap-2" : "mt-2.5 pt-2.5 border-t"
                }`}>
                <div className={`${isList ? "flex items-center gap-2 min-w-0" : "pr-6"}`}>
                    {isList && workspace.is_pinned && (
                        <Pin size={14} fill="currentColor" className="text-[#252525] dark:text-white shrink-0" strokeWidth={0} />
                    )}
                    <h3 className={`font-semibold truncate text-[#252525] dark:text-white transition-colors ${isList ? "text-sm sm:text-base" : "text-[13px] mb-0.5"
                        }`}>
                        {workspace.name}
                    </h3>
                    {workspace.description && !isList && (
                        <p className="text-[11px] text-[#545454] dark:text-[#BABABA] truncate mb-1 leading-tight">
                            {workspace.description}
                        </p>
                    )}
                </div>

                <div className={`flex items-center text-[#545454] dark:text-[#BABABA] transition-colors ${isList ? "text-xs sm:text-sm gap-2 shrink-0" : "justify-between text-[10px] w-full"
                    }`}>
                    <span className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
                    </span>

                    <div ref={menuRef} className="relative">
                        {!isMobileApp && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(!isMenuOpen);
                                }}
                                className={`p-1.5 rounded-md hover:bg-[#E0E0E0] dark:hover:bg-[#545454] transition-colors ${isMenuOpen ? "bg-[#E0E0E0] dark:bg-[#545454] opacity-100" : "opacity-0 group-hover:opacity-100"
                                    }`}
                            >
                                <MoreVertical size={16} className="text-[#545454] dark:text-white" />
                            </button>
                        )}

                        {isMenuOpen && menuPosition && (
                            <div
                                className="fixed z-[9999] w-48 bg-white/80 backdrop-blur-md dark:bg-[#252525] rounded-lg shadow-xl border border-[#E8E5E0] dark:border-[#545454] py-1 transition-all animate-in fade-in zoom-in-95 duration-150"
                                style={{ top: menuPosition.top, right: menuPosition.right }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onTogglePin?.(workspace))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors"
                                >
                                    <Pin size={14} className={workspace.is_pinned ? "fill-current" : ""} />
                                    {workspace.is_pinned ? "Unpin" : "Pin to Top"}
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onRename?.(workspace))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-white hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors border-b border-[#F0F0F0] dark:border-[#333333]"
                                >
                                    <Edit2 size={14} />
                                    Rename Workspace
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onDelete?.(workspace))}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Delete Workspace
                                </button>
                            </div>
                        )}
                    </div>
                    {isList && (
                        <div className="w-5 h-5 flex items-center justify-center text-[#BABABA] shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
