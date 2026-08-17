/**
 * Media API service (spec §21). Mirrors the backend exactly – nothing
 * invented:
 *
 *   GET   /admin/media                 – governed list (all statuses)
 *   GET   /admin/media/:id             – detail + versions
 *   POST  /admin/media                 – create (EDITOR+, requires reason)
 *   PATCH /admin/media/:id             – update (EDITOR+, requires reason)
 *   POST  /admin/media/:id/submit      – DRAFT → IN_REVIEW    (EDITOR+)
 *   POST  /admin/media/:id/approve     – IN_REVIEW → APPROVED (REVIEWER+)
 *   POST  /admin/media/:id/publish     – APPROVED → PUBLISHED (REVIEWER+)
 *   POST  /admin/media/:id/reject      – IN_REVIEW → DRAFT    (REVIEWER+, reason)
 *   POST  /admin/media/:id/archive     – → ARCHIVED           (SUPER_ADMIN)
 *   GET   /admin/media/:id/usages      – usage introspection (auth)
 *   GET   /admin/media-folders         – folder list (auth)
 *   POST  /admin/media-folders         – create folder (EDITOR+)
 *   PATCH /admin/media-folders/:id     – rename folder (EDITOR+)
 *
 *   POST  /admin/media/uploads          – validated binary upload (EDITOR+)
 *   DELETE /admin/media/:id/upload      – delete unused draft blob (SUPER_ADMIN)
 */

import { api, apiUrl, ApiError } from '../../services/api';
import type { VersionRow, WorkflowStatus } from '../../types/api';

/**
 * Origin of the public Lake Group website. Media rows store website-relative
 * paths (`assets/images/...`) — the CMS resolves them against this origin so
 * previews work regardless of where the CMS itself is deployed. Override with
 * VITE_PUBLIC_SITE_URL when the site lives elsewhere (see cms/.env.example).
 */
/** Read at call time so tests can stub VITE_PUBLIC_SITE_URL (Vitest syncs
 * import.meta.env stubs; in the browser the value is baked at build time). */
function getPublicSiteUrl(): string {
  return (import.meta.env.VITE_PUBLIC_SITE_URL ?? 'https://lake-group.vercel.app').replace(/\/+$/, '');
}

/**
 * Resolve a media URL stored in the database to a URL the browser can load:
 *
 * - absolute URLs (https:, data:, blob:) pass through untouched;
 * - `/media/files/...` (backend uploads) resolve against the API origin
 *   (same-origin in dev via the Vite proxy; `VITE_API_BASE_URL` when set);
 * - website-relative `assets/...` paths (the 67 seeded rows) resolve against
 *   the public website origin.
 */
export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url) || url.startsWith('//')) return url;
  if (url.startsWith('/media/files/')) {
    // Same-origin in dev (Vite proxies /media); VITE_API_BASE_URL when set.
    const base = apiUrl('');
    return base === '/' ? url : `${base}${url}`;
  }
  if (url.startsWith('assets/') || url.startsWith('/assets/')) {
    return `${getPublicSiteUrl()}/${url.replace(/^\/+/, '')}`;
  }
  return url;
}

/** A media row as returned by GET /admin/media (MAP_ENTITIES.media fields). */
export interface MediaRow {
  id: string;
  url: string;
  altText: string | null;
  caption: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  copyright: string | null;
  license: string | null;
  tags: string[] | null;
  /** { thumb?, medium?, original?, ... } – URL per variant. */
  variants: Record<string, string> | null;
  folderId: string | null;
  uploadedBy: string | null;
  storageProvider: string | null;
  storageKey: string | null;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MediaListResponse {
  media: MediaRow[];
}

export interface MediaDetailResponse {
  media: MediaRow;
  versions: VersionRow[];
}

/** Create/update body – the backend mediaCreateSchema/mediaUpdateSchema. */
export interface MediaInput {
  url: string;
  altText?: string;
  caption?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  copyright?: string;
  license?: string;
  tags?: string[];
  variants?: Record<string, string>;
  folderId?: string;
  reason: string;
}

export interface MediaUploadInput {
  file: File;
  altText?: string;
  caption?: string;
  copyright?: string;
  license?: string;
  tags?: string[];
  folderId?: string;
  reason: string;
}

function upload(input: MediaUploadInput, onProgress?: (percent: number) => void): Promise<MediaDetailResponse> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append('file', input.file);
    body.append('reason', input.reason);
    if (input.altText) body.append('altText', input.altText);
    if (input.caption) body.append('caption', input.caption);
    if (input.copyright) body.append('copyright', input.copyright);
    if (input.license) body.append('license', input.license);
    if (input.tags?.length) body.append('tags', input.tags.join(','));
    if (input.folderId) body.append('folderId', input.folderId);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl('/admin/media/uploads'));
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the media service'));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        // handled by the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as MediaDetailResponse);
        return;
      }
      const error = (payload as { error?: { code?: string; message?: string } } | null)?.error;
      reject(new ApiError(xhr.status, error?.code ?? 'UPLOAD_FAILED', error?.message ?? 'Media upload failed'));
    };
    xhr.send(body);
  });
}

/** Folder row (GET /admin/media-folders). */
export interface MediaFolderRow {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaFolderInput {
  name: string;
  slug?: string; // create only (update schema omits slug)
  parentId?: string;
  description?: string;
  sortOrder?: number;
}

/** Usage row (GET /admin/media/:id/usages). */
export interface MediaUsageRow {
  id: string;
  mediaId: string;
  entityType: string;
  entityId: string;
  field: string;
  createdAt: string;
}

/** Pick the best URL to render for a media item – variant thumb, then url. */
export function mediaPreviewUrl(row: MediaRow): string {
  return resolveMediaUrl(row.variants?.thumb ?? row.url);
}

/** True when the media item looks like an image (by MIME type or extension). */
export function isImageMedia(row: MediaRow): boolean {
  const mime = row.mimeType ?? '';
  if (mime.startsWith('image/')) return true;
  // Website URLs carry cache-busting query strings (e.g. .jpg?v=80) — match
  // the path, not the full URL.
  const path = row.url.split(/[?#]/, 1)[0];
  return /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i.test(path);
}

export const mediaApi = {
  list: () => api.get<MediaListResponse>('/admin/media'),
  get: (id: string) => api.get<MediaDetailResponse>(`/admin/media/${id}`),
  create: (input: MediaInput) => api.post<MediaDetailResponse>('/admin/media', input),
  upload,
  update: (id: string, input: MediaInput) => api.patch<MediaDetailResponse>(`/admin/media/${id}`, input),
  submit: (id: string) => api.post<MediaDetailResponse>(`/admin/media/${id}/submit`, {}),
  approve: (id: string) => api.post<MediaDetailResponse>(`/admin/media/${id}/approve`, {}),
  publish: (id: string) => api.post<MediaDetailResponse>(`/admin/media/${id}/publish`, {}),
  reject: (id: string, reason: string) =>
    api.post<MediaDetailResponse>(`/admin/media/${id}/reject`, { reason }),
  archive: (id: string) => api.post<MediaDetailResponse>(`/admin/media/${id}/archive`, {}),
  usages: (id: string) => api.get<{ usages: MediaUsageRow[] }>(`/admin/media/${id}/usages`),

  folders: () => api.get<{ mediaFolders: MediaFolderRow[] }>('/admin/media-folders'),
  createFolder: (input: MediaFolderInput) =>
    api.post<{ mediaFolder: MediaFolderRow }>('/admin/media-folders', input),
  updateFolder: (id: string, input: MediaFolderInput) =>
    api.patch<{ mediaFolder: MediaFolderRow }>(`/admin/media-folders/${id}`, input),
};
