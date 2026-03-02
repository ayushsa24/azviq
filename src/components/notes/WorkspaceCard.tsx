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
        }
        return () => {
            document.addEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

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
            className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border border-[#E8E5E0] dark:border-[#7D7D7D]/30 bg-white dark:bg-[#CFCFCF]/10 hover:bg-[#F9F8F6] dark:hover:bg-[#CFCFCF]/20 hover:border-[#D1D1D1] dark:hover:border-[#444] relative shadow-[0_2px_8_rgba(0,0,0,0.04)] hover:shadow-md ${isList ? "flex flex-row items-center gap-3 h-auto py-3 px-4" : "flex flex-col justify-between h-48"
                }`}
        >
            {/* Pin indicator - Grid view */}
            {!isList && workspace.is_pinned && (
                <div className="absolute top-4 right-4 bg-[#252525]/10 dark:bg-[#CFCFCF]/10 text-[#252525] dark:text-[#CFCFCF] p-1 rounded-full" title="Pinned">
                    <Pin size={12} fill="currentColor" strokeWidth={0} />
                </div>
            )}

            <div className={`flex items-center shrink-0 text-[#545454] dark:text-[#7D7D7D] group-hover:text-[#252525] dark:group-hover:text-[#CFCFCF] transition-colors ${isList ? "" : "flex-1 justify-center"
                }`}>
                <Folder size={isList ? 24 : 48} strokeWidth={isList ? 2 : 1} fill="currentColor" className="opacity-20 hidden dark:block" />
                <Folder size={isList ? 24 : 48} strokeWidth={isList ? 2 : 1} className="dark:hidden" />
            </div>

            <div className={`border-[#CFCFCF] dark:border-[#7D7D7D]/20 transition-colors ${isList ? "flex-1 min-w-0 flex flex-row items-center justify-between border-none mt-0 pt-0 gap-2" : "mt-4 pt-4 border-t"
                }`}>
                <div className={`${isList ? "flex items-center gap-2 min-w-0" : "pr-6"}`}>
                    {isList && workspace.is_pinned && (
                        <Pin size={14} fill="currentColor" className="text-[#252525] dark:text-[#CFCFCF] shrink-0" strokeWidth={0} />
                    )}
                    <h3 className={`font-semibold truncate text-[#252525] dark:text-[#CFCFCF] transition-colors ${isList ? "text-sm sm:text-base" : "text-sm mb-1"
                        }`}>
                        {workspace.name}
                    </h3>
                    {workspace.description && !isList && (
                        <p className="text-xs text-[#545454] dark:text-[#7D7D7D] truncate mb-2">
                            {workspace.description}
                        </p>
                    )}
                </div>

                <div className={`flex items-center text-[#545454] dark:text-[#545454] transition-colors ${isList ? "text-xs sm:text-sm gap-2 shrink-0" : "justify-between text-xs w-full"
                    }`}>
                    <span className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(workspace.created_at), { addSuffix: true })}
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

                        {isMenuOpen && (
                            <div className={`absolute z-10 w-48 bg-white dark:bg-[#252525] rounded-lg shadow-lg border border-[#CFCFCF] dark:border-[#545454] py-1 ${isList ? "right-0 top-10" : "right-0 bottom-8"
                                }`}>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onTogglePin?.(workspace))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors"
                                >
                                    <Pin size={14} className={workspace.is_pinned ? "fill-current" : ""} />
                                    {workspace.is_pinned ? "Unpin" : "Pin to Top"}
                                </button>
                                <button
                                    onClick={(e) => handleMenuAction(e, () => onRename?.(workspace))}
                                    className="w-full text-left px-4 py-2 text-sm text-[#252525] dark:text-[#CFCFCF] hover:bg-[#F5F5F5] dark:hover:bg-[#1A1A1A] flex items-center gap-2 transition-colors border-b border-[#F0F0F0] dark:border-[#333333]"
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
                </div>
            </div>
        </div>
    );
}
