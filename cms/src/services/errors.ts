/**
 * Centralized error taxonomy + user-safe messaging (Error-Handling task).
 *
 * One place that answers "what kind of failure is this, what do we tell the
 * user, and what do we log?" Every UI surface should go through these helpers
 * instead of inventing its own copy. Users never see raw messages, stack
 * traces, paths or internals — those go to the developer log, tagged with a
 * short reference the user can quote.
 */
import { isApiError } from './api';

export type ErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'network'
  | 'timeout'
  | 'service-unavailable'
  | 'server'
  | 'unexpected';

export interface ClassifiedError {
  kind: ErrorKind;
  /** HTTP status, or 0 when there was no HTTP response (network/timeout). */
  status: number;
  code: string;
  /** User-safe message – safe to render. */
  message: string;
  /** Server-side field errors (validation) when the backend supplied them. */
  details?: { path: string; message: string }[];
  /** Client-side request id (X-Request-Id) when one was issued. */
  requestId?: string;
}

/** Classify any thrown value into the shared taxonomy. Never throws. */
export function classifyError(err: unknown): ClassifiedError {
  if (isApiError(err)) {
    const base: Omit<ClassifiedError, 'kind'> = {
      status: err.status,
      code: err.code,
      message: err.message,
      details: err.details,
      requestId: err.requestId,
    };
    switch (err.status) {
      case 0:
        return { ...base, kind: err.code === 'TIMEOUT' ? 'timeout' : 'network' };
      case 400:
      case 422:
        return { ...base, kind: 'validation' };
      case 401:
        return { ...base, kind: 'unauthenticated' };
      case 403:
        return { ...base, kind: 'forbidden' };
      case 404:
        return { ...base, kind: 'not-found' };
      case 409:
        return { ...base, kind: 'conflict' };
      case 429:
        return { ...base, kind: 'rate-limit' };
      case 502:
      case 503:
      case 504:
        return { ...base, kind: 'service-unavailable' };
      default:
        return { ...base, kind: err.status >= 500 ? 'server' : 'unexpected' };
    }
  }
  return { status: 0, code: 'UNEXPECTED', kind: 'unexpected', message: 'Something went wrong' };
}

/**
 * User-safe message for a failure. Backend business messages (validation,
 * conflicts, auth) are specific and stay; infrastructure failures get calm,
 * consistent copy instead of whatever the transport happened to say.
 */
export function friendlyMessage(err: unknown): string {
  // Nothing failed (null/undefined) → empty string, so callers can apply
  // their own fallback instead of showing generic copy.
  if (err == null) return '';
  const classified = classifyError(err);
  switch (classified.kind) {
    case 'validation':
      return classified.message || 'Please check the highlighted fields and try again.';
    case 'conflict':
      return classified.message || 'This item was changed by someone else. Refresh the page and try again.';
    case 'unauthenticated':
      return classified.message || 'Your session has expired. Please sign in again to continue.';
    case 'forbidden':
      return "You don't have permission to do that.";
    case 'not-found':
      return classified.message || "We couldn't find that item. It may have been removed.";
    case 'rate-limit':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'network':
      return 'Unable to reach the server. Check your connection and try again.';
    case 'timeout':
      return 'The request timed out. Please try again.';
    case 'service-unavailable':
      return 'The CMS service is temporarily unavailable. Please try again shortly.';
    case 'server':
      return "We couldn't complete that request. Please try again.";
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Short, safe reference id shown to the user ("Error reference: ERR-7F3K92")
 * so a developer can find the matching log entry. No data is encoded in it.
 */
export function makeErrorReference(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  let n = 0;
  for (const b of bytes) n = n * 256 + b;
  return `ERR-${n.toString(36).toUpperCase().padStart(6, '0')}`;
}

export interface ErrorLogInput {
  reference: string;
  error: unknown;
  /** Where it happened, e.g. "ProtectedRoute" or "news editor save". */
  context?: string;
}

/**
 * Developer diagnostics – separated from what the user sees. Redacts nothing
 * extra because the inputs never carry secrets: ApiError holds status/code/
 * message only, and we never log request bodies, headers or auth material.
 */
export function logError({ reference, error, context }: ErrorLogInput): void {
  const classified = classifyError(error);
  const entry = {
    ref: reference,
    kind: classified.kind,
    status: classified.status,
    code: classified.code,
    context,
    requestId: classified.requestId,
    // Detail for the console; the UI never renders `error`.
    error,
  };
  // console.error keeps the entry in the dev/CI log; the window event is a
  // hook point for a future monitoring/telemetry wire-up without one existing.
  console.error('[CMS error]', entry);
  window.dispatchEvent(
    new CustomEvent('cms:error', { detail: { reference, kind: classified.kind, status: classified.status, context } }),
  );
}
