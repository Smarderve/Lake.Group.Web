/**
 * Shared API contract types. Mirror docs/CMS-API-MAP.md – the backend is the
 * source of truth; nothing here is invented.
 */

export type Role = 'SUPER_ADMIN' | 'EDITOR' | 'REVIEWER' | 'CONTACT_MANAGER' | 'VIEWER';

export const ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'REVIEWER', 'CONTACT_MANAGER', 'VIEWER'];

/** Governed workflow state machine (backend-enforced). */
export type WorkflowStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export const WORKFLOW_STATUSES: WorkflowStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'];

/** Contact verification axis (orthogonal to the workflow). */
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED';

/** Career listing status (orthogonal to the workflow). */
export type ListingStatus = 'OPEN' | 'CLOSED';

/** Error body – every endpoint returns { error: { code, message, details? } }. */
export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

/** The `user` object the backend returns everywhere (publicUser). */
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Pagination meta returned by the capped admin lists. */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/** Audit log entry (GET /admin/audit-log). */
export interface AuditEntry {
  id: string;
  actorId: string | null;
  action: string;
  resource: string;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** A governed-entity version row (GET /admin/:route/:id → versions[]). */
export interface VersionRow {
  id: string;
  status: WorkflowStatus;
  changedBy: string | null;
  reason: string | null;
  snapshot: Record<string, unknown> | null;
  createdAt: string;
  [key: string]: unknown;
}

/** Review queue item. */
export interface ReviewQueueItem {
  entityType: string;
  route: string;
  id: string;
  label: string;
  submitterId: string | null;
  submitterEmail: string | null;
  submittedAt: string | null;
}

/** Scheduled publication. */
export interface ScheduleRow {
  id: string;
  entityType: string;
  entityId: string;
  publishAt: string;
  label?: string | null;
  entityStatus?: WorkflowStatus | null;
  createdBy: string | null;
}

/** Notification. */
export interface NotificationRow {
  id: string;
  type: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
}
