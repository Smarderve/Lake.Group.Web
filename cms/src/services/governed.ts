import { api } from './api';

/**
 * Shared governed-entity transitions – the governed router's :id/… actions
 * (backend/src/routes/governed.js). Every governed route exposes the same
 * six mutations; roles stay enforced server-side (EDITOR+ submit/edit,
 * REVIEWER+ approve/publish, SUPER_ADMIN archive).
 */
export function governedWorkflow<T>(route: string) {
  return {
    submit: (id: string) => api.post<{ entity: T }>(`/admin/${route}/${id}/submit`, {}),
    approve: (id: string) => api.post<{ entity: T }>(`/admin/${route}/${id}/approve`, {}),
    reject: (id: string, reason: string) =>
      api.post<{ entity: T }>(`/admin/${route}/${id}/reject`, { reason }),
    publish: (id: string) => api.post<{ entity: T }>(`/admin/${route}/${id}/publish`, {}),
    unpublish: (id: string) => api.post<{ entity: T }>(`/admin/${route}/${id}/unpublish`, {}),
    archive: (id: string) => api.post<{ entity: T }>(`/admin/${route}/${id}/archive`, {}),
  };
}

/** Run one authorized mutation per row – the backend has no bulk endpoint. */
export async function runPerRow<T extends { id: string }>(
  rows: T[],
  fn: (id: string) => Promise<unknown>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await fn(row.id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  return { ok, failed };
}

/** Optional field → undefined so backend refs stay clean ('' is invalid). */
export function optionalRef(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}
