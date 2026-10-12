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

  it('streams newline-delimited deltas with a session cookie and a final metrics event', async () => {
    const chat = vi.fn(async ({ sessionId, onToken }) => {
      await onToken('Lake ');
      await onToken('Group is here.');
      return { sessionId, answer: 'Lake Group is here.', sources: [], grounded: true, status: 'ok', metrics: { firstTokenMs: 85, generatedTokens: 5 } };
    });
    const response = await request(appWithAssistant({ chat, health: async () => ({ status: 'ready' }) }))
      .post('/api/assistant/chat')
      .set('Host', '127.0.0.1:5000')
      .set('Origin', 'http://127.0.0.1:5000')
      .set('Accept', 'application/x-ndjson, application/json')
      .send({ message: 'What is Lake Group?', locale: 'en' })
      .expect(200)
      .expect('Content-Type', /application\/x-ndjson/);
    const events = response.text.trim().split('\n').map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual(['delta', 'delta', 'done']);
    expect(events.at(-1)).toMatchObject({ answer: 'Lake Group is here.', metrics: { firstTokenMs: 85, generatedTokens: 5 } });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(chat.mock.calls[0][0].sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(chat.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
  });

  it('streams regeneration only for the existing same-origin session', async () => {
    const sessionId = '39eea75e-7f74-41ca-8447-211f1292d3a9';
    const regenerate = vi.fn(async ({ sessionId: receivedId, onToken }) => {
      await onToken('A new, grounded formulation.');
      return { sessionId: receivedId, answer: 'A new, grounded formulation.', sources: [], grounded: true, status: 'ok', locale: 'en' };
    });
    const app = appWithAssistant({ chat: vi.fn(), regenerate, health: async () => ({ status: 'ready' }) });
    const response = await request(app).post('/api/assistant/regenerate')
      .set('Host', '127.0.0.1:5000')
      .set('Origin', 'http://127.0.0.1:5000')
      .set('Cookie', `lake_assistant.sid=${sessionId}`)
      .set('Accept', 'application/x-ndjson')
      .send({})
      .expect(200)
      .expect('Content-Type', /application\/x-ndjson/);
    const events = response.text.trim().split('\n').map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual(['delta', 'done']);
    expect(events.at(-1).answer).toBe('A new, grounded formulation.');
    expect(regenerate.mock.calls[0][0].sessionId).toBe(sessionId);
    expect(regenerate.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    await request(app).post('/api/assistant/regenerate').send({}).expect(409);
    await request(app).post('/api/assistant/regenerate').set('Origin', 'https://attacker.invalid')
      .set('Cookie', `lake_assistant.sid=${sessionId}`).send({}).expect(403);
    expect(regenerate).toHaveBeenCalledTimes(1);
  });

  it('streams a same-origin message edit against the existing session and stable turn id', async () => {
    const sessionId = '39eea75e-7474-41ca-8447-211f1292d3a9';
    const turnId = '49eea75e-7474-41ca-8447-211f1292d3a9';
    const editTurn = vi.fn(async ({ sessionId: receivedSession, turnId: receivedTurn, message, onToken }) => {
      await onToken('Corrected answer.');
      return { sessionId: receivedSession, turnId: receivedTurn, answer: 'Corrected answer.', sources: [], grounded: true, status: 'ok', locale: 'en' };
    });
    const app = appWithAssistant({ chat: vi.fn(), editTurn, health: async () => ({ status: 'ready' }) });
    const response = await request(app).post('/api/assistant/edit')
      .set('Host', '127.0.0.1:5000')
      .set('Origin', 'http://127.0.0.1:5000')
      .set('Cookie', `lake_assistant.sid=${sessionId}`)
      .set('Accept', 'application/x-ndjson')
      .send({ turnId, message: 'Who owns Lake Group?' })
      .expect(200)
      .expect('Content-Type', /application\/x-ndjson/);
    const events = response.text.trim().split('\n').map((line) => JSON.parse(line));
    expect(events.map((event) => event.type)).toEqual(['delta', 'done']);
    expect(events.at(-1)).toMatchObject({ answer: 'Corrected answer.', turnId });
    expect(editTurn.mock.calls[0][0]).toMatchObject({ sessionId, turnId, message: 'Who owns Lake Group?' });
    expect(editTurn.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);
    await request(app).post('/api/assistant/edit').set('Cookie', `lake_assistant.sid=${sessionId}`)
      .send({ turnId: 'invalid', message: 'retry' }).expect(400);
    await request(app).post('/api/assistant/edit').set('Origin', 'https://attacker.invalid')
      .set('Cookie', `lake_assistant.sid=${sessionId}`).send({ turnId, message: 'No' }).expect(403);
    expect(editTurn).toHaveBeenCalledTimes(1);
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
