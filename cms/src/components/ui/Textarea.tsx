import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink',
        'placeholder:text-ink-faint',
        'shadow-card transition-[border-color,box-shadow] duration-150',
        'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
        invalid
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
          : 'border-border-strong',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-faint',
        className,
      )}
      {...props}
    />
  );
});
