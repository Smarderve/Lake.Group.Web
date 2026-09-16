/**
 * Explicit local/test-only CMS identity. This is never a production account:
 * the middleware is only mounted when the application factory has already
 * confirmed a non-production environment and an explicit opt-in flag.
 */
const LOCAL_TEST_EMAIL = 'cms-v2-local-developer@local.test';
const LOCAL_TEST_USER = Object.freeze({
  id: 'LOCAL_TEST_BYPASS',
  email: LOCAL_TEST_EMAIL,
  role: 'SUPER_ADMIN',
  cmsAccessLevel: 'IT_ADMIN',
  active: true,
  mfaEnabled: false,
});

export function isCmsAuthBypass(req) {
  return req.cmsAuthBypass === true;
}

/**
 * Establishes one clearly-labelled local actor before the normal CMS guards.
 * The backing user is created only in the explicitly opted-in local/test
 * database, so revision/audit foreign keys remain valid during real testing.
 */
export function cmsAuthBypass({ enabled = false, db } = {}) {
  return async function cmsAuthBypassMiddleware(req, res, next) {
    if (!enabled) return next();

    try {
      const user = db?.user?.upsert
        ? await db.user.upsert({
          where: { email: LOCAL_TEST_EMAIL },
          update: {
            active: true,
            role: 'SUPER_ADMIN',
            cmsAccessLevel: 'IT_ADMIN',
            mfaEnabled: false,
          },
          create: {
            ...LOCAL_TEST_USER,
            // This is deliberately not a usable credential. Authentication is
            // bypassed at the middleware boundary, never through login.
            passwordHash: '!LOCAL_TEST_BYPASS_NOT_A_CREDENTIAL!',
          },
        })
        : LOCAL_TEST_USER;

      req.cmsAuthBypass = true;
      req.user = { ...LOCAL_TEST_USER, ...user, cmsAccessLevel: 'IT_ADMIN', role: 'SUPER_ADMIN' };
      res.setHeader('X-CMS-Auth-Bypass', 'local-testing');
      req.log?.warn?.({ actor: 'LOCAL_TEST_BYPASS', route: req.originalUrl }, 'CMS local authentication bypass used');
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
