import { config, formsProductionConfigProblems } from './config.js';
import { createLogger } from './logger.js';
import { createRateLimitPool } from './db.js';
import { createSmtpMailer } from './lib/smtp-mailer.js';
import { createClamdScanner } from './lib/clamd-scanner.js';
import { createFormsApp } from './forms-app.js';

const logger = createLogger(config.logLevel);
const problems = formsProductionConfigProblems(config);
if (problems.length) {
  logger.fatal({ problems }, 'refusing to start forms service: insecure configuration');
  process.exit(1);
}
const rateLimitPool = createRateLimitPool(config.databaseUrlRuntime);
const mailer = createSmtpMailer(config.smtp);
const app = createFormsApp({
  logger, contactRecipientEmail: config.contactRecipientEmail, contactAllowedOrigins: config.contactAllowedOrigins,
  contactMailer: mailer, careersRecipientEmail: config.careersRecipientEmail, careersAllowedOrigins: config.careersAllowedOrigins,
  careersMailer: mailer, careersScanner: createClamdScanner({ host: config.careersClamdHost, port: config.careersClamdPort }),
  formTokenSecret: config.publicFormTokenSecret, formRateLimitPool: rateLimitPool,
});
const server = app.listen(config.port, '127.0.0.1', () => logger.info({ port: config.port }, 'Lake Group forms service listening on loopback'));
function shutdown(signal) {
  logger.info({ signal }, 'shutting down forms service');
  server.close(async () => { await rateLimitPool?.end(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
