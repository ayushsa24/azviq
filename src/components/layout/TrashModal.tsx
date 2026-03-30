"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, AlertCircle, FileText, CheckSquare, RotateCcw, Search } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/utils/translations";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === "dark";
  const [activeCategory, setActiveCategory] = useState<"all" | "note" | "task" | "revision">("all");

  if (!isOpen) return null;

  const categories = [
    { id: "all", label: "All Items", icon: Trash2 },
    { id: "note", label: "Notes & PDFs", icon: FileText },
    { id: "task", label: "Tasks", icon: CheckSquare },
    { id: "revision", label: "Revisions", icon: RotateCcw },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" 
        onClick={onClose}
      />

      {/* Modal Container - Matched size and style with SettingsModal */}
      <div className={`relative w-full h-full sm:h-[600px] sm:max-w-3xl flex flex-col sm:flex-row rounded-none sm:rounded-3xl shadow-2xl overflow-hidden transition-colors border-0 sm:border animate-in zoom-in-95 duration-200 ${
        isDark ? "bg-[#1A1A1A] text-white border-[#3A3A3A]" : "bg-white text-[#252525] border-[#E8E5E0]"
      }`}>
        
        {/* Sidebar Navigation - Matched SettingsModal */}
        <div className={`shrink-0 flex-none border-b sm:border-b-0 sm:border-r transition-colors flex flex-col ${
          isDark ? "bg-[#1A1A1A] border-[#2E2E2E]" : "bg-[#F7F7F8] border-[#E8E5E0]"
        } w-full sm:w-64`}>
          
          <div className="flex items-center justify-between px-4 pt-14 pb-4 sm:pt-6 sm:px-6">
            <h2 className="text-lg font-bold sm:text-2xl">Trash</h2>
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors sm:hidden">
                <X size={20} />
            </button>
          </div>

          <div className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible px-2 pb-2 sm:pb-6 space-x-1 sm:space-x-0 sm:space-y-1 scrollbar-hide">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl transition-all text-sm font-semibold whitespace-nowrap sm:whitespace-normal shrink-0 sm:shrink outline-none ${
                    isActive
                      ? (isDark ? "bg-[#333] text-white" : "bg-white sm:bg-[#F0F0F0] text-[#252525] shadow-sm sm:shadow-none border border-[#E8E5E0] sm:border-transparent")
                      : (isDark ? "text-[#BABABA] hover:bg-[#252525]" : "text-[#545454] hover:bg-[#E8E5E0]")
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#C2A27A]" : ""} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <div className="flex items-center justify-end px-6 pt-6 hidden sm:flex">
             <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                 <X size={24} className="text-[#7D7D7D]" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
            
            {/* 7 Day Notice */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border border-[#C2A27A]/20 bg-[#C2A27A]/5 transition-colors`}>
              <AlertCircle size={18} className="text-[#C2A27A] shrink-0" />
              <p className="text-[11px] font-bold text-[#C2A27A] leading-relaxed uppercase tracking-wider">
                Permanently removed after 7 days automatically
              </p>
            </div>

            <div className="space-y-3">
               {/* Simplified Item List */}
               {(activeCategory === "all" || activeCategory === "note") && (
                 <div className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                   isDark ? "bg-[#252525]/50 border-[#3A3A3A] hover:bg-[#252525]" : "bg-[#F9F9F9] border-[#E8E5E0] hover:bg-white"
                 }`}>
                   <div className="flex items-center gap-3 min-w-0">
                     <FileText size={18} className="text-[#C2A27A] shrink-0" />
                     <div className="min-w-0">
                       <p className="text-sm font-bold truncate">Cell Biology Midterm.pdf</p>
                       <p className="text-[10px] text-[#7D7D7D]">Deleted 2 days ago</p>
                     </div>
                   </div>
                   <button className="text-[11px] font-black uppercase text-[#C2A27A] hover:underline px-2 transition-all active:scale-95">
                       Restore
                   </button>
                 </div>
               )}

               {(activeCategory === "all" || activeCategory === "task") && (
                 <div className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                   isDark ? "bg-[#252525]/50 border-[#3A3A3A] hover:bg-[#252525]" : "bg-[#F9F9F9] border-[#E8E5E0] hover:bg-white"
                 }`}>
                   <div className="flex items-center gap-3 min-w-0">
                     <CheckSquare size={18} className="text-[#C2A27A] shrink-0" />
                     <div className="min-w-0">
                       <p className="text-sm font-bold truncate">Finish Chemistry Lab</p>
                       <p className="text-[10px] text-[#7D7D7D]">Deleted 5 days ago</p>
                     </div>
                   </div>
                   <button className="text-[11px] font-black uppercase text-[#C2A27A] hover:underline px-2 transition-all active:scale-95">
                       Restore
                   </button>
                 </div>
               )}

               {activeCategory === "revision" && (
                 <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                   <RotateCcw size={32} className="mb-2" />
                   <p className="text-xs font-bold uppercase tracking-widest">No Items</p>
                 </div>
               )}
            </div>
          </div>

          {/* Action Footer */}
          <div className={`px-6 py-4 border-t transition-colors ${
            isDark ? "border-[#2E2E2E]" : "border-[#E8E5E0]"
          }`}>
             <button className="w-full py-3 rounded-xl bg-red-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95">
                Empty Trash Bin
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
