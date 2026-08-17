import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 15_000,
    env: {
      NODE_ENV: 'test',
      // Fast hashing in tests — production default stays 12 (see .env.example).
      BCRYPT_COST: '4',
      LOG_LEVEL: 'silent',
      SESSION_SECRET: 'test-only-secret',
      TRUST_PROXY: '0',
    },
  },
});
