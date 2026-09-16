import { describe, expect, it } from 'vitest';
import { productionConfigProblems, resolveConfig } from '../src/config.js';

describe('CMS local authentication bypass configuration', () => {
  it('requires both a non-production environment and the explicit flag', () => {
    expect(resolveConfig({ NODE_ENV: 'development' }).cmsAuthBypass).toBe(false);
    expect(resolveConfig({ NODE_ENV: 'testing', CMS_AUTH_BYPASS: 'true' }).cmsAuthBypass).toBe(true);
    expect(resolveConfig({ NODE_ENV: 'production', CMS_AUTH_BYPASS: 'true' }).cmsAuthBypass).toBe(false);
  });

  it('rejects an attempted production bypass at configuration validation', () => {
    const cfg = resolveConfig({ NODE_ENV: 'production', CMS_AUTH_BYPASS: 'true' });
    expect(productionConfigProblems(cfg)).toContain('CMS_AUTH_BYPASS must not be set in production');
  });
});
