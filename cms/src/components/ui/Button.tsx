import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Spinner } from './Spinner';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-card',
        secondary: 'bg-surface text-ink border border-border-strong hover:bg-surface-muted',
        outline: 'bg-transparent text-ink border border-border-strong hover:bg-surface-muted',
        ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-card',
        // Outline destructive – destructive framing without the solid fill
        // (archive/remove actions). Consolidates the former per-screen
        // `border-red-200 text-red-700 hover:bg-red-50` one-offs.
        destructiveOutline: 'border border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders a spinner and disables the button. */
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, leftIcon, rightIcon, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true">
          <Spinner size="sm" className="text-current" />
        </span>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
