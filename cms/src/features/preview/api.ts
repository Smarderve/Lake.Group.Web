import { api } from '../../services/api';
import type { WorkflowStatus } from '../../types/api';

export interface PreviewPayload {
  route: string;
  entity: string;
  status: WorkflowStatus;
  publiclyVisible: boolean;
  visibilityReason: string;
  publicPath: string;
  record: Record<string, unknown>;
}

export const previewApi = {
  get: (route: string, id: string) =>
    api.get<{ preview: PreviewPayload }>(
      `/admin/preview/${encodeURIComponent(route)}/${encodeURIComponent(id)}`,
    ),
};
