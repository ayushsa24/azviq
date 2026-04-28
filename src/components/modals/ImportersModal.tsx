"use client";

import React, { useState, useEffect } from "react";
import { Users, X, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Importer {
  id: string;
  name: string;
  email: string;
  image: string | null;
  importedAt?: string;
}

interface ImportersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "chat" | "note";
  id: string;
  theme?: "light" | "dark";
}

export const ImportersModal: React.FC<ImportersModalProps> = ({
  isOpen,
  onClose,
  type,
  id,
  theme = "light"
}) => {
  const [importers, setImporters] = useState<Importer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && id) {
      fetchImporters();
    } else {
      setImporters([]);
    }
  }, [isOpen, id, type]);

  const fetchImporters = async () => {
    try {
      setIsLoading(true);
      const endpoint = type === "chat" 
        ? `/api/chat/${id}/importers` 
        : `/api/notes/${id}/importers`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.importers) {
        setImporters(data.importers);
      }
    } catch (err) {
      console.error(`Failed to fetch ${type} importers:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-transparent p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={`rounded-xl shadow-2xl w-full max-w-md border overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 ${
          theme === "dark" ? "bg-[#1A1A1A] md:bg-[#1F1F1F] border-[#3A3A3A]" : "bg-white border-[#E8E5E0]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${
          theme === "dark" ? "bg-[#1A1A1A] md:bg-[#1F1F1F] border-[#3A3A3A]" : "bg-[#F9F8F6] border-[#E8E5E0]"
        }`}>
          <h3 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
            <Users size={18} className="text-[#8B7E6D]" />
            {type === "chat" ? "Chat Importers" : "Note Importers"}
          </h3>
          <button 
            onClick={onClose}
            className="text-[#8B7E6D] hover:text-[#252525] dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto p-2 scrollbar-hide">
          {isLoading ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-1/2 h-4" />
                    <Skeleton variant="text" className="w-1/3 h-3" />
                  </div>
                  <Skeleton variant="circle" className="w-2 h-2" />
                </div>
              ))}
            </div>
          ) : importers.length === 0 ? (
            <div className="py-12 text-center text-[#8B7E6D] text-sm italic">
              No one has imported this {type} yet.
            </div>
          ) : (
            <div className="space-y-1">
              {importers.map((importer) => (
                <div
                  key={importer.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
                    theme === 'dark' ? 'hover:bg-[#3A3A3A]' : 'hover:bg-[#F0EDE8]'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border ${
                    theme === 'dark' ? 'bg-[#4A4A4A] border-[#545454]' : 'bg-[#E8E5E0] border-[#D9D1C1]'
                  }`}>
                    {importer.image ? (
                      <img src={importer.image} alt={importer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[#8B7E6D]">
                        {importer.name?.[0]?.toUpperCase() || importer.email?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-[#252525]'}`}>
                      {importer.name || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-[#8B7E6D] truncate">
                      {importer.email}
                    </p>
                    {importer.importedAt && (
                      <p className={`text-[10px] mt-0.5 ${theme === 'dark' ? 'text-[#6D6D6D]' : 'text-[#A39686]'}`}>
                        Imported on {new Date(importer.importedAt).toLocaleDateString()} at {new Date(importer.importedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div 
                    className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" 
                    title="Connected" 
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t text-[11px] text-[#8B7E6D] text-center italic ${
          theme === "dark" ? "bg-[#1A1A1A] md:bg-[#1F1F1F] border-[#3A3A3A]" : "bg-[#F9F8F6] border-[#E8E5E0]"
        }`}>
          {type === 'chat' 
            ? "Users who have imported this chat can view the shared content." 
            : "Importers can see your updates in real-time if sharing is enabled."}
        </div>
      </div>
    </div>
  );
};
