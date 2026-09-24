import { describe, expect, it, vi } from 'vitest';
import { createFormMailer } from '../src/lib/form-mailer.js';

const message = { recipient: 'projectdevemail001@gmail.com', replyTo: 'person@example.com', subject: '[TEST] Enquiry', text: 'Hello', html: '<p>Hello</p>' };
describe('Transactional form mailer', () => {
  it('uses server credentials and a validated Reply-To', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'mail-1' }) }));
    await createFormMailer({ apiKey: 'secret', from: 'Lake Group <forms@lakeoilgroup.com>', fetchImpl })(message);
    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.to).toEqual(['projectdevemail001@gmail.com']);
    expect(body.from).toBe('Lake Group <forms@lakeoilgroup.com>');
    expect(body.reply_to).toBe('person@example.com');
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([
    ['missing credentials', { apiKey: '', from: '' }, null],
    ['provider 429', {}, { ok: false, status: 429 }],
    ['provider 500', {}, { ok: false, status: 500 }],
    ['malformed response', {}, { ok: true, json: async () => ({}) }],
  ])('fails privately on %s', async (_label, options, result) => {
    const mailer = createFormMailer({ apiKey: 'secret', from: 'forms@lakeoilgroup.com', ...options,
      fetchImpl: vi.fn(async () => result) });
    await expect(mailer(message)).rejects.toMatchObject({ code: 'DELIVERY_TEMPORARILY_UNAVAILABLE', status: 503 });
  });
  it('fails privately on provider timeout or network error', async () => {
    const mailer = createFormMailer({ apiKey: 'secret', from: 'forms@lakeoilgroup.com',
      fetchImpl: vi.fn(async () => { throw new Error('secret provider detail'); }) });
    await expect(mailer(message)).rejects.toMatchObject({ code: 'DELIVERY_TEMPORARILY_UNAVAILABLE', status: 503 });
  });
});
