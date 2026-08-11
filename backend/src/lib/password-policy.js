/**
 * Password policy (SECURITY_ROADMAP Phase 2).
 *
 * Per the roadmap: prioritize minimum length, common-password rejection,
 * compromised-password checking where practical, and strong hashing
 * (bcrypt-12, in lib/passwords.js). Deliberately no arbitrary complexity
 * rules (uppercase/lowercase/digit/symbol requirements) — those push users
 * toward predictable passwords.
 *
 * "Compromised-password checking where practical": without adding a network
 * dependency, we reject the most commonly breached passwords from a bundled
 * list. A live HIBP-style breach check can be layered on later without
 * changing this interface.
 */

// The most commonly used (and therefore most commonly breached) passwords.
// Case-insensitive. Sourced from public breach-frequency lists (SecLists /
// HIBP top-100). Deliberately small: bundled so the policy works offline.
const COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
  '111111', '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football',
  'monkey', 'letmein', 'shadow', 'master', '666666', 'qwertyuiop', '123321',
  'mustang', '1234567890', 'michael', '654321', 'superman', '1qaz2wsx',
  '7777777', '121212', '000000', 'qazwsx', '123qwe', 'killer', 'trustno1',
  'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter', 'buster', 'soccer',
  'harley', 'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou', '2000',
  'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel', 'starwars',
  '112233', 'george', 'computer', 'michelle', 'jessica', 'pepper', '1111',
  'zxcvbn', '555555', '11111111', '131313', 'freedom', '777777', 'pass',
  'maggie', '159753', 'aaaaaa', 'ginger', 'princess', 'joshua', 'cheese',
  'amanda', 'summer', 'love', 'ashley', 'nicole', 'chelsea', 'biteme',
  'matthew', 'access', 'yankees', '987654321', 'dallas', 'austin', 'thunder',
  'taylor', 'matrix', 'mom', 'monster', 'abc', '5555', '1212', 'asdfasdf',
  '999999', '888888', '7777', '55555', '333333', '98765', 'secret',
]);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Validate a candidate password against the policy.
 *
 * Returns `{ ok: true }` or `{ ok: false, message }` with a single
 * actionable message. `email` is optional but recommended: passwords that
 * embed the email local-part (e.g. "admin2026" for admin@…) are trivially
 * predictable and are rejected.
 */
export function validatePasswordPolicy({ password, email = null }) {
  if (typeof password !== 'string') {
    return { ok: false, message: 'Password is required' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` };
  }
  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) {
    return { ok: false, message: 'This password is too common — choose a less predictable one' };
  }
  if (email && email.includes('@')) {
    const local = email.split('@')[0].toLowerCase();
    // Only meaningful local-parts; a 1–2 char prefix would match almost
    // every password.
    if (local.length >= 4 && lowered.includes(local)) {
      return { ok: false, message: 'Password must not contain your email address' };
    }
  }
  return { ok: true };
}
