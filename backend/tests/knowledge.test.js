import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';

async function login(app, email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

async function makeCtx() {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
    await makeUser({ email: 'viewer@lakegroup.test', password: 'pw-view-1', role: 'VIEWER' }),
  ];
  const ctx = makeApp({ users });
  return {
    ...ctx,
    admin: await login(ctx.app, 'admin@lakegroup.test', 'pw-admin-1'),
    viewer: await login(ctx.app, 'viewer@lakegroup.test', 'pw-view-1'),
  };
}

/** Seed a PUBLISHED metric + a DRAFT one so the bundle only carries the first. */
async function seedPublished(db) {
  const base = {
    label: 'Employees',
    value: '30,000+',
    unit: 'employees',
    source: 'Lake Group HR fact sheet',
    verificationStatus: 'VERIFIED',
  };
  await db.metric.create({ data: { key: 'employees', ...base, status: 'PUBLISHED' } });
  await db.metric.create({ data: { ...base, key: 'draft-metric', value: '9', status: 'DRAFT' } });
  await db.country.create({ data: { isoCode: 'TZ', name: 'Tanzania', status: 'PUBLISHED' } });
  await db.country.create({ data: { isoCode: 'ZA', name: 'South Africa', status: 'PUBLISHED' } });
  await db.company.create({
    data: {
      slug: 'lake-oil',
      name: 'Lake Oil',
      description: 'Upstream exploration and production',
      status: 'PUBLISHED',
    },
  });
  await db.leadership.create({
    data: {
      name: 'Amina Mwangi',
      position: 'Chief Executive Officer',
      bio: 'Leads the group strategy.',
      status: 'PUBLISHED',
    },
  });
}

describe('Phase 9 — AI / corporate knowledge', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await makeCtx();
  });

  it('GET /api/public/knowledge/facts returns only PUBLISHED rows, with source + verification + url', async () => {
    await seedPublished(ctx.db);

    const res = await request(ctx.app).get('/api/public/knowledge/facts');
    expect(res.status).toBe(200);
    expect(res.body.generatedAt).toBeTruthy();

    const facts = res.body.facts;
    const metric = facts.find((f) => f.id === 'metric:employees');
    expect(metric).toBeTruthy();
    expect(metric.text).toContain('30,000+');
    expect(metric.source).toBe('Lake Group HR fact sheet');
    expect(metric.verification).toBe('VERIFIED');
    expect(metric.url).toBe('/about.html');
    expect(metric.title).toBeTruthy();

    // DRAFT rows never leak into the bundle.
    expect(facts.some((f) => f.id === 'metric:draft-metric')).toBe(false);

    // Registry rows carry their site URL for citations.
    const company = facts.find((f) => f.id === 'company:lake-oil');
    expect(company).toBeTruthy();
    expect(company.url).toBe('/lake-oil.html');

    // Aggregate country fact lists every published country.
    const countries = facts.find((f) => f.type === 'countries');
    expect(countries).toBeTruthy();
    expect(countries.text).toContain('Tanzania');
    expect(countries.text).toContain('South Africa');

    // Leadership facts include position + bio.
    const leader = facts.find((f) => f.id === 'leadership:Amina Mwangi');
    expect(leader.text).toContain('Chief Executive Officer');
  });

  it('POST /api/public/assistant/unanswered records the question with normalized language/page', async () => {
    const res = await request(ctx.app)
      .post('/api/public/assistant/unanswered')
      .send({ question: '  How many fuel depots does Lake operate in Kenya?  ', language: 'FR', page: '/services.html' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });

    const rows = await ctx.db.unansweredQuestion.findMany({});
    expect(rows).toHaveLength(1);
    expect(rows[0].question).toBe('How many fuel depots does Lake operate in Kenya?');
    expect(rows[0].language).toBe('fr');
    expect(rows[0].page).toBe('/services.html');
    expect(rows[0].answered).toBe(false);
  });

  it('rejects missing / over-long questions (400 VALIDATION_ERROR) without writing a row', async () => {
    const missing = await request(ctx.app).post('/api/public/assistant/unanswered').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');

    const tooLong = await request(ctx.app)
      .post('/api/public/assistant/unanswered')
      .send({ question: 'x'.repeat(501) });
    expect(tooLong.status).toBe(400);

    const rows = await ctx.db.unansweredQuestion.findMany({});
    expect(rows).toHaveLength(0);
  });

  it('admin can list unanswered questions and mark one resolved (with audit)', async () => {
    await request(ctx.app)
      .post('/api/public/assistant/unanswered')
      .send({ question: 'What is Lake Group revenue?', language: 'en', page: '/index.html' });

    const listed = await ctx.admin.get('/admin/unanswered-questions');
    expect(listed.status).toBe(200);
    expect(listed.body.unansweredQuestions).toHaveLength(1);
    const id = listed.body.unansweredQuestions[0].id;

    const resolved = await ctx.admin.patch(`/admin/unanswered-questions/${id}`).send({
      answered: true,
      answerNote: 'Revenue is not published; answer with the investor contact line.',
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body.unansweredQuestion.answered).toBe(true);
    expect(resolved.body.unansweredQuestion.answerNote).toContain('investor contact');

    const audit = ctx.db.auditRows.find((a) => a.action === 'UNANSWERED_QUESTION_RESOLVED');
    expect(audit).toBeTruthy();
    expect(audit.resource).toBe(`admin/unanswered-questions/${id}`);
  });

  it('unanswered-questions admin routes require authentication', async () => {
    const anon = await request(ctx.app).get('/admin/unanswered-questions');
    expect(anon.status).toBe(401);
  });

  it('CORS preflight allows the cross-origin POST (browser fetch would otherwise block it)', async () => {
    const preflight = await request(ctx.app)
      .options('/api/public/assistant/unanswered')
      .set('Origin', 'http://127.0.0.1:8796')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('*');
    expect(preflight.headers['access-control-allow-methods']).toContain('POST');
    expect(preflight.headers['access-control-allow-headers']).toContain('Content-Type');

    // The actual cross-origin POST must carry ACAO so the browser accepts it.
    const post = await request(ctx.app)
      .post('/api/public/assistant/unanswered')
      .set('Origin', 'http://127.0.0.1:8796')
      .send({ question: 'CORS-check question' });
    expect(post.status).toBe(201);
    expect(post.headers['access-control-allow-origin']).toBe('*');

    const rows = await ctx.db.unansweredQuestion.findMany({});
    expect(rows.some((r) => r.question === 'CORS-check question')).toBe(true);
  });
});
