import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLocalFormsApp } from '../src/forms-local-app.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = createLocalFormsApp({
  root,
  contactRecipientEmail: 'projectdevemail001@gmail.com',
  contactAllowedOrigins: ['http://127.0.0.1:8080'],
  contactMailer: vi.fn(async () => ({ provider: 'test' })),
  careersRecipientEmail: 'projectdevemail001@gmail.com',
  careersAllowedOrigins: ['http://127.0.0.1:8080'],
  careersMailer: vi.fn(async () => ({ provider: 'test' })),
  careersScanner: vi.fn(async () => ({ clean: true })),
  formTokenSecret: 'a'.repeat(32),
});

describe('local forms static composition', () => {
  it('serves the Contact page after the real API routes', async () => {
    expect((await request(app).get('/contact.html')).status).toBe(200);
    expect((await request(app).get('/api/contact/token')).status).toBe(200);
    expect((await request(app).get('/api/careers/token')).status).toBe(200);
  });

  it.each(['/backend', '/cms', '/docs', '/scripts', '/tests', '/deployment'])('blocks private path %s', async (path) => {
    expect((await request(app).get(path)).status).toBe(404);
  });
});
