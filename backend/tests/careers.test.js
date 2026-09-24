import express from 'express';
import crypto from 'node:crypto';
import request from 'supertest';
import yazl from 'yazl';
import { describe, expect, it, vi } from 'vitest';
import { careersRouter } from '../src/routes/careers.js';
import { createFormSecurity, formError } from '../src/lib/public-form-security.js';

const origin = 'https://www.lakeoilgroup.com';
const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\nstartxref\n9\n%%EOF');
async function docx(entries = [['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<document/>']]) {
  const zip = new yazl.ZipFile();
  for (const [name, value] of entries) zip.addBuffer(Buffer.from(value), name);
  zip.end();
  const chunks = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
function setup({ scanner = vi.fn(async () => ({ clean: true })), recipientEmail = 'projectdevemail001@gmail.com', mailer = vi.fn(async () => ({ provider: 'test' })) } = {}) {
  const app = express();
  const security = createFormSecurity({ formId: 'careers', secret: 'a'.repeat(32), minCompletionMs: 0 });
  app.use('/api/careers', careersRouter({ recipientEmail, allowedOrigins: [origin], mailer, scanner, security }));
  return { app, scanner, mailer };
}
async function valid(app, extra = {}) {
  const token = (await request(app).get('/api/careers/token')).body;
  const fields = { name: 'Careers System Test', email: 'test@example.com', phone: '+255700000000',
    nationality: 'Tanzanian', coverLetter: 'Controlled delivery test.', consent: 'true', website: '',
    startedAt: String(token.startedAt), submissionToken: token.token,
    idempotencyKey: extra.idempotencyKey ?? crypto.randomUUID(), ...extra.fields };
  let req = request(app).post('/api/careers/applications').set('Origin', origin);
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return req.attach('cv', extra.file ?? pdf, { filename: extra.filename ?? 'resume.pdf', contentType: extra.contentType ?? 'application/pdf' });
}

describe('Careers applications', () => {
  it('delivers a scanned PDF only to the server-selected test recipient', async () => {
    const { app, mailer, scanner } = setup();
    const response = await valid(app);
    expect(response.status).toBe(201);
    expect(response.body.requestId).toBeTruthy();
    expect(scanner).toHaveBeenCalledOnce();
    expect(mailer).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'projectdevemail001@gmail.com', replyTo: 'test@example.com', subject: expect.stringContaining('[TEST]') }));
    expect(mailer.mock.calls[0][0].attachments[0].content).toBe(pdf.toString('base64'));
  });
  it('accepts a structurally valid DOCX after scanning', async () => {
    const { app, scanner, mailer } = setup();
    const result = await valid(app, { file: await docx(), filename: 'resume.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(result.status).toBe(201);
    expect(scanner).toHaveBeenCalledOnce();
    expect(mailer.mock.calls[0][0].attachments[0].filename).toBe('resume.docx');
  });
  it('keeps SQL-like and HTML applicant text inert in the mail body', async () => {
    const { app, mailer } = setup();
    const result = await valid(app, { fields: { name: "' OR 1=1 --", coverLetter: '<script>alert(1)</script> I am interested in this role.' } });
    expect(result.status).toBe(201);
    expect(mailer.mock.calls[0][0].html).toContain('&lt;script&gt;');
    expect(mailer.mock.calls[0][0].text).toContain("' OR 1=1 --");
  });
  it.each([
    ['missing document', [['[Content_Types].xml', '<Types/>']]],
    ['macro', [['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<document/>'], ['word/vbaProject.bin', 'evil']]],
    ['embedded executable', [['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<document/>'], ['word/embeddings/evil.exe', 'evil']]],
    ['nested archive', [['[Content_Types].xml', '<Types/>'], ['word/document.xml', '<document/>'], ['word/inner.zip', 'evil']]],
  ])('rejects DOCX %s', async (_label, entries) => {
    const { app, mailer } = setup();
    const result = await valid(app, { file: await docx(entries), filename: 'resume.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(result.status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it.each([
    ['injection field', { fields: { recipient: 'attacker@example.com' } }],
    ['control character', { fields: { opportunity: 'HR\r\nBcc: bad@example.com' } }],
    ['legacy DOC', { filename: 'resume.doc', contentType: 'application/msword' }],
    ['double extension', { filename: 'resume.pdf.exe' }],
    ['fake PDF', { file: Buffer.from('MZ executable') }],
    ['active PDF', { file: Buffer.from('%PDF-1.7\n1 0 obj\n/JavaScript\nendobj\n%%EOF') }],
  ])('rejects %s before mail', async (_label, extra) => {
    const { app, mailer } = setup();
    expect((await valid(app, extra)).status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it.each([
    ['to', { to: 'evil@example.com' }], ['cc', { cc: 'evil@example.com' }],
    ['bcc', { bcc: 'evil@example.com' }], ['from', { from: 'evil@example.com' }],
    ['replyTo', { replyTo: 'evil@example.com' }], ['sender', { sender: 'evil@example.com' }],
    ['recipient', { recipient: 'evil@example.com' }], ['approved', { approved: 'true' }],
    ['redirect', { redirect: 'https://evil.example' }], ['next', { next: 'https://evil.example' }],
    ['returnUrl', { returnUrl: 'https://evil.example' }], ['prototype', { prototype: 'x' }],
    ['constructor', { constructor: 'x' }], ['name blank', { name: '   ' }],
    ['name long', { name: 'x'.repeat(121) }], ['name CRLF', { name: 'Hello\r\nBcc: evil@example.com' }],
    ['name NUL', { name: 'Hello\u0000World' }], ['name bidi', { name: 'Hello\u202eWorld' }],
    ['email bad', { email: 'not-email' }], ['email long', { email: `${'a'.repeat(255)}@example.com` }],
    ['email CRLF', { email: 'x@example.com\r\nBcc:evil@example.com' }],
    ['phone blank', { phone: ' ' }], ['phone long', { phone: '1'.repeat(41) }],
    ['phone CRLF', { phone: '123\r\nBcc:evil@example.com' }],
    ['nationality blank', { nationality: '   ' }], ['nationality long', { nationality: 'x'.repeat(81) }],
    ['opportunity long', { opportunity: 'x'.repeat(161) }], ['opportunity CRLF', { opportunity: 'Role\r\nCc: evil@example.com' }],
    ['cover blank', { coverLetter: ' ' }], ['cover long', { coverLetter: 'x'.repeat(6001) }],
    ['cover NUL', { coverLetter: 'hello\u0000world' }], ['cover bidi', { coverLetter: 'hello\u202eworld' }],
    ['consent false', { consent: 'false' }], ['honeypot', { website: 'spam.example' }],
    ['startedAt invalid', { startedAt: 'none' }], ['token missing', { submissionToken: '' }],
    ['key invalid', { idempotencyKey: 'bad-key' }],
  ])('rejects application variant %s', async (_label, fields) => {
    const { app, mailer } = setup();
    const response = await valid(app, { fields });
    expect(response.status).toBe(400);
    expect(mailer).not.toHaveBeenCalled();
  });
  it.each([
    ['infected', async () => { throw formError('MALWARE_DETECTED'); }, 400],
    ['unavailable', async () => { throw formError('SCANNER_UNAVAILABLE', 503); }, 503],
    ['unknown', async () => ({ clean: false }), 503],
  ])('fails closed on scanner %s', async (_label, scan, status) => {
    const { app, mailer } = setup({ scanner: scan });
    expect((await valid(app)).status).toBe(status);
    expect(mailer).not.toHaveBeenCalled();
  });
  it('rejects cross origin, missing config, and duplicate delivery', async () => {
    const { app, mailer } = setup();
    expect((await valid(app, { idempotencyKey: '11111111-1111-4111-8111-111111111111' })).status).toBe(201);
    expect((await valid(app, { idempotencyKey: '11111111-1111-4111-8111-111111111111' })).status).toBe(409);
    expect(mailer).toHaveBeenCalledOnce();
    expect((await request(app).post('/api/careers/applications').set('Origin', 'https://evil.example')).status).toBe(403);
    const missing = setup({ recipientEmail: '' });
    expect((await valid(missing.app)).status).toBe(503);
  });
});
