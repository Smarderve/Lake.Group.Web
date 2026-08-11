import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

describe('SECURITY_ROADMAP Phase 5 — public write validation', () => {
  let ctx;
  beforeEach(async () => {
    ctx = makeApp({ users: [await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })] });
  });

  it('analytics events: invalid types and incomplete payloads are rejected (400)', async () => {
    const badType = await request(ctx.app).post('/api/public/analytics/events').send({ type: 'HACK', page: '/x' });
    expect(badType.status).toBe(400);

    const noPage = await request(ctx.app).post('/api/public/analytics/events').send({ type: 'PAGE_VIEW' });
    expect(noPage.status).toBe(400);

    const noQuery = await request(ctx.app).post('/api/public/analytics/events').send({ type: 'CHAT_QUESTION' });
    expect(noQuery.status).toBe(400);

    const nonObject = await request(ctx.app).post('/api/public/analytics/events').send('just-a-string');
    expect(nonObject.status).toBe(400);
  });

  it('analytics events: oversized fields are capped, valid events are stored (201)', async () => {
    const res = await request(ctx.app).post('/api/public/analytics/events').send({
      type: 'CHAT_QUESTION',
      query: 'q'.repeat(400), // > 300 cap
      sessionId: 's'.repeat(100), // > 64 cap
    });
    expect(res.status).toBe(201);
    const rows = await ctx.db.analyticsEvent.findMany({});
    expect(rows.length).toBe(1);
    expect(rows[0].query.length).toBe(300);
    expect(rows[0].sessionId.length).toBe(64);
  });

  it('unanswered POST: missing/oversized/non-string questions are rejected with a schema error', async () => {
    const missing = await request(ctx.app).post('/api/public/assistant/unanswered').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');

    const tooLong = await request(ctx.app).post('/api/public/assistant/unanswered').send({ question: 'x'.repeat(501) });
    expect(tooLong.status).toBe(400);

    const notString = await request(ctx.app).post('/api/public/assistant/unanswered').send({ question: 42 });
    expect(notString.status).toBe(400);
  });

  it('unanswered POST: valid question stored; bad language falls back to en', async () => {
    const res = await request(ctx.app).post('/api/public/assistant/unanswered').send({
      question: 'What is the revenue?',
      language: 'xx', // not a real code but matches [a-z]{2}
      page: '/about.html',
    });
    expect(res.status).toBe(201);
    const rows = await ctx.db.unansweredQuestion.findMany({});
    expect(rows[0].question).toBe('What is the revenue?');
    expect(rows[0].language).toBe('xx');
    expect(rows[0].page).toBe('/about.html');

    const badLang = await request(ctx.app).post('/api/public/assistant/unanswered').send({ question: 'ok?' });
    expect(badLang.status).toBe(201);
    expect((await ctx.db.unansweredQuestion.findMany({}))[1].language).toBe('en');
  });
});

describe('SECURITY_ROADMAP Phase 5 — admin write validation', () => {
  let ctx;
  let agent;
  beforeEach(async () => {
    ctx = makeApp({ users: [await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })] });
    agent = request.agent(ctx.app);
    await agent.post('/auth/login').send({ email: 'admin@lakegroup.test', password: 'pw-admin-1' });
  });

  it('unanswered-questions PATCH: invalid bodies are rejected by the schema', async () => {
    const row = await ctx.db.unansweredQuestion.create({ data: { question: 'Where are you based?' } });

    const badAnswered = await agent.patch(`/admin/unanswered-questions/${row.id}`).send({ answered: 'yes' });
    expect(badAnswered.status).toBe(400);
    expect(badAnswered.body.error.code).toBe('VALIDATION_ERROR');

    const badNote = await agent.patch(`/admin/unanswered-questions/${row.id}`).send({ answered: true, answerNote: 'n'.repeat(501) });
    expect(badNote.status).toBe(400);
  });

  it('unanswered-questions PATCH: valid body resolves + audits; unknown id → 404', async () => {
    const row = await ctx.db.unansweredQuestion.create({ data: { question: 'Where are you based?' } });
    const res = await agent.patch(`/admin/unanswered-questions/${row.id}`).send({
      answered: true,
      answerNote: 'Dar es Salaam headquarters',
    });
    expect(res.status).toBe(200);
    expect(res.body.unansweredQuestion.answered).toBe(true);
    expect(res.body.unansweredQuestion.answerNote).toBe('Dar es Salaam headquarters');
    expect(ctx.db.auditRows.some((a) => a.action === 'UNANSWERED_QUESTION_RESOLVED')).toBe(true);

    const ghost = await agent.patch('/admin/unanswered-questions/ghost-id').send({ answered: true });
    expect(ghost.status).toBe(404);
  });

  it('admin analytics summary clamps the days query parameter', async () => {
    const big = await agent.get('/admin/analytics/summary?days=9999');
    expect(big.status).toBe(200);
    expect(big.body.windowDays).toBe(365);

    const junk = await agent.get('/admin/analytics/summary?days=abc');
    expect(junk.status).toBe(200);
    expect(junk.body.windowDays).toBe(30);
  });
});

describe('SECURITY_ROADMAP Phase 5 — public allowlist + size limits', () => {
  let ctx;
  beforeEach(async () => {
    ctx = makeApp({ users: [await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' })] });
  });

  it('unknown public entities and ghost ids are 404, never raw rows', async () => {
    const unknown = await request(ctx.app).get('/api/public/not-a-thing');
    expect(unknown.status).toBe(404);

    const ghost = await request(ctx.app).get('/api/public/companies/ghost-slug');
    expect(ghost.status).toBe(404);
  });

  it('oversized JSON bodies are rejected with 413 PAYLOAD_TOO_LARGE before any handler', async () => {
    const big = { type: 'PAGE_VIEW', page: '/x', detail: { blob: 'x'.repeat(200_000) } };
    const res = await request(ctx.app).post('/api/public/analytics/events').send(big);
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
