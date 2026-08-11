import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { makeApp, makeUser } from './helpers.js';
import {
  checkMetrics,
  checkLinks,
  checkTranslations,
  checkSeo,
  checkMedia,
  checkFaq,
  computeScores,
  buildHealthReport,
  metricStaleness,
} from '../src/lib/content-health.js';
import { normalizeEvent, analyticsSummary, trackEvent } from '../src/lib/analytics.js';

async function login(app, email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

async function makeCtx() {
  const users = [
    await makeUser({ email: 'admin@lakegroup.test', password: 'pw-admin-1', role: 'SUPER_ADMIN' }),
  ];
  const ctx = makeApp({ users });
  return { ...ctx, admin: await login(ctx.app, 'admin@lakegroup.test', 'pw-admin-1') };
}

function fixtureDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lake-health-'));
}

describe('Phase 10 — analytics events', () => {
  let ctx;
  beforeEach(async () => { ctx = await makeCtx(); });

  it('POST /api/public/analytics/events stores a validated event', async () => {
    const res = await request(ctx.app)
      .post('/api/public/analytics/events')
      .send({ type: 'PAGE_VIEW', page: '/services.html', language: 'en', sessionId: 's-1' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);

    const rows = await ctx.db.analyticsEvent.findMany({});
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('PAGE_VIEW');
    expect(rows[0].page).toBe('/services.html');
  });

  it('rejects invalid events (400) without storing', async () => {
    const bad = await request(ctx.app).post('/api/public/analytics/events').send({ type: 'EXPLODE', page: '/x.html' });
    expect(bad.status).toBe(400);
    const noPage = await request(ctx.app).post('/api/public/analytics/events').send({ type: 'PAGE_VIEW' });
    expect(noPage.status).toBe(400);
    const rows = await ctx.db.analyticsEvent.findMany({});
    expect(rows).toHaveLength(0);
  });

  it('analyticsSummary aggregates page views, chat stats and top queries', async () => {
    await trackEvent(ctx.db, { type: 'PAGE_VIEW', page: '/index.html' });
    await trackEvent(ctx.db, { type: 'PAGE_VIEW', page: '/index.html' });
    await trackEvent(ctx.db, { type: 'PAGE_VIEW', page: '/services.html' });
    await trackEvent(ctx.db, { type: 'CHAT_QUESTION', query: 'how many employees', page: '/index.html' });
    await trackEvent(ctx.db, { type: 'CHAT_NO_MATCH', query: 'what is revenue', page: '/index.html' });

    const sum = await analyticsSummary(ctx.db);
    expect(sum.events).toBe(5);
    expect(sum.pageViews[0]).toEqual({ page: '/index.html', count: 2 });
    expect(sum.chat.questions).toBe(1);
    expect(sum.chat.noMatch).toBe(1);
    expect(sum.chat.noMatchRate).toBe(50);
    expect(sum.topQueries.some((q) => q.query === 'what is revenue' && q.count === 1)).toBe(true);
  });

  it('admin summary + content-health routes require auth', async () => {
    const anon1 = await request(ctx.app).get('/admin/analytics/summary');
    expect(anon1.status).toBe(401);
    const anon2 = await request(ctx.app).get('/admin/content-health');
    expect(anon2.status).toBe(401);
  });

  it('admin can fetch the content-health report', async () => {
    await ctx.db.metric.create({
      data: { key: 'employees', label: 'Employees', value: '30,000+', status: 'PUBLISHED', verificationStatus: 'VERIFIED', verificationDate: new Date() },
    });
    const res = await ctx.admin.get('/admin/content-health');
    expect(res.status).toBe(200);
    expect(res.body.scores).toBeTruthy();
    expect(res.body.generatedAt).toBeTruthy();
  });
});

describe('Phase 10 — content-health checks', () => {
  it('metricStaleness buckets CURRENT / DUE_SOON / OVERDUE', () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    expect(metricStaleness({ verificationStatus: 'VERIFIED', verificationDate: new Date(now - 10 * day) }, 180, now)).toBe('CURRENT');
    expect(metricStaleness({ verificationStatus: 'VERIFIED', verificationDate: new Date(now - 140 * day) }, 180, now)).toBe('DUE_SOON');
    expect(metricStaleness({ verificationStatus: 'VERIFIED', verificationDate: new Date(now - 200 * day) }, 180, now)).toBe('OVERDUE');
    expect(metricStaleness({ verificationStatus: 'UNVERIFIED', verificationDate: null }, 180, now)).toBe('OVERDUE');
  });

  it('checkMetrics flags staleness, missing verification/source and value conflicts', async () => {
    const ctx = await makeCtx();
    const db = ctx.db;
    const now = Date.now();
    await db.metric.create({
      data: { key: 'fresh', label: 'A', value: '1', status: 'PUBLISHED', source: 'S', verificationStatus: 'VERIFIED', verificationDate: new Date(now - 10 * 24 * 3600 * 1000) },
    });
    const staleRow = await db.metric.create({
      data: { key: 'old', label: 'B', value: '9', status: 'PUBLISHED', source: 'S', verificationStatus: 'VERIFIED', verificationDate: new Date(now - 300 * 24 * 3600 * 1000) },
    });
    await db.metric.create({ data: { key: 'nosource', label: 'C', value: '5', status: 'PUBLISHED', verificationStatus: 'VERIFIED', verificationDate: new Date() } });
    await db.metric.create({ data: { key: 'unverified', label: 'D', value: '7', source: 'S', status: 'PUBLISHED' } });
    // Conflict: value changed across the version history.
    await db.metricVersion.create({ data: { metricId: staleRow.id, value: '9', status: 'PUBLISHED' } });
    await db.metricVersion.create({ data: { metricId: staleRow.id, value: '12', status: 'PUBLISHED' } });

    const report = await checkMetrics(db, { staleDays: 180, now });
    expect(report.total).toBe(4);
    expect(report.stale.overdue.map((m) => m.key)).toEqual(expect.arrayContaining(['old', 'unverified']));
    expect(report.missingSource.map((m) => m.key)).toEqual(['nosource']);
    expect(report.missingVerification.map((m) => m.key)).toEqual(['unverified']);
    expect(report.conflicts.map((c) => c.key)).toEqual(['old']);
  });

  it('checkLinks flags missing internal assets and invalid external URLs', async () => {
    const ctx = await makeCtx();
    const dir = fixtureDir();
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'assets', 'ok.png'), 'x');
    await ctx.db.media.create({ data: { url: 'assets/ok.png', caption: 'ok' } });
    await ctx.db.media.create({ data: { url: 'assets/gone.jpg', caption: 'gone' } });
    await ctx.db.company.create({ data: { slug: 'c1', name: 'C1', website: 'not a url' } });

    const res = await checkLinks(ctx.db, { repoRoot: dir });
    expect(res.internal.missing.map((m) => m.value)).toEqual(['assets/gone.jpg']);
    expect(res.external.invalid.map((u) => u.value)).toEqual(['not a url']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('checkTranslations reports missing and empty keys per language', () => {
    const res = checkTranslations({
      en: { a: 'A', b: 'B', c: 'C' },
      fr: { a: 'A', b: 'B' },       // missing c
      sw: { a: 'A', b: 'B', c: '' }, // empty c
    });
    expect(res.missing.fr).toEqual(['c']);
    expect(res.empty.sw).toEqual(['c']);
  });

  it('checkSeo flags news without meta and pages without title/description/lang', async () => {
    const ctx = await makeCtx();
    const dir = fixtureDir();
    fs.writeFileSync(path.join(dir, 'good.html'), '<html lang="en"><head><title>T</title><meta name="description" content="d"></head></html>');
    fs.writeFileSync(path.join(dir, 'bad.html'), '<html><head></head></html>');
    await ctx.db.news.create({ data: { slug: 'n1', title: 'News one', body: 'body', status: 'PUBLISHED' } });
    await ctx.db.news.create({ data: { slug: 'n2', title: 'News two', body: 'body', status: 'PUBLISHED', metaTitle: 'T', metaDescription: 'D' } });

    const res = await checkSeo(ctx.db, { repoRoot: dir });
    expect(res.news.missingMeta.map((n) => n.slug)).toEqual(['n1']);
    expect(res.pages.missingTitle).toEqual(['bad.html']);
    expect(res.pages.missingDescription).toEqual(['bad.html']);
    expect(res.pages.missingLang).toEqual(['bad.html']);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('checkMedia flags only truly orphaned media (references + gallery/news tags count as used)', async () => {
    const ctx = await makeCtx();
    const newsRow = await ctx.db.news.create({ data: { slug: 'n1', title: 'N', body: 'b', status: 'PUBLISHED' } });
    const hero = await ctx.db.media.create({ data: { url: 'assets/hero.jpg', caption: 'hero' } });
    await ctx.db.news.update({ where: { id: newsRow.id }, data: { heroMediaId: hero.id } });
    await ctx.db.media.create({ data: { url: 'assets/gallery.jpg', caption: 'g', tags: ['gallery'] } });
    await ctx.db.media.create({ data: { url: 'assets/orphan.jpg', caption: 'o' } });

    const res = await checkMedia(ctx.db);
    expect(res.total).toBe(3);
    expect(res.unused.map((m) => m.url)).toEqual(['assets/orphan.jpg']);
  });

  it('checkFaq groups repeated unanswered questions', async () => {
    const ctx = await makeCtx();
    for (let i = 0; i < 3; i += 1) {
      await ctx.db.unansweredQuestion.create({ data: { question: ' What is revenue? ', language: 'en' } });
    }
    await ctx.db.unansweredQuestion.create({ data: { question: 'Where is HQ?', language: 'en', answered: true } });
    const res = await checkFaq(ctx.db);
    expect(res.total).toBe(4);
    expect(res.open).toBe(3);
    expect(res.top[0]).toEqual({ question: 'what is revenue?', count: 3 });
  });

  it('computeScores turns issues into 0–100 domain scores + overall', () => {
    const scores = computeScores({
      metrics: { total: 10, missingVerification: [1, 2], missingSource: [], conflicts: [], stale: { overdue: [1] } },
      media: { total: 10, unused: [1] },
      i18n: { languages: ['en', 'fr', 'sw'], enKeys: 100, missing: { fr: [1, 2], sw: [] }, empty: { fr: [], sw: [] } },
      seo: { news: { checked: 10, missingMeta: [1] }, pages: { checked: 10, missingTitle: [], missingDescription: [1], missingLang: [] } },
      links: { internal: { checked: 10, missing: [1] }, external: { checked: 0, invalid: [] } },
    });
    expect(scores.metrics).toBe(70);
    expect(scores.media).toBe(90);
    expect(scores.overall).toBeGreaterThan(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
  });

  it('buildHealthReport assembles the full report (i18n path optional)', async () => {
    const ctx = await makeCtx();
    const report = await buildHealthReport(ctx.db, { repoRoot: null, i18nPath: null });
    expect(report.generatedAt).toBeTruthy();
    expect(report.scores).toBeTruthy();
    expect(report.checks.metrics).toBeTruthy();
    expect(report.checks.faq).toBeTruthy();
    expect(report.checks.i18n).toBeNull();
  });
});
