/**
 * Shared API client (spec §34). All requests carry the session cookie and
 * normalize failures to the backend's `{ error: { code, message, details } }`
 * contract (docs/CMS-API-MAP.md §1).
 *
 * Pages never call fetch directly – they go through feature API services
 * (services/*.api.ts) which use this client.
 */

import { friendlyMessage } from './errors';

// API base. Production builds default to the deployed backend so a Vercel
// deployment works with ZERO environment variables; VITE_API_BASE_URL still
// overrides it when set (tests, custom domains, local preview against a
// remote API). Local dev keeps '' so the Vite proxy serves /auth /admin /api
// /health same-origin. This is a public URL, never a secret.
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? 'https://lake-group-web-backend.onrender.com' : '')
).replace(/\/+$/, '');

/** Resolve an API-relative path for links that open outside the SPA. */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Normalized error with the backend contract's fields. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];
  /** Client-side request id (sent as X-Request-Id) – correlates logs. */
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: { path: string; message: string }[],
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * Human-readable message from any thrown value; safe to show in UI.
 * Goes through the centralized taxonomy so status codes map to calm,
 * consistent copy instead of each caller inventing its own wording.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  // Every failure goes through the taxonomy: ApiError keeps useful backend
  // business messages, anything else (raw Error, unknown) gets calm generic
  // copy — a raw exception message must never reach the UI (security spec).
  return friendlyMessage(err) || fallback;
}

/** True when the error means "sign back in" (session missing/expired). */
export function isSessionError(err: unknown): boolean {
  return isApiError(err) && (err.status === 401 || err.code === 'UNAUTHENTICATED');
}

/**
 * Registered by AuthProvider (Phase 2). Called once when a request fails with
 * UNAUTHENTICATED so the app can redirect to /login. Login failures use
 * INVALID_CREDENTIALS, so they never trigger this – only a real session loss.
 */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v === undefined || v === null) continue;
      search.append(key, String(v));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Short random id for X-Request-Id – safe, unguessable-enough for correlation. */
function makeRequestId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return `req-${hex}`;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON body – serialized automatically. */
  body?: unknown;
  /** Query params – serialized, null/undefined skipped. */
  params?: QueryParams;
  /** Abort after this many ms (default 30_000). 0 disables the timeout. */
  timeoutMs?: number;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers, timeoutMs = 30_000, ...rest } = options;
  const url = `${BASE_URL}${path}${buildQuery(params)}`;

  // Request id correlates client logs with backend access logs; never sent
  // back to the UI, only used for diagnostics.
  const requestId = makeRequestId();
  const controller = new AbortController();
  const timeout = timeoutMs > 0 ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  const init: RequestInit = {
    ...rest,
    signal: controller.signal,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'X-Request-Id': requestId,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    // Aborted by our own timeout vs a genuine network failure.
    const timedOut = err instanceof DOMException && err.name === 'AbortError';
    throw new ApiError(
      0,
      timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      timedOut
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the server. Check your connection and try again.',
      undefined,
      requestId,
    );
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body – leave data null and fall through to the generic error.
  }

  if (!res.ok) {
    const shape = (data ?? {}) as { error?: { code?: string; message?: string; details?: { path: string; message: string }[] } };
    const err = shape.error;
    const apiError = new ApiError(
      res.status,
      err?.code ?? 'REQUEST_FAILED',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
      requestId,
    );
    // Session loss (expired / revoked / signed out elsewhere) – let the auth
    // layer react, but never for the login endpoints themselves.
    if (apiError.code === 'UNAUTHENTICATED' && !path.startsWith('/auth/')) {
      onSessionExpired?.();
    }
    throw apiError;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
