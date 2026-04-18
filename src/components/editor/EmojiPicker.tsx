import React, { useState } from 'react';
import { 
    Search, Smile, FileText, CheckCircle, Target, Star, 
    Music, Video, Camera, Image, Palette, User, 
    Users, Home, Briefcase, Code, Terminal, Settings, 
    Bell, Mail, Send, Link, MapPin, Globe, Zap, 
    Flame, Heart, Coffee, Book, Calendar, X 
} from 'lucide-react';

interface EmojiPickerProps {
    onSelectIcon: (iconName: string) => void;
    onClose: () => void;
    theme?: 'light' | 'dark';
}

export const ICON_MAP: Record<string, any> = {
    FileText, Book, Calendar, CheckCircle, Target, Star, 
    Music, Video, Camera, Image, Palette, Smile, 
    User, Users, Home, Briefcase, Code, Terminal,
    Settings, Search, Bell, Mail, Send, Link,
    MapPin, Globe, Zap, Flame, Heart, Coffee
};

export function EmojiPicker({ onSelectIcon, onClose, theme = 'light' }: EmojiPickerProps) {
    const [search, setSearch] = useState('');

    const filteredIcons = Object.keys(ICON_MAP).filter(name => 
        name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col w-[300px] h-[350px] bg-white dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#2A2A2A] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Search */}
            <div className="p-4 pb-2">
                <div className="flex items-center gap-2 bg-[#F5F5F3] dark:bg-[#252525] px-3 py-1.5 rounded-lg border border-transparent focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <Search size={14} className="text-[#A3A3A3]" />
                    <input 
                        type="text"
                        placeholder="Search icons..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full text-[#252525] dark:text-[#EAEAEA] placeholder-[#A3A3A3]"
                        autoFocus
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 pt-1 custom-scrollbar">
                <div className="grid grid-cols-4 gap-2">
                    {/* None Option */}
                    <button
                        onClick={() => onSelectIcon("")}
                        className="aspect-square flex items-center justify-center p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-red-500 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                        title="Remove Icon"
                    >
                        <X size={20} />
                    </button>

                    {filteredIcons.map((name) => {
                        const IconComp = ICON_MAP[name];
                        return (
                            <button
                                key={name}
                                onClick={() => onSelectIcon(name)}
                                className="aspect-square flex items-center justify-center p-2 hover:bg-[#F5F5F3] dark:hover:bg-[#252525] rounded-xl text-[#545454] dark:text-[#A3A3A3] hover:text-[#252525] dark:hover:text-white transition-all border border-transparent hover:border-[#E0E0E0] dark:hover:border-[#3A3A3A]"
                                title={name}
                            >
                                <IconComp size={22} strokeWidth={1.5} />
                            </button>
                        );
                    })}
                </div>
            </div>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3A3A3A;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
