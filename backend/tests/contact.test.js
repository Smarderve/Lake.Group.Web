import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { contactRouter } from '../src/routes/contact.js';
import { createFormSecurity } from '../src/lib/public-form-security.js';

const origin = 'https://www.lakeoilgroup.com';
function setup({ recipientEmail = 'projectdevemail001@gmail.com', mailer = vi.fn(async () => ({ provider: 'test' })) } = {}) {
  const app = express();
  const security = createFormSecurity({ formId: 'contact', secret: 'b'.repeat(32), minCompletionMs: 0 });
  app.use('/api/contact', contactRouter({ recipientEmail, allowedOrigins: [origin], mailer, security }));
  return { app, mailer };
}
async function payload(app, overrides = {}) {
  const token = (await request(app).get('/api/contact/token')).body;
  return { name: 'Contact Test', email: 'person@example.com', phone: '', subject: 'Website enquiry', message: 'This is a controlled enquiry.',
    consent: true, website: '', startedAt: token.startedAt, submissionToken: token.token, idempotencyKey: crypto.randomUUID(), ...overrides };
}
describe('Contact messages', () => {
  it('delivers escaped content to the test recipient with a fixed subject', async () => {
    const { app, mailer } = setup();
    const response = await request(app).post('/api/contact/messages').set('Origin', origin).send(await payload(app, { message: '<script>alert(1)</script> business enquiry' }));
    expect(response.status).toBe(201);
    expect(mailer).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'projectdevemail001@gmail.com', replyTo: 'person@example.com', subject: '[TEST] Lake Group Contact — Website Enquiry' }));
    expect(mailer.mock.calls[0][0].html).toContain('&lt;script&gt;');
  });
  it.each([
    ['recipient override', { to: 'evil@example.com' }], ['cc override', { cc: 'evil@example.com' }],
    ['object injection', { name: { $ne: '' } }], ['array injection', { email: ['x@example.com'] }],
    ['header injection', { subject: 'Hello\r\nBcc: evil@example.com' }],
    ['honeypot', { website: 'spam.example' }], ['no consent', { consent: false }],
    ['too many links', { message: 'https://a.test '.repeat(9) }],
  ])('rejects %s', async (_label, override) => {
    const { app, mailer } = setup();
    const response = await request(app).post('/api/contact/messages').set('Origin', origin).send(await payload(app, override));
    expect(response.status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it.each([
    ['to', { to: 'evil@example.com' }], ['bcc', { bcc: 'evil@example.com' }],
    ['from', { from: 'evil@example.com' }], ['replyTo', { replyTo: 'evil@example.com' }],
    ['sender', { sender: 'evil@example.com' }], ['recipient', { recipient: 'evil@example.com' }],
    ['redirect', { redirect: 'https://evil.example' }], ['returnUrl', { returnUrl: 'https://evil.example' }],
    ['next', { next: 'https://evil.example' }], ['successUrl', { successUrl: 'https://evil.example' }],
    ['prototype', { prototype: 'x' }], ['constructor', { constructor: 'x' }],
    ['name number', { name: 1 }], ['name null', { name: null }], ['name array', { name: ['one'] }],
    ['name object', { name: { $gt: '' } }], ['name blank', { name: '   ' }],
    ['email number', { email: 5 }], ['email null', { email: null }], ['email invalid', { email: 'not-an-email' }],
    ['email long', { email: `${'a'.repeat(255)}@example.com` }], ['email newline', { email: 'a@example.com\nBcc:evil@example.com' }],
    ['phone object', { phone: { $ne: '' } }], ['phone long', { phone: '1'.repeat(41) }],
    ['subject object', { subject: { $ne: '' } }], ['subject array', { subject: ['x'] }],
    ['subject blank', { subject: ' ' }], ['subject long', { subject: 'x'.repeat(161) }],
    ['subject NUL', { subject: 'Hi\u0000there' }], ['subject bidi', { subject: 'Hi\u202ethere' }],
    ['message object', { message: { $gt: '' } }], ['message array', { message: ['x'] }],
    ['message null', { message: null }], ['message short', { message: 'short' }],
    ['message long', { message: 'x'.repeat(5001) }], ['message NUL', { message: 'hello\u0000 there are words' }],
    ['message bidi', { message: 'hello\u202e there are words' }],
    ['consent text', { consent: 'true' }], ['startedAt object', { startedAt: { $ne: 0 } }],
    ['token object', { submissionToken: { $ne: '' } }], ['key object', { idempotencyKey: { $ne: '' } }],
  ])('rejects attack variant %s', async (_label, override) => {
    const { app, mailer } = setup();
    const result = await request(app).post('/api/contact/messages').set('Origin', origin).send(await payload(app, override));
    expect(result.status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it('rejects replay, wrong content type, wrong origin, and missing recipient', async () => {
    const { app, mailer } = setup();
    const body = await payload(app);
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).send(body)).status).toBe(201);
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).send(body)).status).toBe(409);
    expect(mailer).toHaveBeenCalledOnce();
    expect((await request(app).post('/api/contact/messages').set('Origin', 'https://evil.example').send(await payload(app))).status).toBe(403);
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).set('Content-Type', 'text/plain').send('test')).status).toBe(415);
    const missing = setup({ recipientEmail: '' });
    expect((await request(missing.app).post('/api/contact/messages').set('Origin', origin).send(await payload(missing.app))).status).toBe(503);
  });
  it.each(['get', 'put', 'patch', 'delete'])('does not serve %s on the message path', async (method) => {
    const { app } = setup();
    expect((await request(app)[method]('/api/contact/messages')).status).toBe(404);
  });
  it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/xml'])('rejects %s', async (type) => {
    const { app } = setup();
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).set('Content-Type', type).send('x')).status).toBe(415);
  });
  it('rejects malformed JSON without delivery', async () => {
    const { app, mailer } = setup();
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).set('Content-Type', 'application/json').send('{broken')).status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it('rejects a tampered form token and cross-site fetch metadata', async () => {
    const { app, mailer } = setup();
    const first = await payload(app); first.submissionToken += 'x';
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).send(first)).status).toBe(400);
    expect((await request(app).post('/api/contact/messages').set('Origin', origin).set('Sec-Fetch-Site', 'cross-site').send(await payload(app))).status).toBe(403);
    expect(mailer).not.toHaveBeenCalled();
  });
});
