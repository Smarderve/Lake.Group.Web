/**
 * Shared API client (spec §34). All requests carry the session cookie and
 * normalize failures to the backend's `{ error: { code, message, details } }`
 * contract (docs/CMS-API-MAP.md §1).
 *
 * Pages never call fetch directly – they go through feature API services
 * (services/*.api.ts) which use this client.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Resolve an API-relative path for links that open outside the SPA. */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Normalized error with the backend contract's fields. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(
    status: number,
    code: string,
    message: string,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/** Human-readable message from any thrown value; safe to show in UI. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (isApiError(err)) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
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

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON body – serialized automatically. */
  body?: unknown;
  /** Query params – serialized, null/undefined skipped. */
  params?: QueryParams;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, params, headers, ...rest } = options;
  const url = `${BASE_URL}${path}${buildQuery(params)}`;
  const init: RequestInit = {
    ...rest,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Check your connection and try again.');
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
