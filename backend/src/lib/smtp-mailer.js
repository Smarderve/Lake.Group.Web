import nodemailer from 'nodemailer';
import { formError } from './public-form-security.js';

const deliveryError = () => formError('DELIVERY_TEMPORARILY_UNAVAILABLE', 503);
const validPort = (value) => Number.isInteger(value) && value > 0 && value <= 65535;
const configured = ({ host, port, user, pass, from }) => Boolean(host && validPort(port) && user && pass && from);

function normalizeAttachments(attachments) {
  return attachments.map((attachment) => ({
    ...attachment,
    // Careers provides its vetted CV as base64. State that encoding explicitly
    // so Nodemailer does not turn it into a text attachment.
    encoding: typeof attachment.content === 'string' ? 'base64' : undefined,
  }));
}

/** Provider-neutral SMTP transport for server-selected public-form mail. */
export function createSmtpMailer({
  host = '', port = 587, secure = false, user = '', pass = '', from = '',
  connectionTimeout = 10_000, greetingTimeout = 10_000, socketTimeout = 20_000,
  transportFactory = nodemailer.createTransport,
} = {}) {
  const ready = configured({ host, port, user, pass, from });
  const transport = ready ? transportFactory({
    host, port, secure,
    // Gmail on port 587 uses STARTTLS. TLS certificate verification remains enabled.
    requireTLS: secure === false,
    auth: { user, pass },
    connectionTimeout, greetingTimeout, socketTimeout,
    tls: { rejectUnauthorized: true },
  }) : null;
  return async ({ recipient, replyTo, subject, text, html, attachments = [] }) => {
    if (!ready || !recipient || !replyTo || !subject || !text || !html) throw deliveryError();
    try {
      const info = await transport.sendMail({ from, to: recipient, replyTo, subject, text, html,
        attachments: normalizeAttachments(attachments) });
      if (!info?.messageId && !info?.accepted?.length) throw new Error('SMTP did not accept message');
      return { provider: 'smtp', messageId: info.messageId };
    } catch {
      throw deliveryError();
    }
  };
}

// Private operator diagnostic: verifies connectivity/authentication but sends no email.
export async function verifySmtpTransport(options = {}) {
  const { host = '', port = 587, user = '', pass = '', from = '', transportFactory = nodemailer.createTransport } = options;
  if (!configured({ host, port, user, pass, from })) throw deliveryError();
  try {
    const transport = transportFactory({ host, port, secure: options.secure === true, requireTLS: options.secure !== true,
      auth: { user, pass }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      tls: { rejectUnauthorized: true } });
    await transport.verify();
    return true;
  } catch {
    throw deliveryError();
  }
}
