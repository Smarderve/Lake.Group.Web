import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeApp, makeUser } from './helpers.js';

// SECURITY_ROADMAP Phase 11 — File Upload Security.
//
// Multipart parsing is deliberately scoped to /admin/media/uploads. These
// tests ensure unrelated routes remain closed to multipart payloads and that
// the approved parser is the only upload dependency.

const PKG_PATH = fileURLToPath(new URL('../package.json', import.meta.url));

describe('SECURITY_ROADMAP Phase 11 — scoped file-upload surface', () => {
  it('multipart/form-data to a governed create is rejected (no parser, no file handling)', async () => {
    const users = [await makeUser({ email: 'editor@lakegroup.test', password: 'pw-edit-1', role: 'EDITOR' })];
    const ctx = makeApp({ users });
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'editor@lakegroup.test', password: 'pw-edit-1' });

    // A real browser-style multipart POST carrying a file field.
    const res = await agent
      .post('/admin/news')
      .set('Content-Type', 'multipart/form-data; boundary=----x')
      .send('------x\r\nContent-Disposition: form-data; name="title"\r\n\r\nHacked\r\n'
        + '------x\r\nContent-Disposition: form-data; name="file"; filename="shell.php"\r\n'
        + 'Content-Type: application/x-php\r\n\r\n<?php system($_GET[c]); ?>\r\n------x--\r\n');
    // The parser is route-scoped, so the governed JSON route sees no body.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const rows = await ctx.db.news.findMany({});
    expect(rows.length).toBe(0);
  });

  it('multipart/form-data to public write endpoints is rejected too', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app)
      .post('/api/public/analytics/events')
      .set('Content-Type', 'multipart/form-data; boundary=----x')
      .send('------x\r\nContent-Disposition: form-data; name="type"\r\n\r\nPAGE_VIEW\r\n------x--\r\n');
    expect(res.status).toBe(400);
  });

  it('oversized payloads (a future upload vector) are capped at 100kb with 413', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app)
      .post('/api/public/analytics/events')
      .send({ type: 'PAGE_VIEW', page: '/x', detail: { blob: 'x'.repeat(200_000) } });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('the dependency list contains only the approved multipart library', async () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const uploadLibs = Object.keys(deps).filter((d) =>
      /multer|busboy|formidable|multiparty|gridfs|express-fileupload/i.test(d));
    expect(uploadLibs).toEqual(['multer']);
  });

  it('the backend serves no static files (no user-accessible file paths)', async () => {
    const ctx = makeApp({});
    const res = await request(ctx.app).get('/assets/evil.php');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
