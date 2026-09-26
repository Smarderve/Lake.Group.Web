import { describe, expect, it, vi } from 'vitest';
import { createSmtpMailer, verifySmtpTransport } from '../src/lib/smtp-mailer.js';

const message = { recipient: 'projectdevemail001@gmail.com', replyTo: 'person@example.com', subject: '[TEST] Enquiry', text: 'Hello', html: '<p>Hello</p>' };
const options = { host: 'smtp.gmail.com', port: 587, secure: false, user: 'projectdevemail001@gmail.com', pass: 'app-password', from: 'Lake Group Website Test <projectdevemail001@gmail.com>' };

describe('SMTP form mailer', () => {
  it('uses server SMTP configuration, fixed recipient, Reply-To, and STARTTLS', async () => {
    const sendMail = vi.fn(async () => ({ messageId: '<mail-1>' }));
    const transportFactory = vi.fn(() => ({ sendMail }));
    await createSmtpMailer({ ...options, transportFactory })(message);
    expect(transportFactory).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.gmail.com', port: 587,
      secure: false, requireTLS: true, tls: { rejectUnauthorized: true }, auth: { user: options.user, pass: options.pass } }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: options.from, to: 'projectdevemail001@gmail.com', replyTo: 'person@example.com' }));
  });

  it('encodes a vetted careers attachment as base64', async () => {
    const sendMail = vi.fn(async () => ({ accepted: ['projectdevemail001@gmail.com'] }));
    const mailer = createSmtpMailer({ ...options, transportFactory: () => ({ sendMail }) });
    await mailer({ ...message, attachments: [{ filename: 'cv.pdf', content: Buffer.from('%PDF').toString('base64') }] });
    expect(sendMail.mock.calls[0][0].attachments).toEqual([{ filename: 'cv.pdf', content: 'JVBERg==', encoding: 'base64' }]);
  });

  it.each([
    ['missing configuration', { host: '', user: '', pass: '', from: '' }, null],
    ['SMTP rejection', {}, { sendMail: async () => { throw new Error('private SMTP detail'); } }],
  ])('fails privately on %s', async (_label, overrides, transport) => {
    const mailer = createSmtpMailer({ ...options, ...overrides, transportFactory: () => transport ?? { sendMail: async () => ({}) } });
    await expect(mailer(message)).rejects.toMatchObject({ code: 'DELIVERY_TEMPORARILY_UNAVAILABLE', status: 503 });
  });

  it('verifies SMTP without sending mail', async () => {
    const verify = vi.fn(async () => true);
    await expect(verifySmtpTransport({ ...options, transportFactory: () => ({ verify }) })).resolves.toBe(true);
    expect(verify).toHaveBeenCalledOnce();
  });
});
