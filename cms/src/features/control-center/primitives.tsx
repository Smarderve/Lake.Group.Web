import { useEffect, useRef, type ReactNode } from "react";
import { IconX, IconAlertCircle, IconSearch } from "@tabler/icons-react";
import { isApiError } from "../../services/api";

export function Heading({
  eyebrow,
  title,
  body,
  actions,
}: {
  eyebrow: string;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <header className="control-page-heading">
      <div>
        <p className="control-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {actions && <div className="workspace-actions">{actions}</div>}
    </header>
  );
}
export function PhaseNote({ children }: { children?: ReactNode }) {
  return (
    <p className="phase-note">
      <span>Frontend preview</span>
      {children ||
        "Edits stay in this workspace. Saving and publishing will be connected in Phase 2."}
    </p>
  );
}
export function SearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="composer-search">
      <IconSearch size={16} aria-hidden="true" />
      <input
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="control-empty">
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </div>
  );
}
export function QueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error?: unknown;
  retry?: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="control-loading" role="status">
        <span className="workspace-skeleton" />
        Loading workspace…
      </div>
    );
  if (error)
    return (
      <div className="control-error" role="alert">
        <IconAlertCircle size={20} />
        <div>
          <strong>
            {isApiError(error) && error.status === 403
              ? "Access restricted"
              : "This workspace could not be loaded"}
          </strong>
          <p>
            {isApiError(error) && error.status === 403
              ? "Ask your Lake Group IT administrator for access to this workspace."
              : "Check the connection and try again. Your saved content has not changed."}
          </p>
        </div>
        {retry && !(isApiError(error) && error.status === 403) && (
          <button className="control-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return <>{children}</>;
}
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select,textarea,[tabindex="0"]',
        ) ?? [],
      );
    (
      root?.querySelector<HTMLElement>('input:not([type="file"]),textarea') ??
      focusables()[0] ??
      root
    )?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = focusables(),
          first = items[0],
          last = items.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    root?.addEventListener("keydown", handle);
    return () => {
      root?.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return (
    <div className="control-review-backdrop" onMouseDown={close}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="workspace-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="control-button"
            aria-label={`Close ${title}`}
            onClick={close}
          >
            <IconX size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
