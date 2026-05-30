"use client";
import React, { useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { Link as LinkIcon, ExternalLink, Trash2, Check, Clipboard, X } from "lucide-react";

interface LinkPopoverProps {
    editor: Editor;
    onClose: () => void;
    /** Where to anchor the popover. On mobile pass null to use bottom-sheet style. */
    anchorPos?: { x: number; bottom: number } | null;
    isMobile?: boolean;
}

export function LinkPopover({ editor, onClose, anchorPos, isMobile = false }: LinkPopoverProps) {
    const existing = editor.getAttributes("link").href as string | undefined;
    const [url, setUrl] = useState(existing ?? "");
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const isDark = document.documentElement.classList.contains("dark");

    useEffect(() => {
        // Auto-focus input on mount
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        // Delay attaching to prevent the opening click from instantly closing it
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleOutsideClick, true);
            document.addEventListener("touchstart", handleOutsideClick, { capture: true, passive: true });
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleOutsideClick, true);
            document.removeEventListener("touchstart", handleOutsideClick, true);
        };
    }, [onClose]);

    const normalise = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return "";
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (/^mailto:/i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    const apply = () => {
        const final = normalise(url);
        if (!final) { setError("Please enter a URL"); return; }
        try { new URL(final); } catch { setError("Invalid URL"); return; }
        editor.chain().focus().extendMarkRange("link").setLink({ href: final, target: "_blank" }).run();
        onClose();
    };

    const remove = () => {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        onClose();
    };

    const paste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setUrl(text.trim());
            setError("");
        } catch { /* permission denied */ }
    };

    const open = () => {
        const final = normalise(url);
        if (!final) return;
        try {
            new URL(final);
            window.open(final, "_blank", "noopener,noreferrer");
        } catch {
            setError("Invalid URL format");
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); apply(); }
        if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };

    const panel = (
        <div
            ref={panelRef}
            className={`bg-white dark:bg-[#1E1E1E] border border-[#E4E1DC] dark:border-[#333] shadow-2xl rounded-xl overflow-hidden pointer-events-auto ${isMobile ? "w-[calc(100vw-32px)] max-w-sm mx-auto" : "w-72"}`}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                <LinkIcon size={14} className="text-[#7D7D7D] dark:text-[#BABABA] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#7D7D7D] dark:text-[#BABABA]">
                    {existing ? "Edit Link" : "Insert Link"}
                </span>
                <button onClick={onClose} className="ml-auto p-0.5 rounded-md text-[#BABABA] hover:text-[#252525] dark:hover:text-white transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* URL Input */}
            <div className="px-3 pb-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border ${error ? "border-red-400" : "border-[#E4E1DC] dark:border-[#333]"} bg-[#F9F8F6] dark:bg-[#252525] focus-within:border-[#C2A27A] dark:focus-within:border-[#C2A27A] transition-colors`}>
                    <input
                        ref={inputRef}
                        type="url"
                        value={url}
                        onChange={(e) => { setUrl(e.target.value); setError(""); }}
                        onKeyDown={handleKey}
                        placeholder="https://example.com"
                        className="flex-1 bg-transparent text-xs text-[#252525] dark:text-white placeholder-[#BABABA] dark:placeholder-[#545454] outline-none min-w-0"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    <button
                        onClick={paste}
                        title="Paste from clipboard"
                        className="shrink-0 p-1 text-[#BABABA] dark:text-[#545454] hover:text-[#252525] dark:hover:text-white rounded transition-colors"
                    >
                        <Clipboard size={13} />
                    </button>
                </div>
                {error && <p className="text-[10px] text-red-500 mt-1 ml-1">{error}</p>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 px-3 pb-3">
                {/* Remove (only if link already applied) */}
                {existing && (
                    <button
                        onClick={remove}
                        title="Remove link"
                        className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg transition-colors active:scale-95"
                    >
                        <Trash2 size={13} />
                    </button>
                )}

                {/* Visit (only if URL exists) */}
                {url && (
                    <button
                        onClick={open}
                        title="Open link in new tab"
                        className="p-1.5 text-[#7D7D7D] dark:text-[#BABABA] hover:text-[#252525] dark:hover:text-white border border-[#E4E1DC] dark:border-[#333] rounded-lg transition-colors active:scale-95"
                    >
                        <ExternalLink size={13} />
                    </button>
                )}

                {/* Apply */}
                <button
                    onClick={apply}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] text-xs font-semibold rounded-lg hover:bg-[#1A1A1A] dark:hover:bg-white/90 transition-colors active:scale-95"
                >
                    <Check size={13} />
                    Apply
                </button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className="fixed inset-x-0 z-[3000] flex justify-center px-4" style={{ bottom: 90 }}>
                {panel}
            </div>
        );
    }

    // Desktop: positioned near toolbar
    if (!anchorPos) return null;
    return (
        <div
            className="fixed z-[3000]"
            style={{
                top: Math.min(anchorPos.bottom + 8, window.innerHeight - 230),
                left: Math.max(148, Math.min(anchorPos.x, window.innerWidth - 148)),
                transform: "translateX(-50%)",
            }}
        >
            {panel}
        </div>
    );
}
