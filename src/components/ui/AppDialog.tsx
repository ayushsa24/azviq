"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type DialogType = "confirm" | "alert" | "info" | "success" | "error" | "warning";

interface DialogConfig {
  title?: string;
  message: string;
  type?: DialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DialogState extends DialogConfig {
  open: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogContextValue {
  showConfirm: (config: DialogConfig) => Promise<boolean>;
  showAlert: (message: string, type?: DialogType, title?: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const DialogContext = createContext<DialogContextValue | null>(null);

export function useAppDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useAppDialog must be used within AppDialogProvider");
  return ctx;
}

// ─── Imperative API (for non-React contexts like utility files) ───────────────
let _showConfirmGlobal: DialogContextValue["showConfirm"] | null = null;
let _showAlertGlobal: DialogContextValue["showAlert"] | null = null;

export async function showConfirmDialog(config: DialogConfig): Promise<boolean> {
  if (_showConfirmGlobal) return _showConfirmGlobal(config);
  // Fallback to browser dialog if provider not mounted
  return window.confirm(config.message);
}

export async function showAlertDialog(message: string, type?: DialogType, title?: string): Promise<void> {
  if (_showAlertGlobal) return _showAlertGlobal(message, type, title);
  window.alert(message);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, message: "" });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((config: DialogConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...config, open: true });
    });
  }, []);

  const showAlert = useCallback((message: string, type: DialogType = "info", title?: string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current = (v: boolean) => resolve();
      setState({
        message,
        type: type || "info",
        title,
        open: true,
        confirmLabel: "OK",
        cancelLabel: undefined,
      });
    });
  }, []);

  // Register global imperative API
  useEffect(() => {
    _showConfirmGlobal = showConfirm;
    _showAlertGlobal = showAlert;
    return () => {
      _showConfirmGlobal = null;
      _showAlertGlobal = null;
    };
  }, [showConfirm, showAlert]);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setState((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      <AppDialogModal state={state} onConfirm={handleConfirm} onCancel={handleCancel} />
    </DialogContext.Provider>
  );
}

// ─── Dialog Modal UI ──────────────────────────────────────────────────────────
const ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  confirm: { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  alert:   { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
  info:    { icon: Info,          color: "text-blue-500 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-500/10"   },
  success: { icon: CheckCircle,   color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  error:   { icon: XCircle,       color: "text-red-500 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-500/10"     },
};

function AppDialogModal({
  state,
  onConfirm,
  onCancel,
}: {
  state: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const isConfirm = !!state.cancelLabel || state.type === "confirm";
  const isDanger = state.danger;

  // Handle open/close animation
  useEffect(() => {
    if (state.open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [state.open]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.open) onCancel();
      if (e.key === "Enter" && state.open) onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.open, onConfirm, onCancel]);

  if (!state.open) return null;

  const type = state.type || (isConfirm ? "confirm" : "info");
  const { icon: Icon, color, bg } = ICON_MAP[type] || ICON_MAP.info;
  const defaultTitle = type === "confirm" || type === "alert" ? "Are you sure?" : type === "error" ? "Error" : type === "success" ? "Success" : type === "warning" ? "Warning" : "Notice";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-all duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backdropFilter: visible ? "blur(6px)" : "none" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={isConfirm ? onCancel : onConfirm}
      />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-2xl border border-[#E8E5E0] dark:border-[#2E2E2E] overflow-hidden transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
        }`}
      >
        <div className="p-5 pb-4">
          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="font-semibold text-[#252525] dark:text-white text-base leading-snug">
                {state.title || defaultTitle}
              </h3>
              <p className="mt-1 text-sm text-[#545454] dark:text-[#BABABA] leading-relaxed">
                {state.message}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E8E5E0] dark:bg-[#2E2E2E]" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3">
          {isConfirm && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-[#545454] dark:text-[#BABABA] bg-transparent hover:bg-[#F0EDE8] dark:hover:bg-[#2A2A2A] border border-[#E8E5E0] dark:border-[#3A3A3A] rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {state.cancelLabel || "Cancel"}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm ${
              isDanger
                ? "bg-red-500 hover:bg-red-600 text-white border border-red-600"
                : "bg-[#252525] dark:bg-white text-white dark:text-[#252525] hover:bg-[#1A1A1A] dark:hover:bg-[#F0F0F0]"
            }`}
          >
            {state.confirmLabel || (isConfirm ? "Confirm" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
