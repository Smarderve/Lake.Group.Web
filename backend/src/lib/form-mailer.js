import { formError } from './public-form-security.js';

export function createFormMailer({ apiKey = '', from = '', fetchImpl = fetch } = {}) {
  return async ({ recipient, replyTo, subject, text, html, attachments = [] }) => {
    if (!apiKey || !from || !recipient) throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
    let response;
    try {
      response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(10_000),
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [recipient], reply_to: replyTo, subject, text, html, attachments }),
      });
    } catch {
      throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
    }
    if (!response.ok) throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
    let body;
    try { body = await response.json(); } catch { throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503); }
    if (typeof body?.id !== 'string' || !body.id) throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
    return { provider: 'resend' };
  };
}
