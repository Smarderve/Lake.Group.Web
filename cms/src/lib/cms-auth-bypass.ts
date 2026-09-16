import type { User } from '../types/api';

declare const __CMS_AUTH_BYPASS__: boolean;

// Vite only defines this while serving an explicitly opted-in local build.
// The backend remains authoritative and independently refuses it in prod.
export const cmsAuthBypassEnabled = import.meta.env.DEV && __CMS_AUTH_BYPASS__ === true;

export const cmsAuthBypassUser: User = {
  id: 'LOCAL_TEST_BYPASS',
  email: 'cms-v2-local-developer@local.test',
  name: 'CMS V2 Local Developer',
  role: 'SUPER_ADMIN',
  active: true,
  mfaEnabled: false,
  createdAt: '',
  updatedAt: '',
};
