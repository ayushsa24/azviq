"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import Toast from "@/components/ui/Toast";

interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: "info" | "success" | "error" | "warning";
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  show: (config: Omit<ToastMessage, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((config: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...config, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss
    const duration = config.duration !== undefined ? config.duration : 5000;
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed bottom-[72px] md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-3 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {toasts.map(({ id, ...toast }) => (
            <Toast key={id} {...toast} onDismiss={() => dismiss(id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
