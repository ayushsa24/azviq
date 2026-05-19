import React from "react";
import { Editor } from "@tiptap/react";
import {
    Bold,
    Italic,
    Underline,
    Link as LinkIcon,
    Sparkles,
    Highlighter,
    ChevronDown,
    X
} from "lucide-react";

interface MobileSelectionBarProps {
    editor: Editor;
    onOpenAi: () => void;
    isVisible: boolean;
}

export function MobileSelectionBar({ editor, onOpenAi, isVisible }: MobileSelectionBarProps) {
    const [bottomOffset, setBottomOffset] = React.useState(0);

    React.useEffect(() => {
        if (!isVisible || typeof window === 'undefined' || !window.visualViewport) return;

        const handleResize = () => {
            const viewport = window.visualViewport;
            if (!viewport) return;
            
            // Calculate how much the keyboard is covering the screen
            const offset = window.innerHeight - viewport.height;
            setBottomOffset(Math.max(0, offset));
        };

        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
        handleResize();

        return () => {
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleResize);
        };
    }, [isVisible]);

    if (!isVisible) return null;

    const isActive = (type: string) => editor.isActive(type);

    const toggleFormat = (type: string) => {
        (editor.chain().focus() as any)[`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`]().run();
    };

    return (
        <div 
            className="fixed left-0 right-0 z-[100] animate-in slide-in-from-bottom duration-300"
            style={{ 
                bottom: `${bottomOffset}px`,
                paddingBottom: bottomOffset > 0 ? '8px' : 'env(safe-area-inset-bottom, 16px)'
            }}
        >
            {/* Glossy Backdrop - Minimal version */}
            <div className="w-fit mx-auto mb-3 bg-white/95 dark:bg-[#252525]/95 backdrop-blur-xl border border-[#E8E5E0] dark:border-[#3A3A3A] shadow-lg rounded-xl overflow-hidden px-1">
                <div className="flex items-center justify-center gap-1 py-1">
                    {/* Compact AI Button */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onOpenAi();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#252525] dark:bg-white text-white dark:text-[#252525] rounded-lg text-xs font-bold active:scale-95 transition-all shrink-0"
                    >
                        <Sparkles size={16} />
                        <span>AI</span>
                        <ChevronDown size={10} opacity={0.6} />
                    </button>

                    <div className="w-px h-4 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-0.5" />

                    {/* Compact Formatting */}
                    <div className="flex items-center gap-0.5">
                        <MobileFormatButton 
                            icon={Bold} 
                            active={isActive('bold')} 
                            onClick={() => toggleFormat('bold')} 
                        />
                        <MobileFormatButton 
                            icon={Italic} 
                            active={isActive('italic')} 
                            onClick={() => toggleFormat('italic')} 
                        />
                        <MobileFormatButton 
                            icon={Underline} 
                            active={isActive('underline')} 
                            onClick={() => toggleFormat('underline')} 
                        />
                    </div>

                    <div className="w-px h-4 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-0.5" />

                    {/* Compact Tools */}
                    <div className="flex items-center gap-0.5">
                        <MobileFormatButton 
                            icon={Highlighter} 
                            active={isActive('highlight')} 
                            onClick={() => editor.chain().focus().toggleHighlight({ color: '#ffcc00' }).run()} 
                        />
                        <MobileFormatButton 
                            icon={LinkIcon} 
                            active={isActive('link')} 
                            onClick={() => {
                                const previousUrl = editor.getAttributes('link').href;
                                const url = window.prompt("URL", previousUrl);
                                if (url === null) return;
                                if (url === "") {
                                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                                } else {
                                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                                }
                            }} 
                        />
                    </div>
                    
                    <div className="w-px h-4 bg-[#E8E5E0] dark:bg-[#3A3A3A] mx-0.5" />

                    <button 
                        onClick={() => editor.chain().focus().setTextSelection(editor.state.selection.to).run()}
                        className="p-1 text-[#7D7D7D] dark:text-[#BABABA] active:bg-black/5 rounded-full"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MobileFormatButton({ icon: Icon, active, onClick }: { icon: any, active: boolean, onClick: () => void }) {
    return (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            className={`p-2 rounded-lg transition-all active:scale-90 ${
                active 
                ? "bg-[#252525]/10 dark:bg-white/10 text-[#252525] dark:text-white" 
                : "text-[#545454] dark:text-[#BABABA]"
            }`}
        >
            <Icon size={18} strokeWidth={active ? 3 : 2} />
        </button>
    );
}
