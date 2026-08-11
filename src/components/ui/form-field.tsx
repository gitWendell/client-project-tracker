import type { ReactNode } from 'react';

/** Shared input styling, so every control in the form looks identical. */
export const controlClassName =
  'w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/70 disabled:opacity-60';

export const invalidControlClassName = 'border-red-500 dark:border-red-500';

interface FormFieldProps {
  label: string;
  /** The id of the control this label points at. */
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

/**
 * Label + control + error message, wired together by id so screen readers
 * announce the error with the field rather than as loose text.
 */
export function FormField({ label, htmlFor, error, required, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
