import { describe, expect, it } from 'vitest';
import { createFormSecurity, safeFormText } from '../src/lib/public-form-security.js';

const secret = 'c'.repeat(32);
describe('Public form token and abuse controls', () => {
  it('rejects wrong form, tampering, expiration, and premature submission', () => {
    let now = 1_000_000;
    const contact = createFormSecurity({ formId: 'contact', secret, now: () => now });
    const careers = createFormSecurity({ formId: 'careers', secret, now: () => now });
    const { token, startedAt } = contact.issueToken();
    expect(() => contact.verifyToken(token, startedAt)).toThrow('INVALID_FORM_TOKEN');
    now += 3000;
    expect(() => careers.verifyToken(token, startedAt)).toThrow('INVALID_FORM_TOKEN');
    expect(() => contact.verifyToken(`${token}x`, startedAt)).toThrow('INVALID_FORM_TOKEN');
    expect(() => contact.verifyToken(token, startedAt + 1)).toThrow('INVALID_FORM_TOKEN');
    expect(contact.verifyToken(token, startedAt)).toBeTruthy();
    now += 60 * 60_000;
    expect(() => contact.verifyToken(token, startedAt)).toThrow('INVALID_FORM_TOKEN');
  });
  it('requires a configured signing secret', () => {
    expect(() => createFormSecurity({ formId: 'contact' }).issueToken()).toThrow('SERVICE_UNAVAILABLE');
  });
  it('rejects control characters and bidi while preserving ordinary message lines', () => {
    expect(() => safeFormText('Hi\r\nBcc: evil@example.com')).toThrow('VALIDATION_ERROR');
    expect(() => safeFormText('resume\u202eexe')).toThrow('VALIDATION_ERROR');
    expect(safeFormText('Line one\nLine two', { multiline: true })).toBe('Line one\nLine two');
  });
  it('limits repeated email and IP combinations even with unique tokens', async () => {
    let now = 1_000_000;
    const guard = createFormSecurity({ formId: 'careers', secret, now: () => now, minCompletionMs: 0 });
    for (let i = 0; i < 2; i += 1) {
      const { token, startedAt } = guard.issueToken();
      await guard.reserve({ token, startedAt, idempotencyKey: `00000000-0000-4000-8000-00000000000${i}`, ip: '1.2.3.4', email: 'person@example.com' });
    }
    const { token, startedAt } = guard.issueToken();
    await expect(guard.reserve({ token, startedAt, idempotencyKey: '00000000-0000-4000-8000-000000000003', ip: '1.2.3.4', email: 'person@example.com' }))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });
  it('allows a scanner-failed reservation to be retried without sending twice', async () => {
    const guard = createFormSecurity({ formId: 'careers', secret, minCompletionMs: 0 });
    const { token, startedAt } = guard.issueToken();
    const args = { token, startedAt, idempotencyKey: '00000000-0000-4000-8000-000000000001', ip: '1.2.3.4', email: 'a@example.com' };
    const reservation = await guard.reserve(args);
    await reservation.release();
    await expect(guard.reserve(args)).resolves.toHaveProperty('release');
  });
});
