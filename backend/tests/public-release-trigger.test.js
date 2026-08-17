import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createFakeDb, makeApp, makeUser } from './helpers.js';
import {
  dispatchGithubRelease,
  processPublicationEvents,
  redactReleaseError,
} from '../src/lib/public-release.js';

describe('protected public release dispatch', () => {
  it('sends a minimal authenticated repository dispatch with a deterministic idempotency key', async () => {
    let request;
    const fetchImpl = async (url, options) => {
      request = { url, options };
      return { ok: true, status: 204, headers: new Headers({ 'x-github-request-id': 'req-123' }) };
    };
    const event = {
      id: 'publication-123',
      action: 'PUBLISHED',
      entityType: 'news',
      entityId: 'news-1',
      createdAt: new Date('2026-08-13T12:00:00Z'),
    };

    const result = await dispatchGithubRelease(event, {
      repository: 'lake-group/public-website',
      token: 'secret-token-never-log',
      apiBaseUrl: 'https://api.lakegroup.example',
      fetchImpl,
    });

    expect(request.url).toBe('https://api.github.com/repos/lake-group/public-website/dispatches');
    expect(request.options.headers.authorization).toBe('Bearer secret-token-never-log');
    expect(JSON.parse(request.options.body)).toEqual({
      event_type: 'cms-publication',
      client_payload: {
        idempotency_key: 'publication-publication-123',
        publication_event_id: 'publication-123',
        action: 'PUBLISHED',
        entity_type: 'news',
        entity_id: 'news-1',
        public_api_base_url: 'https://api.lakegroup.example',
      },
    });
    expect(result.requestId).toBe('req-123');
  });

  it('marks a successful event once and skips it on later polls', async () => {
    const db = createFakeDb();
    await db.publicationEvent.create({
      data: {
        entityType: 'news',
        entityId: 'news-1',
        action: 'PUBLISHED',
        metadata: { reason: 'Approved' },
      },
    });
    let calls = 0;
    const dispatch = async () => {
      calls += 1;
      return { requestId: 'req-ok' };
    };

    expect((await processPublicationEvents(db, { dispatch, now: new Date() })).triggered).toBe(1);
    expect((await processPublicationEvents(db, { dispatch, now: new Date() })).triggered).toBe(0);
    expect(calls).toBe(1);
    const event = (await db.publicationEvent.findMany())[0];
    expect(event.metadata.publicRelease).toMatchObject({
      status: 'TRIGGERED',
      attempts: 1,
      requestId: 'req-ok',
      idempotencyKey: `publication-${event.id}`,
    });
  });

  it('records a bounded retry with backoff and succeeds when due', async () => {
    const db = createFakeDb();
    await db.publicationEvent.create({
      data: { entityType: 'page', entityId: 'page-1', action: 'ROLLED_BACK', metadata: {} },
    });
    let calls = 0;
    const dispatch = async () => {
      calls += 1;
      if (calls === 1) throw new Error('GitHub release trigger returned HTTP 503');
      return { requestId: 'req-retry' };
    };
    const start = new Date('2026-08-13T12:00:00Z');

    const first = await processPublicationEvents(db, { dispatch, now: start, maxAttempts: 3 });
    expect(first.retryScheduled).toBe(1);
    const event = (await db.publicationEvent.findMany())[0];
    expect(event.metadata.publicRelease).toMatchObject({
      status: 'RETRY_SCHEDULED',
      attempts: 1,
      lastError: 'GitHub release trigger returned HTTP 503',
    });
    expect(await processPublicationEvents(db, { dispatch, now: start, maxAttempts: 3 })).toMatchObject({ triggered: 0 });

    const due = new Date(event.metadata.publicRelease.nextAttemptAt);
    const final = await processPublicationEvents(db, { dispatch, now: new Date(due.getTime() + 1), maxAttempts: 3 });
    expect(final.triggered).toBe(1);
    expect(calls).toBe(2);
  });

  it('redacts release credentials before errors can reach durable status or logs', async () => {
    const githubToken = `github_pat_${'s'.repeat(64)}`;
    const vercelToken = `vercel_${'v'.repeat(48)}`;
    expect(redactReleaseError(
      new Error(`Bearer ${githubToken} failed with ${vercelToken}`),
      [githubToken, vercelToken],
    )).toBe('Bearer [REDACTED] failed with [REDACTED]');

    const db = createFakeDb();
    await db.publicationEvent.create({
      data: { entityType: 'news', entityId: 'news-1', action: 'PUBLISHED', metadata: {} },
    });
    await processPublicationEvents(db, {
      dispatch: async () => {
        throw new Error(`request failed for ${githubToken}`);
      },
      now: new Date('2026-08-13T12:00:00Z'),
    });
    const event = (await db.publicationEvent.findMany())[0];
    expect(event.metadata.publicRelease.lastError).toContain('[REDACTED]');
    expect(event.metadata.publicRelease.lastError).not.toContain(githubToken);
  });

  it('exposes release status to authenticated CMS users without exposing trigger credentials', async () => {
    const user = await makeUser({ email: 'editor@lakegroup.test', password: 'pw-editor-1', role: 'EDITOR' });
    const ctx = makeApp({ users: [user] });
    await ctx.db.publicationEvent.create({
      data: {
        entityType: 'news',
        entityId: 'news-1',
        action: 'PUBLISHED',
        metadata: { publicRelease: { status: 'TRIGGERED', attempts: 1, requestId: 'req-visible' } },
      },
    });
    expect((await request(ctx.app).get('/admin/public-releases')).status).toBe(401);
    const agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: user.email, password: 'pw-editor-1' });
    const response = await agent.get('/admin/public-releases');

    expect(response.status).toBe(200);
    expect(response.body.publicReleases[0]).toMatchObject({
      entityType: 'news',
      status: 'TRIGGERED',
      attempts: 1,
      requestId: 'req-visible',
    });
    expect(JSON.stringify(response.body)).not.toContain('token');
  });
});
