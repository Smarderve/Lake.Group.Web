import { api } from '../../services/api';

export type LakeAviationData = { hero: { heading: string; description: string; image: string; alt?: string }; introduction: { heading: string; body: string }; cta: { label: string; href: string }; seo: { title: string; description: string } };
export const cmsV2Api = {
  document: () => api.get<{ document: { currentDraftRevision?: { id: string; data: LakeAviationData } | null } }>('/admin/v2/content/lake-aviation'),
  saveDraft: (data: LakeAviationData, baseRevisionId?: string | null) => api.put<{ revision: { id: string } }>('/admin/v2/content/lake-aviation/draft', { data, baseRevisionId }),
  versions: () => api.get<{ revisions: Array<{ id: string; createdAt: string }> }>('/admin/v2/content/lake-aviation/versions'),
};
