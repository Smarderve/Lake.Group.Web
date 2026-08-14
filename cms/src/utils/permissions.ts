import type { Role } from '../types/api';

/**
 * Role helpers mirroring the backend gates (backend/src/middleware/auth.js +
 * the governed router). The backend remains the security boundary – these
 * only drive what the UI offers a signed-in user.
 *
 *   EDITOR+        create / edit / submit / schedule      (requireRole EDITOR)
 *   REVIEWER+      approve / publish / reject / unpublish (requireRole REVIEWER)
 *   SUPER_ADMIN    rollback / archive / users / audit     (requireRole SUPER_ADMIN)
 */

/** Create, edit, submit for review, schedule. */
export function canEdit(role: Role | undefined | null): boolean {
  return role === 'EDITOR' || role === 'SUPER_ADMIN';
}

/** Review/approve/publish/reject workflow actions. */
export function canReview(role: Role | undefined | null): boolean {
  return role === 'REVIEWER' || role === 'SUPER_ADMIN';
}

/** Alias – approving and publishing share the same backend gate. */
export const canPublish = canReview;

/** Destructive registry actions (archive, rollback) + admin surfaces. */
export function isSuperAdmin(role: Role | undefined | null): boolean {
  return role === 'SUPER_ADMIN';
}

/** Anyone signed in can read governed collections. */
export function canView(role: Role | undefined | null): boolean {
  return role != null;
}
