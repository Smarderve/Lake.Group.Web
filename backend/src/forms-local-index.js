import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config, formsLocalTestConfigProblems } from './config.js';
import { createLogger } from './logger.js';
import { createRateLimitPool } from './db.js';
import { createSmtpMailer } from './lib/smtp-mailer.js';
import { createClamdScanner } from './lib/clamd-scanner.js';
import { createLocalFormsApp } from './forms-local-app.js';

const logger = createLogger(config.logLevel);
const problems = formsLocalTestConfigProblems(config);
if (problems.length) {
  logger.fatal({ problems }, 'refusing to start local forms lab: insecure configuration');
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rateLimitPool = createRateLimitPool(config.databaseUrlRuntime);
const mailer = createSmtpMailer(config.smtp);
const app = createLocalFormsApp({ root, logger,
  contactRecipientEmail: config.contactRecipientEmail, contactAllowedOrigins: config.contactAllowedOrigins,
  contactMailer: mailer, careersRecipientEmail: config.careersRecipientEmail, careersAllowedOrigins: config.careersAllowedOrigins,
  careersMailer: mailer, careersScanner: createClamdScanner({ host: config.careersClamdHost, port: config.careersClamdPort }),
  formTokenSecret: config.publicFormTokenSecret, formRateLimitPool: rateLimitPool,
});
const server = app.listen(8080, '127.0.0.1', () => logger.info({ port: 8080 }, 'Lake Group local forms lab listening on loopback'));
function shutdown(signal) {
  logger.info({ signal }, 'shutting down local forms lab');
  server.close(async () => { await rateLimitPool?.end(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
