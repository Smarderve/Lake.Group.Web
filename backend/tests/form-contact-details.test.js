import { describe, expect, it } from 'vitest';
import { normalizeFormEmail, normalizeFormPhone } from '../src/lib/form-contact-details.js';

describe('public form contact details', () => {
  it('normalizes a valid email to lowercase', () => expect(normalizeFormEmail(' Person@Example.COM ')).toBe('person@example.com'));
  it.each(['person example@example.com', 'person@example', 'person@', 'x'.repeat(250) + '@example.com'])('rejects malformed email %s', (value) => expect(() => normalizeFormEmail(value)).toThrow());
  it.each([['+255700000000', '+255700000000'], ['+255 700 000 000', '+255700000000'], ['+1 (415) 555-2671', '+14155552671'], ['0712345678', '+255712345678'], ['', '']])('normalizes phone %s', (value, expected) => expect(normalizeFormPhone(value)).toBe(expected));
  it.each(['letters only', '+123', '+' + '1'.repeat(16)])('rejects invalid phone %s', (value) => expect(() => normalizeFormPhone(value, { required: true })).toThrow());
});
