import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { securityLog } from '../lib/security-log.js';

export const CAREERS_MAX_CV_BYTES = 10 * 1024 * 1024;
export const CAREERS_MAX_REQUEST_BYTES = 12 * 1024 * 1024;

const normalizeOrigins = (value) => new Set((value ?? []).map((item) => String(item).trim().replace(/\/+$/, '')).filter(Boolean));
const fieldSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(3).max(40),
  nationality: z.string().trim().min(1).max(80),
  coverLetter: z.string().trim().min(1).max(6000),
  opportunity: z.string().trim().max(160).optional().default(''),
  website: z.string().max(0).optional().default(''),
  startedAt: z.coerce.number().int().min(0).optional(),
}).strict();

const MIME_BY_EXT = new Map([
  ['pdf', 'application/pdf'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

function safeText(value) {
  return [...String(value)].map((char) => {
    const code = char.codePointAt(0);
    return (code < 32 || code === 127) && char !== '\n' && char !== '\r' ? ' ' : char;
  }).join('').replace(/\r?\n/g, '\n').trim();
}

function escapeHtml(value) {
  return safeText(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function invalid(message = 'Application could not be validated') {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

function uploadMiddleware() {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: CAREERS_MAX_CV_BYTES, files: 1, fields: 10, parts: 12, fieldSize: 12_000 },
  }).single('cv');
  return (req, res, next) => upload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_PART_COUNT') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'CV or request is too large' } });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: { code: 'ONE_CV_ONLY', message: 'Upload exactly one CV' } });
    }
    return res.status(400).json({ error: { code: 'INVALID_MULTIPART', message: 'Invalid multipart request' } });
  });
}

async function inspectCv(file) {
  if (!file?.buffer?.length) throw invalid('A CV is required');
  const name = safeText(file.originalname);
  if (!name || name.includes('/') || name.includes('\\') || name.includes('\u0000')) throw invalid('Invalid CV filename');
  const extension = name.toLowerCase().split('.').pop();
  const expectedMime = MIME_BY_EXT.get(extension);
  if (!expectedMime || name.split('.').length !== 2) throw invalid('Use one PDF, DOC or DOCX file');
  const detected = await fileTypeFromBuffer(file.buffer);
  const bytes = file.buffer;
  const isPdf = bytes.subarray(0, 5).toString() === '%PDF-';
  const isOle = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'));
  const isZip = bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from('504B0304', 'hex'));
  const actualMime = isPdf ? 'application/pdf' : isOle ? 'application/msword' : isZip ? 'application/zip' : detected?.mime;
  const valid = extension === 'pdf' ? actualMime === 'application/pdf'
    : extension === 'doc' ? actualMime === 'application/msword'
      : actualMime === 'application/zip' || detected?.mime === expectedMime;
  if (!valid || (file.mimetype && file.mimetype !== 'application/octet-stream' && file.mimetype !== expectedMime)) {
    throw invalid('CV content does not match its declared type');
  }
  return { extension, mimeType: expectedMime, filename: name, buffer: file.buffer };
}

export function careersRateLimiter({ windowMs = 60 * 60 * 1000, limit = 5 } = {}) {
  return rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many applications. Please try again later.' } }) });
}

export function createResendMailer({ apiKey = '', from = '' } = {}) {
  return async ({ recipient, applicant, cv }) => {
    if (!apiKey || !from) {
      const error = new Error('Mail provider is not configured');
      error.status = 503; error.code = 'MAIL_NOT_CONFIGURED'; throw error;
    }
    const text = [
      'NEW CAREERS APPLICATION', '', 'APPLICANT', `Name: ${applicant.name}`, `Email: ${applicant.email}`,
      `Phone: ${applicant.phone}`, `Nationality: ${applicant.nationality}`, `Opportunity: ${applicant.opportunity || 'General enquiry'}`,
      '', 'COVER LETTER', applicant.coverLetter, '', `CV: ${cv.filename}`,
    ].join('\n');
    const html = `<h1>New Careers Application</h1><h2>Applicant</h2><dl><dt>Name</dt><dd>${escapeHtml(applicant.name)}</dd><dt>Email</dt><dd>${escapeHtml(applicant.email)}</dd><dt>Phone</dt><dd>${escapeHtml(applicant.phone)}</dd><dt>Nationality</dt><dd>${escapeHtml(applicant.nationality)}</dd><dt>Opportunity</dt><dd>${escapeHtml(applicant.opportunity || 'General enquiry')}</dd></dl><h2>Cover Letter</h2><p>${escapeHtml(applicant.coverLetter).replace(/\n/g, '<br>')}</p>`;
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [recipient], reply_to: applicant.email, subject: 'New Careers Application', text, html, attachments: [{ filename: cv.filename, content: cv.buffer.toString('base64') }] }) });
    if (!response.ok) { const error = new Error('Mail provider rejected the message'); error.status = 502; error.code = 'MAIL_PROVIDER_REJECTED'; throw error; }
    const body = await response.json();
    return { provider: 'resend', id: body.id };
  };
}

export function careersRouter({ recipientEmail, allowedOrigins = [], mailer, limiter = careersRateLimiter() } = {}) {
  const router = Router();
  const origins = allowedOrigins instanceof Set ? allowedOrigins : normalizeOrigins(allowedOrigins);
  const requestSizeGuard = (req, res, next) => {
    const length = Number(req.headers['content-length']);
    if (Number.isFinite(length) && length > CAREERS_MAX_REQUEST_BYTES) {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Application request is too large' } });
    }
    return next();
  };
  router.post('/applications', limiter, requestSizeGuard, (req, res, next) => {
    const origin = String(req.headers.origin || '').replace(/\/+$/, '');
    if (origin && !origins.has(origin)) return res.status(403).json({ error: { code: 'ORIGIN_REJECTED', message: 'Origin is not allowed' } });
    if (req.headers['content-type'] && !req.headers['content-type'].toLowerCase().startsWith('multipart/form-data;')) return res.status(415).json({ error: { code: 'UNSUPPORTED_CONTENT_TYPE', message: 'Multipart form data is required' } });
    return uploadMiddleware()(req, res, async (uploadError) => {
      if (uploadError) return next(uploadError);
      try {
        const parsed = fieldSchema.safeParse(req.body ?? {});
        if (!parsed.success || parsed.data.website) throw invalid();
        if (parsed.data.startedAt && Date.now() - parsed.data.startedAt < 2500) throw invalid('Please take a moment to complete the form');
        const cv = await inspectCv(req.file);
        if (typeof mailer !== 'function' || !recipientEmail) { const error = new Error('Mail infrastructure is not configured'); error.status = 503; error.code = 'MAIL_NOT_CONFIGURED'; throw error; }
        const requestId = crypto.randomUUID();
        const delivery = await mailer({ recipient: recipientEmail, applicant: parsed.data, cv, requestId });
        securityLog(req.log, { action: 'CAREERS_APPLICATION_DELIVERED', req, detail: { requestId, provider: delivery?.provider ?? 'unknown' } });
        return res.set('Cache-Control', 'no-store').status(201).json({ ok: true, requestId });
      } catch (error) {
        const status = error.status || 400;
        const code = error.code || 'VALIDATION_ERROR';
        const message = code === 'MAIL_NOT_CONFIGURED'
          ? 'Application service is temporarily unavailable. Please try again later.'
          : code === 'MAIL_PROVIDER_REJECTED'
            ? 'Application delivery failed. Please try again later.'
            : (status >= 500 ? 'Application could not be submitted. Please try again later.' : error.message);
        return res.set('Cache-Control', 'no-store').status(status).json({ error: { code, message } });
      }
    });
  });
  return router;
}
