'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  text: string;
  variant: 'success' | 'error';
}

/** Small toast queue: `show()` to add, auto-dismissed after a few seconds. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((text: string, variant: ToastMessage['variant'] = 'success') => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), text, variant }]);
  }, []);

  return { toasts, show, dismiss };
}

const STYLES: Record<ToastMessage['variant'], string> = {
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200',
  error: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-500/15 dark:text-red-200',
};

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}) {
  return (
    // `aria-live` so the outcome of an action is announced, not just shown.
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${STYLES[toast.variant]}`}
    >
      <span className="flex-1">{toast.text}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-70 hover:opacity-100"
      >
        Dismiss
      </button>
    </div>
  );
}
