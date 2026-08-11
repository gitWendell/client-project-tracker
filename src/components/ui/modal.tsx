'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A minimal accessible dialog: labelled by its heading, closes on Escape or a
 * backdrop click, locks background scrolling, and returns focus to whatever
 * opened it. Written by hand rather than pulled from a component library —
 * one dialog does not justify the dependency.
 *
 * There is no `open` prop: mounting the dialog *is* opening it. That keeps the
 * lifetime of the dialog's own state tied to the lifetime of the dialog, so
 * nothing has to be reset when it reopens.
 */
export function Modal({ title, description, onClose, children }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Move focus into the dialog so keyboard users are not left behind it.
    panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])',
    )?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        // mousedown on the backdrop only — not a drag that began inside the panel.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-2xl rounded-t-2xl border border-border-subtle bg-surface shadow-xl sm:rounded-2xl"
      >
        <header className="border-b border-border-subtle px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-1 text-sm text-muted">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
