import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from '@iconify/react';
import alertCircleOutline from '@iconify-icons/mdi/alert-circle-outline';
import alertOutline from '@iconify-icons/mdi/alert-outline';
import checkCircleOutline from '@iconify-icons/mdi/check-circle-outline';
import close from '@iconify-icons/mdi/close';
import informationOutline from '@iconify-icons/mdi/information-outline';
import { cn } from '../../utils/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Default 4000. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastInput, 'title'>> {
  id: number;
  variant: ToastVariant;
  description?: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons: Record<ToastVariant, ReactNode> = {
  success: <Icon icon={checkCircleOutline} className="h-4 w-4 text-brand-600" aria-hidden="true" />,
  error: <Icon icon={alertCircleOutline} className="h-4 w-4 text-red-600" aria-hidden="true" />,
  info: <Icon icon={informationOutline} className="h-4 w-4 text-lake-600" aria-hidden="true" />,
  warning: <Icon icon={alertOutline} className="h-4 w-4 text-amber-600" aria-hidden="true" />,
};

/** Error toasts announce assertively so screen readers interrupt (WCAG 4.1.3). */
const assertive: Record<ToastVariant, boolean> = {
  success: false,
  error: true,
  info: false,
  warning: true,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        variant: input.variant ?? 'info',
        title: input.title,
        description: input.description,
      };
      setItems((prev) => [...prev.slice(-4), item]);
      const duration = input.duration ?? 4000;
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Assertive + polite stacks kept separate so live regions announce correctly. */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {items
          .filter((item) => !assertive[item.variant])
          .map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
      </div>
      <div aria-live="assertive" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {items
          .filter((item) => assertive[item.variant])
          .map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      className="cms-animate-toast pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-surface p-3 shadow-pop"
    >
      <span className="mt-0.5 shrink-0">{toastIcons[item.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium text-ink')}>{item.title}</p>
        {item.description && <p className="mt-0.5 text-[13px] text-ink-muted">{item.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Icon icon={close} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
