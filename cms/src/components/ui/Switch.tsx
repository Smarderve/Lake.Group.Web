import { useId } from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Pairs with a visible <label htmlFor>. */
  id?: string;
  /** Accessible name (visible label, or aria-label when icon-only). */
  'aria-label'?: string;
  'aria-describedby'?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * On/off toggle (Settings + forms). Native button with role="switch" so
 * keyboard (Space toggles) and screen-reader semantics come free (WCAG
 * 4.1.2). Consumers pair it with a visible <label htmlFor> or aria-label.
 */
export function Switch({
  checked,
  onChange,
  id: idProp,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  disabled,
  className,
}: SwitchProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-border-strong',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-card transition-transform duration-150',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  );
}
