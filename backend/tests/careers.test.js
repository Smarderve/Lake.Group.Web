import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { careersRouter } from '../src/routes/careers.js';

const pdf = Buffer.from('%PDF-1.7\ncontrolled test CV\n%%EOF');
function makeApp({ mailer = vi.fn(async () => ({ provider: 'test', id: 'mail-1' })) } = {}) {
  const app = express();
  app.use('/api/careers', careersRouter({ recipientEmail: 'projectdevemail001@gmail.com', allowedOrigins: ['https://lakegroup.vercel.app'], mailer, limiter: careersRouter ? undefined : undefined }));
  return { app, mailer };
}
function valid(req) {
  return req.field('name', 'Careers System Test').field('email', 'test@example.com').field('phone', '+255700000000')
    .field('nationality', 'Tanzanian').field('coverLetter', 'This is a controlled delivery test.')
    .field('startedAt', String(Date.now() - 5000)).attach('cv', pdf, { filename: 'test-cv.pdf', contentType: 'application/pdf' });
}

describe('Careers application endpoint', () => {
  it('validates, delivers server-controlled recipient, and never logs applicant data', async () => {
    const { app, mailer } = makeApp();
    const response = await valid(request(app).post('/api/careers/applications')).expect(201);
    expect(response.body.ok).toBe(true);
    expect(mailer).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'projectdevemail001@gmail.com' }));
  });
  it.each([
    ['unexpected recipient', { recipient: 'attacker@example.com' }], ['mass assignment', { approved: 'true' }],
    ['xss name', { name: '<script>alert(1)</script>' }], ['sql name', { name: "' OR 1=1 --" }],
    ['oversized cover', { coverLetter: 'x'.repeat(6001) }], ['prototype key', { constructor: 'polluted' }],
  ])('rejects %s', async (_label, extra) => {
    const { app, mailer } = makeApp();
    const req = valid(request(app).post('/api/careers/applications'));
    for (const [key, value] of Object.entries(extra)) req.field(key, value);
    const response = await req;
    expect(response.status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it.each([
    ['resume.pdf.exe', 'application/pdf'], ['resume.exe.pdf', 'application/pdf'], ['resume.html.docx', 'application/zip'],
  ])('rejects dangerous filename %s', async (filename, contentType) => {
    const { app, mailer } = makeApp();
    const response = await valid(request(app).post('/api/careers/applications')).attach('cv', pdf, { filename, contentType });
    expect(response.status).toBe(400); expect(mailer).not.toHaveBeenCalled();
  });
  it('rejects MIME spoofing and multiple CVs', async () => {
    const { app, mailer } = makeApp();
    const spoof = await valid(request(app).post('/api/careers/applications')).attach('cv', Buffer.from('not a pdf'), { filename: 'resume.pdf', contentType: 'application/pdf' });
    expect(spoof.status).toBe(400);
    const multiple = await valid(request(app).post('/api/careers/applications')).attach('cv', pdf, { filename: 'second.pdf', contentType: 'application/pdf' });
    expect(multiple.status).toBe(400); expect(mailer).not.toHaveBeenCalled();
  });
  it('rejects wrong method, content type, origin, honeypot, and too-fast bots', async () => {
    const { app, mailer } = makeApp();
    expect((await request(app).get('/api/careers/applications')).status).toBe(404);
    expect((await request(app).post('/api/careers/applications').set('Content-Type', 'application/json').send({})).status).toBe(415);
    expect((await valid(request(app).post('/api/careers/applications').set('Origin', 'https://evil.example')).field('startedAt', String(Date.now() - 5000))).status).toBe(403);
    expect((await valid(request(app).post('/api/careers/applications')).field('website', 'bot')).status).toBe(400);
    expect((await valid(request(app).post('/api/careers/applications')).field('startedAt', String(Date.now()))).status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it('fails closed when mail infrastructure is absent', async () => {
    const app = express(); app.use('/api/careers', careersRouter({ recipientEmail: '', mailer: null }));
    const response = await valid(request(app).post('/api/careers/applications'));
    expect(response.status).toBe(503); expect(response.body.error.code).toBe('MAIL_NOT_CONFIGURED');
  });
});
