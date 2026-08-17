import { describe, expect, it } from 'vitest';
import { canEdit, canPublish, canReview, canView, isSuperAdmin } from '../src/utils/permissions';
import type { Role } from '../src/types/api';

const roles: Role[] = ['SUPER_ADMIN', 'EDITOR', 'REVIEWER', 'CONTACT_MANAGER', 'VIEWER'];

describe('permission helpers mirror backend role gates', () => {
  it('limits editing to editors and super administrators', () => {
    expect(roles.filter(canEdit)).toEqual(['SUPER_ADMIN', 'EDITOR']);
  });

  it('limits reviewing and publishing to reviewers and super administrators', () => {
    expect(roles.filter(canReview)).toEqual(['SUPER_ADMIN', 'REVIEWER']);
    expect(roles.filter(canPublish)).toEqual(['SUPER_ADMIN', 'REVIEWER']);
  });

  it('limits destructive administration to super administrators', () => {
    expect(roles.filter(isSuperAdmin)).toEqual(['SUPER_ADMIN']);
  });

  it('allows every authenticated backend role to read content', () => {
    expect(roles.every(canView)).toBe(true);
    expect(canView(null)).toBe(false);
    expect(canView(undefined)).toBe(false);
  });
});
