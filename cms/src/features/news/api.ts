/**
 * News API service (spec §13). Mirrors the governed router
 * (backend/src/routes/governed.js) for route `news` – nothing invented:
 *
 *   GET   /admin/news                     – full list (all statuses)
 *   GET   /admin/news/:id                 – detail + versions
 *   POST  /admin/news                     – create (EDITOR+, requires reason)
 *   PATCH /admin/news/:id                 – update (EDITOR+, requires reason)
 *   POST  /admin/news/:id/submit          – DRAFT → IN_REVIEW   (EDITOR+)
 *   POST  /admin/news/:id/approve         – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST  /admin/news/:id/publish         – APPROVED → PUBLISHED (REVIEWER+)
 *   POST  /admin/news/:id/reject          – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST  /admin/news/:id/schedule        – plan future publish  (EDITOR+)
 *   POST  /admin/news/:id/archive         – → ARCHIVED           (SUPER_ADMIN)
 */

import { api } from '../../services/api';
import type { User, VersionRow, WorkflowStatus } from '../../types/api';

/** A governed option row – every entity exposes at least id + a label field. */
export interface OptionRow {
  id: string;
  [key: string]: unknown;
}

export interface OptionListResponse {
  [route: string]: OptionRow[];
}

/** Category row (GET /admin/categories). */
export interface CategoryRow extends OptionRow {
  name: string;
}

/** Project row (GET /admin/projects) – label field is `title`. */
export interface ProjectRow extends OptionRow {
  title: string;
}

/** A news row as returned by GET /admin/news (CMS_ENTITIES.news fields). */
export interface NewsRow {
  id: string;
  title: string;
  slug: string;
  body: string;
  authorId: string | null;
  categoryId: string | null;
  relatedCompanyId: string | null;
  relatedProjectId: string | null;
  publicationDate: string | null;
  heroMediaId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewsListResponse {
  news: NewsRow[];
}

export interface NewsDetailResponse {
  news: NewsRow;
  versions: VersionRow[];
}

/** Create/update body – the backend schema (newsCreateSchema/newsUpdateSchema). */
export interface NewsInput {
  title: string;
  slug?: string; // create only; the update schema omits slug
  body: string;
  authorId?: string;
  categoryId?: string;
  relatedCompanyId?: string;
  relatedProjectId?: string;
  publicationDate?: string | null;
  heroMediaId?: string | null;
  metaTitle?: string;
  metaDescription?: string;
  reason: string;
}

export const newsApi = {
  list: () => api.get<NewsListResponse>('/admin/news'),
  get: (id: string) => api.get<NewsDetailResponse>(`/admin/news/${id}`),
  create: (input: NewsInput) => api.post<NewsDetailResponse>('/admin/news', input),
  update: (id: string, input: NewsInput) => api.patch<NewsDetailResponse>(`/admin/news/${id}`, input),
  submit: (id: string) => api.post<NewsDetailResponse>(`/admin/news/${id}/submit`, {}),
  approve: (id: string) => api.post<NewsDetailResponse>(`/admin/news/${id}/approve`, {}),
  publish: (id: string) => api.post<NewsDetailResponse>(`/admin/news/${id}/publish`, {}),
  reject: (id: string, reason: string) =>
    api.post<NewsDetailResponse>(`/admin/news/${id}/reject`, { reason }),
  schedule: (id: string, publishAt: string) =>
    api.post<NewsDetailResponse>(`/admin/news/${id}/schedule`, { publishAt }),
  archive: (id: string) => api.post<NewsDetailResponse>(`/admin/news/${id}/archive`, {}),

  // Editor option lists – same governed/registry endpoints the site uses.
  categories: () => api.get<OptionListResponse>('/admin/categories'),
  companies: () => api.get<OptionListResponse>('/admin/companies'),
  projects: () => api.get<OptionListResponse>('/admin/projects'),
  /** SUPER_ADMIN only (backend gate) – the author picker is role-gated. */
  users: () => api.get<{ users: User[] }>('/admin/users'),
};
