import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-lime" aria-hidden="true" />,
  error: <XCircle className="h-5 w-5 text-[#ff6b7d]" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-sky-300" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const notify = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 5000 : 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[80] mx-auto flex w-[min(92vw,380px)] flex-col gap-2 sm:left-auto sm:right-4 sm:mx-0"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift ring-1 ring-white/10"
          >
            <span className="mt-0.5">{ICONS[toast.kind]}</span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              className="-mr-1 rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
