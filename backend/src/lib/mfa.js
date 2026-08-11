import { generateSecret, generate, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';

const ISSUER = 'Lake Group';

/**
 * Generate a fresh TOTP secret (base32).
 */
export function createTotpSecret() {
  return generateSecret();
}

/**
 * Build the otpauth:// URL an authenticator app (Google Authenticator,
 * Authy, ...) uses to provision the account.
 */
export function buildOtpauthUrl({ secret, email }) {
  return generateURI({ label: email, issuer: ISSUER, secret });
}

/**
 * Render the otpauth URL as a QR code (PNG data URL) the user can scan.
 */
export function qrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl);
}

/**
 * Verify a submitted 6-digit TOTP code against a secret. `window: 1`
 * tolerates ±1 time step (30 s) of clock drift.
 */
export async function verifyTotp({ secret, code }) {
  if (!secret || !code) return false;
  try {
    const result = await verify({ token: code, secret, window: 1 });
    return Boolean(result && result.valid);
  } catch {
    return false;
  }
}

/**
 * Generate the current valid code for a secret (used by tests and the
 * create-user CLI to demo the flow; never exposed via the API).
 */
export async function currentTotpCode(secret) {
  return generate({ secret });
}
