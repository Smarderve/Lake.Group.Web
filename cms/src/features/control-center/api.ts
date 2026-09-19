import { api } from '../../services/api';

export type ControlPage = {
  key: string;
  route: string;
  label: string;
  title: string;
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
  updatedAt: string | null;
};

export type ContentData = {
  hero: { heading: string; description: string; image: string; alt?: string };
  introduction: { heading: string; body: string };
  cta: { label: string; href: string };
  media: Array<{ src: string; alt: string; role: string }>;
  sections: Array<{ key: string; heading: string; body: string }>;
  seo: { title: string; description: string; canonical?: string; socialImage?: string; index: boolean };
};

export type Revision = { id: string; data: ContentData; createdAt: string; authorId?: string | null };
export type DocumentResponse = {
  document: {
    currentDraftRevision: Revision | null;
    currentPublishedRevision: Revision | null;
  };
};
export type Release = { id: string; publishedAt: string; integrity: string; manifest?: { documents?: Record<string, ContentData> } };
export type ReleaseReview = { valid: boolean; changedFields: number; changes: Array<{ field: string; before: string; after: string }>; truncated: boolean; issues: Array<{ severity: 'error' | 'warning'; field: string; message: string }> };

export const controlApi = {
  pages: () => api.get<{ pages: ControlPage[] }>('/admin/v2/pages'),
  pageSource: (key: string) => api.get<{ sourceUrl: string; html: string }>(`/admin/v2/page-source/${encodeURIComponent(key)}`),
  document: (key: string) => api.get<DocumentResponse>(`/admin/v2/content/${encodeURIComponent(key)}`),
  versions: (key: string) => api.get<{ revisions: Revision[] }>(`/admin/v2/content/${encodeURIComponent(key)}/versions`),
  review: (key: string, revisionId: string) => api.get<{ review: ReleaseReview }>(`/admin/v2/content/${encodeURIComponent(key)}/revisions/${encodeURIComponent(revisionId)}/review`),
  releases: () => api.get<{ releases: Release[] }>('/admin/v2/releases'),
  save: (key: string, data: ContentData, baseRevisionId: string | null) =>
    api.put<{ revision: Revision }>(`/admin/v2/content/${encodeURIComponent(key)}/draft`, { data, baseRevisionId }),
  restore: (key: string, revisionId: string) =>
    api.post<{ revision: Revision }>(`/admin/v2/content/${encodeURIComponent(key)}/revisions/${encodeURIComponent(revisionId)}/restore`),
  publish: (key: string, revisionId: string) =>
    api.post<{ release: Release }>('/admin/v2/releases', { key, revisionId }),
};

export const publicSiteBase = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://lake-group.vercel.app').replace(/\/$/, '');
