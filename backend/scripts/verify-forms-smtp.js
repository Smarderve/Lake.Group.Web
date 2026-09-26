import { config, formsProductionConfigProblems } from '../src/config.js';
import { verifySmtpTransport } from '../src/lib/smtp-mailer.js';

const problems = formsProductionConfigProblems(config);
if (problems.length) {
  console.error('Forms SMTP verification unavailable: required forms configuration is incomplete.');
  process.exit(1);
}
try {
  await verifySmtpTransport(config.smtp);
  console.log('Forms SMTP verification succeeded. No email was sent.');
} catch {
  console.error('Forms SMTP verification failed. Check server-side SMTP configuration and connectivity.');
  process.exit(1);
}
