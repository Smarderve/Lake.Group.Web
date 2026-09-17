/**
 * Public projection of a User — the only shape the API ever returns.
 * Never includes mfaSecret or passwordHash.
 */
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    // Legacy editorial role remains for migration compatibility. CMS V2
    // authorization is exclusively determined by this additive capability.
    cmsAccessLevel: user.cmsAccessLevel ?? 'NONE',
    mfaEnabled: user.mfaEnabled,
    active: user.active,
    createdAt: user.createdAt,
  };
}
