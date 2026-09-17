import { api } from '../../services/api';

export type CmsField = string | boolean | CmsField[] | { [key: string]: CmsField | undefined };
export type CmsDocumentData = Record<string, CmsField | undefined>;
export type LakeAviationData = CmsDocumentData & { hero: { heading: string; description: string; image: string; alt?: string }; introduction: { heading: string; body: string }; cta: { label: string; href: string }; seo: { title: string; description: string } };
export type CmsRevision = { id: string; authorId?: string | null; createdAt: string; data?: any };
export type CmsRelease = { id: string; revisionId: string; integrity: string; publishedAt: string };
export const cmsV2Api = {
  document: () => api.get<{ document: { currentDraftRevision?: CmsRevision | null; currentPublishedRevision?: CmsRevision | null } }>('/admin/v2/content/lake-aviation'),
  saveDraft: (data: LakeAviationData, baseRevisionId?: string | null) => api.put<{ revision: CmsRevision }>('/admin/v2/content/lake-aviation/draft', { data, baseRevisionId }),
  versions: () => api.get<{ revisions: CmsRevision[] }>('/admin/v2/content/lake-aviation/versions'),
  restoreRevision: (revisionId: string) => api.post<{ revision: CmsRevision }>(`/admin/v2/content/lake-aviation/revisions/${revisionId}/restore`),
  publish: (revisionId: string) => api.post<{ release: CmsRelease }>('/admin/v2/releases', { key: 'lake-aviation', revisionId }),
  documentByKey: (key: string) => api.get<{ document: { currentDraftRevision?: CmsRevision | null; currentPublishedRevision?: CmsRevision | null } }>(`/admin/v2/content/${key}`),
  saveDraftByKey: (key: string, data: CmsDocumentData, baseRevisionId?: string | null) => api.put<{ revision: CmsRevision }>(`/admin/v2/content/${key}/draft`, { data, baseRevisionId }),
  versionsByKey: (key: string) => api.get<{ revisions: CmsRevision[] }>(`/admin/v2/content/${key}/versions`),
  restoreRevisionByKey: (key: string, revisionId: string) => api.post<{ revision: CmsRevision }>(`/admin/v2/content/${key}/revisions/${revisionId}/restore`),
  publishByKey: (key: string, revisionId: string) => api.post<{ release: CmsRelease }>('/admin/v2/releases', { key, revisionId }),
  releases: () => api.get<{ releases: CmsRelease[] }>('/admin/v2/releases'),
};
