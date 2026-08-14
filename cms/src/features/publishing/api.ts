/**
 * Publishing API service (spec §25). There is no aggregate backend endpoint
 * for "everything published" or "everything draft", so the unified views fan
 * out over the per-route governed lists (GET /admin/:route – any authenticated
 * user, uncapped small tables) and filter by status client-side:
 *
 *   GET  /admin/:route                – every governed route + /admin/metrics
 *   POST /admin/:route/:id/unpublish  – PUBLISHED → DRAFT (REVIEWER+ recent)
 *   POST /admin/:route/:id/submit     – DRAFT → IN_REVIEW (EDITOR+ recent)
 */

import type { QueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { PUBLISHING_ENTITIES, type UnifiedRow } from './registry';

export interface PublishingListsResult {
  /** Rows keyed by response key (news, company, metric, ...). */
  lists: Record<string, UnifiedRow[]>;
  /** Entity labels whose list could not be fetched (partial failure). */
  failed: string[];
}

export const publishingApi = {
  /**
   * Fan out over every governed route. A single unreachable route is reported
   * in `failed` instead of failing the whole view – the rest still renders.
   *
   * List endpoints nest rows under the route slug (`{ [config.route]: rows }`
   * in governed.js / metrics.js), so the list key is entity.route – not the
   * Prisma model name used by the single-record mutation responses.
   */
  lists: async (): Promise<PublishingListsResult> => {
    const settled = await Promise.allSettled(
      PUBLISHING_ENTITIES.map(async (entity) => {
        const data = await api.get<Record<string, UnifiedRow[]>>(`/admin/${entity.route}`);
        return [entity.route, data[entity.route] ?? []] as const;
      }),
    );
    const lists: Record<string, UnifiedRow[]> = {};
    const failed: string[] = [];
    settled.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        lists[outcome.value[0]] = outcome.value[1];
      } else {
        failed.push(PUBLISHING_ENTITIES[index].label);
      }
    });
    return { lists, failed };
  },

  /** POST /admin/:route/:id/unpublish – PUBLISHED → DRAFT (REVIEWER+ recent). */
  unpublish: (route: string, id: string) => api.post(`/admin/${route}/${id}/unpublish`, {}),

  /** POST /admin/:route/:id/submit – DRAFT → IN_REVIEW (EDITOR+ recent). */
  submit: (route: string, id: string, reason?: string) =>
    api.post(`/admin/${route}/${id}/submit`, { reason }),
};

/**
 * Keys the publishing actions touch – invalidate them all so every dependent
 * surface (dashboard KPI counts, review queue, entity lists) stays fresh.
 */
export function invalidatePublishing(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['publishing'] }),
    queryClient.invalidateQueries({ queryKey: ['governed'] }),
    queryClient.invalidateQueries({ queryKey: ['review-queue'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-news'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-media'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-companies'] }),
  ]).then(() => undefined);
}
