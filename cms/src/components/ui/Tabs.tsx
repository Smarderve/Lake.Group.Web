import { useId, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  /** Visually hide (but keep keyboard-reachable) a tab, e.g. when permission-aware. */
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel: string;
}

/**
 * Accessible tabs – roving tabindex + arrow keys (WCAG 2.4.3, ARIA APG
 * tabs pattern). Controlled: the parent owns the active value.
 */
export function Tabs({ items, value, onChange, className, ariaLabel }: TabsProps) {
  const tablistId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value && !item.disabled),
  );

  function focusTab(index: number) {
    const next = items[index];
    if (!next || next.disabled) return;
    onChange(next.value);
    tabRefs.current[index]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab((activeIndex + 1) % items.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab((activeIndex - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(items.length - 1);
        break;
    }
  }

  const activeItem = items.find((item) => item.value === value) ?? items[activeIndex];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-border"
      >
        {items.map((item, index) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`${tablistId}-${item.value}`}
              aria-selected={selected}
              aria-controls={`${tablistId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.value)}
              className={cn(
                '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                selected
                  ? 'border-brand-600 text-ink'
                  : 'border-transparent text-ink-muted hover:border-border-strong hover:text-ink',
                item.disabled && 'pointer-events-none opacity-40',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${tablistId}-panel-${activeItem.value}`}
        aria-labelledby={`${tablistId}-${activeItem.value}`}
        className="pt-4"
      >
        {activeItem.content}
      </div>
    </div>
  );
}
