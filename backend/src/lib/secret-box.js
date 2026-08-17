import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

/**
 * Metadata-only inspection of an MFA_ENCRYPTION_KEY value for safe startup
 * diagnostics. NEVER includes the key itself, partial key, or decoded bytes
 * in the result — only booleans and the decoded length. Used by src/index.js
 * so an operator can tell "missing" from "malformed" without a secret ever
 * reaching logs.
 */
export function inspectMfaKey(base64Key) {
  if (!base64Key || !String(base64Key).trim()) {
    return { present: false, formatValid: false, decodedBytes: 0 };
  }
  const decoded = Buffer.from(String(base64Key), 'base64');
  const canonical =
    decoded.toString('base64').replace(/=+$/, '') === String(base64Key).replace(/=+$/, '');
  return {
    present: true,
    formatValid: decoded.length === 32 && canonical,
    decodedBytes: decoded.length,
  };
}

function encryptionKey(base64Key) {
  const key = Buffer.from(String(base64Key || ''), 'base64');
  if (key.length !== 32 || key.toString('base64').replace(/=+$/, '') !== String(base64Key).replace(/=+$/, '')) {
    throw new Error(
      'MFA encryption configuration is invalid. MFA_ENCRYPTION_KEY must be a Base64-encoded 32-byte value ' +
        '(generate one with: openssl rand -base64 32). Configure the production environment variable before ' +
        'starting the service.',
    );
  }
  return key;
}

export function createSecretBox(base64Key) {
  const key = encryptionKey(base64Key);
  return {
    seal(value) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `${PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
    },
    open(value) {
      const encoded = String(value || '');
      // Migration compatibility: existing rows are re-sealed after a
      // successful verification. New writes are always encrypted.
      if (!encoded.startsWith(PREFIX)) return encoded;
      const [iv, tag, ciphertext] = encoded.slice(PREFIX.length).split(':').map((part) => Buffer.from(part, 'base64url'));
      if (iv.length !== 12 || tag.length !== 16 || !ciphertext.length) throw new Error('Invalid encrypted secret');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    },
    isSealed(value) {
      return String(value || '').startsWith(PREFIX);
    },
  };
}
