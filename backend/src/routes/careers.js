import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { createFormMailer } from '../lib/form-mailer.js';
import { createFormSecurity, escapeFormHtml, formError, formOriginAllowed, formTokenLimiter, publicFormResponse, safeFormText } from '../lib/public-form-security.js';
import { inspectCv, MAX_CV_BYTES } from '../lib/cv-inspection.js';
import { securityLog } from '../lib/security-log.js';

export const CAREERS_MAX_CV_BYTES = MAX_CV_BYTES;
export const CAREERS_MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const single = (max, min = 0, multiline = false) => z.string().max(max).transform((value) => safeFormText(value, { multiline })).pipe(z.string().min(min).max(max));
const schema = z.object({
  name: single(120, 1),
  email: z.email().max(254).transform((value) => safeFormText(value).toLowerCase()),
  phone: single(40, 3),
  nationality: single(80, 1),
  opportunity: single(160).optional().default(''),
  coverLetter: single(6000, 1, true),
  consent: z.literal('true'),
  website: z.literal(''),
  startedAt: z.coerce.number().int(),
  submissionToken: z.string().max(512),
  idempotencyKey: z.uuid(),
}).strict();

const upload = multer({ storage: multer.memoryStorage(), limits: {
  fileSize: MAX_CV_BYTES, files: 1, fields: 11, parts: 12, fieldSize: 7_000,
} }).single('cv');

export function createResendMailer(options = {}) {
  return createFormMailer(options);
}

export function careersRouter({ recipientEmail = '', allowedOrigins = [], mailer = null, scanner = null,
  tokenSecret = '', pool = null, security = null } = {}) {
  const router = Router();
  const guard = security ?? createFormSecurity({ formId: 'careers', secret: tokenSecret, pool });
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  let activeApplications = 0;
  router.get('/token', formTokenLimiter('careers', pool), (_req, res) => {
    try { return res.set('Cache-Control', 'no-store').json(guard.issueToken()); }
    catch (error) { return publicFormResponse(res, error); }
  });
  router.post('/applications', (req, res, next) => {
    if (!formOriginAllowed(req, allowedOrigins)) return publicFormResponse(res, formError('ORIGIN_REJECTED', 403));
    if (!/^multipart\/form-data\s*;\s*boundary=/iu.test(req.get('content-type') || '')) return publicFormResponse(res, formError('UNSUPPORTED_CONTENT_TYPE', 415));
    if (Number(req.get('content-length')) > CAREERS_MAX_REQUEST_BYTES) return publicFormResponse(res, formError('FILE_TOO_LARGE', 413));
    if (activeApplications >= 4) return publicFormResponse(res, formError('SERVICE_UNAVAILABLE', 503));
    activeApplications += 1;
    let released = false;
    const timeout = setTimeout(() => {
      if (!res.headersSent) publicFormResponse(res, formError('SERVICE_UNAVAILABLE', 503));
      req.destroy();
    }, 20_000);
    const release = () => { if (!released) { released = true; activeApplications -= 1; clearTimeout(timeout); } };
    res.once('finish', release);
    res.once('close', release);
    return upload(req, res, (error) => {
      if (error) return publicFormResponse(res, formError(error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR', error.code === 'LIMIT_FILE_SIZE' ? 413 : 400));
      return next();
    });
  }, async (req, res) => {
    const requestId = crypto.randomUUID();
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) throw formError('VALIDATION_ERROR');
      if (!recipientEmail || typeof mailer !== 'function') throw formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
      if (typeof scanner !== 'function') throw formError('SCANNER_UNAVAILABLE', 503);
      const cv = await inspectCv(req.file);
      const applicant = parsed.data;
      const reservation = await guard.reserve({ token: applicant.submissionToken, startedAt: applicant.startedAt,
        idempotencyKey: applicant.idempotencyKey, ip: req.ip, email: applicant.email });
      try {
        const verdict = await scanner(cv.buffer);
        if (!verdict?.clean) throw formError('SCANNER_UNAVAILABLE', 503);
      } catch (error) {
        await reservation.release();
        throw error;
      }
      const text = ['NEW CAREERS APPLICATION', `Reference: ${requestId}`, `Name: ${applicant.name}`, `Email: ${applicant.email}`,
        `Phone: ${applicant.phone}`, `Nationality: ${applicant.nationality}`, `Opportunity: ${applicant.opportunity || 'General application'}`,
        '', 'COVER LETTER', applicant.coverLetter, '', `CV: ${cv.filename}`].join('\n');
      const html = `<h1>New Careers Application</h1><p>Reference: ${requestId}</p><dl><dt>Name</dt><dd>${escapeFormHtml(applicant.name)}</dd><dt>Email</dt><dd>${escapeFormHtml(applicant.email)}</dd><dt>Phone</dt><dd>${escapeFormHtml(applicant.phone)}</dd><dt>Nationality</dt><dd>${escapeFormHtml(applicant.nationality)}</dd><dt>Opportunity</dt><dd>${escapeFormHtml(applicant.opportunity || 'General application')}</dd></dl><h2>Cover Letter</h2><p>${escapeFormHtml(applicant.coverLetter).replace(/\n/gu, '<br>')}</p>`;
      await mailer({ recipient: recipientEmail, replyTo: applicant.email, subject: `${recipientEmail === 'projectdevemail001@gmail.com' ? '[TEST] ' : ''}Lake Group Careers — New Application`,
        text, html, attachments: [{ filename: cv.filename, content: cv.buffer.toString('base64') }] });
      securityLog(req.log, { action: 'CAREERS_APPLICATION_DELIVERED', req, detail: { requestId, provider: 'transactional' } });
      return res.set('Cache-Control', 'no-store').status(201).json({ ok: true, requestId });
    } catch (error) {
      securityLog(req.log, { action: 'CAREERS_APPLICATION_REJECTED', req, detail: { requestId, code: error.code ?? 'SERVICE_UNAVAILABLE' } });
      return publicFormResponse(res, error, requestId);
    }
  });
  return router;
}
