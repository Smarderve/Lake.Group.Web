import { escapeFormHtml } from './public-form-security.js';

const textValue = (value) => String(value || 'Not provided');
const linkedValue = (label, value, type) => {
  const safe = escapeFormHtml(textValue(value));
  if (type === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return `<a href="mailto:${escapeFormHtml(value)}" style="color:#005f9e;text-decoration:underline">${safe}</a>`;
  if (type === 'phone' && /^\+\d{7,15}$/u.test(value)) return `<a href="tel:${escapeFormHtml(value)}" style="color:#005f9e;text-decoration:underline">${safe}</a>`;
  return safe;
};

export function renderFormEmail({ title, requestId, details, sectionTitle, body, attachment = '' }) {
  const rows = details.map(({ label, value, type }) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #dbe4ea;color:#425466;font:600 14px Arial,sans-serif;width:32%;vertical-align:top">${escapeFormHtml(label)}</td><td style="padding:10px 14px;border-bottom:1px solid #dbe4ea;color:#122d40;font:14px Arial,sans-serif;vertical-align:top">${linkedValue(label, value, type)}</td></tr>`).join('');
  const safeBody = escapeFormHtml(body).replace(/\n/gu, '<br>');
  const attachmentRow = attachment ? `<tr><td style="padding:10px 14px;color:#425466;font:600 14px Arial,sans-serif">Attachment</td><td style="padding:10px 14px;color:#122d40;font:14px Arial,sans-serif">${escapeFormHtml(attachment)}</td></tr>` : '';
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6f8"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f8"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dbe4ea"><tr><td style="height:5px;background:#f2b705;font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="padding:26px 28px 18px;background:#005f9e;color:#fff"><div style="font:700 22px Arial,sans-serif">${escapeFormHtml(title)}</div><div style="margin-top:10px;font:13px Arial,sans-serif;color:#e6f2f8">Reference: ${escapeFormHtml(requestId)}</div></td></tr><tr><td style="padding:24px 28px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dbe4ea">${rows}${attachmentRow}</table><div style="margin-top:26px;padding-top:18px;border-top:3px solid #f2b705;font:700 16px Arial,sans-serif;color:#122d40">${escapeFormHtml(sectionTitle)}</div><div style="margin-top:10px;color:#243b4a;font:15px/1.6 Arial,sans-serif">${safeBody}</div></td></tr><tr><td style="padding:16px 28px;background:#f3f6f8;color:#526675;font:12px Arial,sans-serif">Submitted via the Lake Group website</td></tr></table></td></tr></table></body></html>`;
  const text = [title.toUpperCase(), `Reference: ${requestId}`, '', ...details.map(({ label, value }) => `${label}: ${textValue(value)}`), ...(attachment ? [`Attachment: ${attachment}`] : []), '', sectionTitle.toUpperCase(), body, '', 'Submitted via the Lake Group website'].join('\n');
  return { html, text };
}
