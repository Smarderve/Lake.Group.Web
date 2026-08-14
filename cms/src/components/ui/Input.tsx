import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /**
   * Node rendered inside the field's right edge (e.g. a show/hide password
   * toggle). The input gets right padding so text never runs under it.
   */
  rightAdornment?: ReactNode;
  /**
   * Node rendered inside the field's left edge (e.g. a search icon). The
   * input gets left padding so text never runs under it.
   */
  leftAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, rightAdornment, leftAdornment, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      {leftAdornment && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
          {leftAdornment}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-9 w-full rounded-lg border bg-surface px-3 text-sm text-ink',
          leftAdornment && 'pl-9',
          rightAdornment && 'pr-10',
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
      {rightAdornment && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-2.5">{rightAdornment}</span>
      )}
    </div>
  );
});
