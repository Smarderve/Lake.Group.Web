import { formError, safeFormText } from './public-form-security.js';

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u;

export function normalizeFormEmail(value) {
  const email = safeFormText(value).toLowerCase();
  if (email.length > 254 || /\s/u.test(email) || !EMAIL_PATTERN.test(email)) throw formError('VALIDATION_ERROR');
  return email;
}

export function normalizeFormPhone(value, { required = false } = {}) {
  const source = safeFormText(value);
  if (!source) {
    if (required) throw formError('VALIDATION_ERROR');
    return '';
  }
  if (/[^0-9+().\s-]/u.test(source) || (source.match(/\+/gu) || []).length > 1 || (source.includes('+') && !/^\s*\+/u.test(source))) throw formError('VALIDATION_ERROR');
  let digits = source.replace(/[^0-9]/gu, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^0[67]\d{8}$/u.test(digits)) digits = `255${digits.slice(1)}`;
  if (digits.length < 7 || digits.length > 15) throw formError('VALIDATION_ERROR');
  return `+${digits}`;
}
