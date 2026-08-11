import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import { createLogger } from '../src/logger.js';

const silentLogger = createLogger('silent');
const dbUp = { $queryRaw: async () => {} };

describe('server bootstrap', () => {
  it('creates a working Express app without throwing', () => {
    const app = createApp({ logger: silentLogger, db: dbUp });
    expect(typeof app).toBe('function'); // Express app is a request handler
    expect(typeof app.listen).toBe('function');
  });

  it('starts on a real port and responds to /health', async () => {
    const app = createApp({ logger: silentLogger, db: dbUp });
    const server = app.listen(0); // ephemeral port
    await new Promise((resolve) => server.once('listening', resolve));

    try {
      const { port } = server.address();
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.db).toBe('up');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('returns a consistent JSON error shape for unknown routes', async () => {
    const app = createApp({ logger: silentLogger, db: dbUp });
    const res = await (await import('supertest')).default(app).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
