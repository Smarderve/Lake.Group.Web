import { describe, expect, it } from 'vitest';
import { renderFormEmail } from '../src/lib/form-email-template.js';

describe('form email template', () => {
  const message = renderFormEmail({ title: 'Lake Group Website Enquiry', requestId: 'ref-123', details: [{ label: 'Name', value: '<Visitor>' }, { label: 'Email', value: 'person@example.com', type: 'email' }, { label: 'Phone', value: '+255700000000', type: 'phone' }, { label: 'Subject', value: 'Supply enquiry' }], sectionTitle: 'Message', body: 'First line\nSecond line' });
  it('renders branded, escaped, clickable visitor details', () => { expect(message.html).toContain('Lake Group Website Enquiry'); expect(message.html).toContain('Reference: ref-123'); expect(message.html).toContain('&lt;Visitor&gt;'); expect(message.html).toContain('mailto:person@example.com'); expect(message.html).toContain('tel:+255700000000'); });
  it('preserves message line breaks and keeps a readable plain text fallback', () => { expect(message.html).toContain('First line<br>Second line'); expect(message.text).toContain('MESSAGE\nFirst line\nSecond line'); expect(message.text).toContain('Submitted via the Lake Group website'); });
  it('does not include operational secrets or metadata', () => expect(message.html).not.toMatch(/smtp|database|token|ip address/i));
});
