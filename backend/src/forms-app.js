import express from 'express';
import { pinoHttp } from 'pino-http';
import { pinoHttpOptions } from './logger.js';
import { careersRouter } from './routes/careers.js';
import { contactRouter } from './routes/contact.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { securityHeaders } from './middleware/security-headers.js';

const isLoopback = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

/** Minimal public-forms service: no CMS, admin, sessions, media, or dev API. */
export function createFormsApp({ logger, contactRecipientEmail = '', contactAllowedOrigins = [], contactMailer = null,
  careersRecipientEmail = '', careersAllowedOrigins = [], careersMailer = null, careersScanner = null,
  formTokenSecret = '', formRateLimitPool = null } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(securityHeaders({ hsts: true }));
  if (logger) app.use(pinoHttp(pinoHttpOptions(logger)));
  app.use('/api/contact', contactRouter({ recipientEmail: contactRecipientEmail, allowedOrigins: contactAllowedOrigins,
    mailer: contactMailer, tokenSecret: formTokenSecret, pool: formRateLimitPool }));
  app.use('/api/careers', careersRouter({ recipientEmail: careersRecipientEmail, allowedOrigins: careersAllowedOrigins,
    mailer: careersMailer, scanner: careersScanner, tokenSecret: formTokenSecret, pool: formRateLimitPool }));
  app.get('/internal/forms-health', (req, res) => {
    if (!isLoopback(req)) return res.status(404).end();
    return res.set('Cache-Control', 'no-store').json({ status: 'ok', service: 'lake-group-forms' });
  });
  app.use(notFoundHandler);
  app.use(errorHandler({ logger }));
  return app;
}
