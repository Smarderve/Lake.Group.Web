import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { silentLogger } from './helpers.js';

function appWithAssistant(service, assistantAllowedOrigins) {
  return createApp({ logger: silentLogger, db: null, assistantService: service, assistantAllowedOrigins });
}

describe('self-hosted assistant API', () => {
  it('accepts a bounded same-origin message and issues an HttpOnly session cookie', async () => {
    const chat = vi.fn(async ({ sessionId, message, locale }) => ({
      sessionId: sessionId || '39eea75e-7f74-41ca-8447-211f1292d3a9',
      answer: `Verified: ${message} (${locale})`,
      sources: [{ title: 'Lake Group', url: 'https://www.lakeoilgroup.com/about.html' }],
      grounded: true,
      status: 'ok',
      metrics: { totalDurationNs: 2_000_000_000, promptTokens: 128, generatedTokens: 24, generationDurationNs: 1_000_000_000, privatePath: 'never expose' },
    }));
    const response = await request(appWithAssistant({ chat, health: async () => ({ status: 'ready' }) }))
      .post('/api/assistant/chat')
      .set('Host', '127.0.0.1:5000')
      .set('Origin', 'http://127.0.0.1:5000')
      .send({ message: 'What is Lake Group?', locale: 'en' })
      .expect(200);

    expect(chat).toHaveBeenCalledWith({ sessionId: null, message: 'What is Lake Group?', locale: 'en' });
    expect(response.body.answer).toContain('What is Lake Group?');
    expect(response.body.metrics).toEqual({ totalDurationNs: 2_000_000_000, promptTokens: 128, generatedTokens: 24, generationDurationNs: 1_000_000_000 });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0]).toContain('Path=/api/assistant');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('reuses only a well-formed session cookie and rejects cross-origin calls', async () => {
    const chat = vi.fn(async ({ sessionId }) => ({ sessionId, answer: 'ok', sources: [], grounded: false }));
    const app = appWithAssistant({ chat, health: async () => ({ status: 'ready' }) });
    await request(app).post('/api/assistant/chat').set('Cookie', 'lake_assistant.sid=39eea75e-7f74-41ca-8447-211f1292d3a9').send({ message: 'Hi' }).expect(200);
    expect(chat.mock.calls[0][0].sessionId).toBe('39eea75e-7f74-41ca-8447-211f1292d3a9');
    await request(app).post('/api/assistant/chat').set('Origin', 'https://attacker.invalid').send({ message: 'Hi' }).expect(403);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('allows only configured public origins behind a reverse proxy', async () => {
    const chat = vi.fn(async () => ({ sessionId: '39eea75e-7f74-41ca-8447-211f1292d3a9', answer: 'Lake Group overview', sources: [], grounded: false }));
    const app = appWithAssistant({ chat, health: async () => ({ status: 'ready' }) }, ['https://www.lakeoilgroup.com']);
    await request(app).post('/api/assistant/chat')
      .set('Host', '127.0.0.1:4001')
      .set('Origin', 'https://www.lakeoilgroup.com')
      .send({ message: 'Hi' })
      .expect(200);
    await request(app).post('/api/assistant/chat')
      .set('Host', '127.0.0.1:4001')
      .set('Origin', 'https://attacker.invalid')
      .send({ message: 'Hi' })
      .expect(403);
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('rejects empty, malformed, oversized, and non-JSON messages without calling the model', async () => {
    const chat = vi.fn();
    const app = appWithAssistant({ chat, health: async () => ({ status: 'ready' }) });
    await request(app).post('/api/assistant/chat').send({ message: '   ' }).expect(400);
    await request(app).post('/api/assistant/chat').send({ message: 'hello', extra: 'unexpected' }).expect(400);
    await request(app).post('/api/assistant/chat').set('Content-Type', 'text/plain').send('hello').expect(415);
    await request(app).post('/api/assistant/chat').send({ message: 'x'.repeat(9000) }).expect(413);
    expect(chat).not.toHaveBeenCalled();
  });

  it('returns only a generic readiness signal and a safe unavailable error', async () => {
    const ready = appWithAssistant({ chat: vi.fn(), health: async () => ({ status: 'ready', model: 'private detail' }) });
    const health = await request(ready).get('/api/assistant/health').expect(200);
    expect(health.body).toEqual({ status: 'ready' });
    const unavailable = appWithAssistant({ chat: vi.fn(async () => { throw new Error('private host path'); }), health: async () => { throw new Error('private model path'); } });
    const response = await request(unavailable).post('/api/assistant/chat').send({ message: 'Hi' }).expect(503);
    expect(response.body.error.message).not.toContain('private');
    await request(unavailable).get('/api/assistant/health').expect(503, { error: { code: 'ASSISTANT_UNAVAILABLE', message: 'Lake Assistant is temporarily unavailable. Please try again shortly.' } });
  });
});
