import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TOAST_DURATION = 4000;

const TOAST_STYLES = {
  success: {
    border: "1px solid rgba(16, 185, 129, 0.35)",
    background: "var(--bg-card)",
    iconColor: "var(--color-profit)",
    icon: CheckCircle2,
    accentBar: "var(--color-profit)",
  },
  error: {
    border: "1px solid rgba(244, 63, 94, 0.35)",
    background: "var(--bg-card)",
    iconColor: "var(--color-loss)",
    icon: AlertCircle,
    accentBar: "var(--color-loss)",
  },
  info: {
    border: "1px solid rgba(59, 130, 246, 0.35)",
    background: "var(--bg-card)",
    iconColor: "var(--color-accent)",
    icon: Info,
    accentBar: "var(--color-accent)",
  },
};

function ToastItem({ toast, onClose }) {
  const config = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  const Icon = config.icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: config.background,
        border: config.border,
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        maxWidth: "380px",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        animation: "toastSlideIn 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: config.accentBar,
          borderRadius: "var(--radius-md) 0 0 var(--radius-md)",
        }}
      />

      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: "1px" }}>
        <Icon size={18} color={config.iconColor} />
      </div>

      {/* Message */}
      <p
        style={{
          flex: 1,
          fontSize: "0.875rem",
          fontWeight: "500",
          color: "var(--text-primary)",
          lineHeight: "1.45",
        }}
      >
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={() => onClose(toast.id)}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), TOAST_DURATION);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack — fixed bottom-right */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "all" }}>
            <ToastItem toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
};
