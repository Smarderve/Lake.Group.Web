import { cloneElement, isValidElement, useId, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface FieldProps {
  /** id of the control this field labels. */
  id?: string;
  label: string;
  /** Show a required asterisk (validation itself stays with the form). */
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Form field wrapper – label above the control, hint/error below, wired with
 * htmlFor + aria-describedby so screen readers announce validation state
 * (WCAG 3.3.1/3.3.2). Consumers pass the same `id` to Field and the control.
 */
export function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const describedBy = [hint ? `${controlId}-hint` : null, error ? `${controlId}-error` : null]
    .filter(Boolean)
    .join(' ');

  // Wire the control to its hint/error text (WCAG 3.3.1/3.3.2) by injecting
  // aria-describedby – the control must accept and forward extra props.
  const control = isValidElement<{ 'aria-describedby'?: string }>(children)
    ? cloneElement(children, { 'aria-describedby': describedBy || undefined })
    : children;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={controlId} className="text-[13px] font-medium text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>
      {control}
      {hint && !error && (
        <p id={`${controlId}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${controlId}-error`} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
