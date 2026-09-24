import crypto from 'node:crypto';
import express, { Router } from 'express';
import { z } from 'zod';
import { createFormSecurity, escapeFormHtml, formError, formOriginAllowed, formTokenLimiter, publicFormResponse, safeFormText } from '../lib/public-form-security.js';
import { securityLog } from '../lib/security-log.js';

const single = (max, min = 0, multiline = false) => z.string().max(max).transform((value) => safeFormText(value, { multiline })).pipe(z.string().min(min).max(max));
const schema = z.object({
  name: single(120, 1),
  email: z.email().max(254).transform((value) => safeFormText(value).toLowerCase()),
  phone: single(40).optional().default(''),
  subject: single(160, 1),
  message: single(5000, 10, true),
  consent: z.literal(true),
  website: z.literal(''),
  startedAt: z.number().int(),
  submissionToken: z.string().max(512),
  idempotencyKey: z.uuid(),
}).strict();

export function contactRouter({ recipientEmail = '', allowedOrigins = [], mailer = null, tokenSecret = '', pool = null, security = null } = {}) {
  const router = Router();
  const guard = security ?? createFormSecurity({ formId: 'contact', secret: tokenSecret, pool });
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/token', formTokenLimiter('contact', pool), (req, res) => {
    try { return res.set('Cache-Control', 'no-store').json(guard.issueToken()); }
    catch (error) { return publicFormResponse(res, error); }
  });
  router.post('/messages', express.json({ limit: '32kb', type: 'application/json' }), async (req, res) => {
    const requestId = crypto.randomUUID();
    try {
      if (!formOriginAllowed(req, allowedOrigins)) throw formError('ORIGIN_REJECTED', 403);
      if (!/^application\/json(?:\s*;|$)/iu.test(req.get('content-type') || '')) throw formError('UNSUPPORTED_CONTENT_TYPE', 415);
      if (Number(req.get('content-length')) > 32 * 1024) throw formError('PAYLOAD_TOO_LARGE', 413);
      const result = schema.safeParse(req.body);
      if (!result.success) throw formError('VALIDATION_ERROR');
      const data = result.data;
      if ((data.message.match(/https?:\/\//giu) || []).length > 8 || /(.)\1{100}/u.test(data.message)) throw formError('VALIDATION_ERROR');
      if (!recipientEmail || typeof mailer !== 'function') throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
      await guard.reserve({ token: data.submissionToken, startedAt: data.startedAt, idempotencyKey: data.idempotencyKey, ip: req.ip, email: data.email });
      const text = ['NEW WEBSITE ENQUIRY', `Reference: ${requestId}`, `Name: ${data.name}`, `Email: ${data.email}`, `Phone: ${data.phone}`, `Subject: ${data.subject}`, '', data.message].join('\n');
      const html = `<h1>Website enquiry</h1><p>Reference: ${requestId}</p><dl><dt>Name</dt><dd>${escapeFormHtml(data.name)}</dd><dt>Email</dt><dd>${escapeFormHtml(data.email)}</dd><dt>Phone</dt><dd>${escapeFormHtml(data.phone)}</dd><dt>Subject</dt><dd>${escapeFormHtml(data.subject)}</dd></dl><p>${escapeFormHtml(data.message).replace(/\n/gu, '<br>')}</p>`;
      const subject = `${recipientEmail === 'projectdevemail001@gmail.com' ? '[TEST] ' : ''}Lake Group Contact — Website Enquiry`;
      await mailer({ recipient: recipientEmail, replyTo: data.email, subject, text, html });
      securityLog(req.log, { action: 'CONTACT_MESSAGE_DELIVERED', req, detail: { requestId, provider: 'transactional' } });
      return res.set('Cache-Control', 'no-store').status(201).json({ ok: true, requestId });
    } catch (error) {
      securityLog(req.log, { action: 'CONTACT_MESSAGE_REJECTED', req, detail: { requestId, code: error.code ?? 'SERVICE_UNAVAILABLE' } });
      return publicFormResponse(res, error, requestId);
    }
  });
  return router;
}
