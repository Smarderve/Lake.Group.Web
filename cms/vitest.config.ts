import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    clearMocks: true,
    // A loaded dev machine can push individual tests past the 5s default;
    // these are integration-style DOM tests, not latency probes.
    testTimeout: 15_000,
  },
});
