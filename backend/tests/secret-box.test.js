import { describe, expect, it } from 'vitest';
import { createSecretBox, inspectMfaKey } from '../src/lib/secret-box.js';

// MFA_ENCRYPTION_KEY validation — the production boot gate for MFA at rest.
// The validator requires exactly 32 bytes encoded as canonical Base64.
// These tests assert the fail-closed behavior and that the error never
// contains the attempted key material.
const b64 = (bytes) => Buffer.alloc(bytes, 7).toString('base64');

describe('createSecretBox key validation', () => {
  it('rejects a missing/empty key with an operator-friendly message', () => {
    for (const value of [undefined, null, '', '   ']) {
      expect(() => createSecretBox(value)).toThrow(/MFA_ENCRYPTION_KEY/);
      expect(() => createSecretBox(value)).toThrow(/Base64-encoded 32-byte value/);
    }
  });

  it('rejects invalid base64 characters', () => {
    expect(() => createSecretBox('!!!not-base64!!!')).toThrow(/MFA_ENCRYPTION_KEY/);
  });

  it('rejects keys that decode to the wrong byte length', () => {
    // 16 and 48 bytes are wrong; a hex string (64 chars) decodes to 48 bytes.
    for (const value of [b64(16), b64(48), 'a'.repeat(64)]) {
      expect(() => createSecretBox(value)).toThrow(/MFA_ENCRYPTION_KEY/);
    }
  });

  it('rejects non-canonical base64 (quotes, whitespace, mid-string padding)', () => {
    const valid = b64(32);
    for (const value of [
      `"${valid}"`, // copied with surrounding quotes from a template
      ` ${valid} `, // accidental whitespace
      `${valid.slice(0, 20)}=${valid.slice(21)}`, // '=' not at the end
    ]) {
      expect(() => createSecretBox(value)).toThrow(/MFA_ENCRYPTION_KEY/);
    }
  });

  it('accepts a canonical 32-byte base64 key and round-trips secrets', () => {
    const secretBox = createSecretBox(b64(32));
    const sealed = secretBox.seal('JBSWY3DPEHPK3PXP');
    expect(secretBox.isSealed(sealed)).toBe(true);
    expect(secretBox.open(sealed)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('detects tampering of the sealed value', () => {
    const secretBox = createSecretBox(b64(32));
    const sealed = secretBox.seal('JBSWY3DPEHPK3PXP');
    const corrupted = sealed.slice(0, -2) + (sealed.endsWith('aa') ? 'bb' : 'aa');
    expect(() => secretBox.open(corrupted)).toThrow();
  });

  it('never includes the attempted key in the error message', () => {
    const attempts = ['!!!not-base64!!!', 'a'.repeat(64), b64(16)];
    for (const value of attempts) {
      try {
        createSecretBox(value);
        throw new Error('expected validation to throw');
      } catch (err) {
        expect(String(err.message)).not.toContain(value);
      }
    }
  });
});

describe('inspectMfaKey startup diagnostic', () => {
  it('reports a missing key without exposing anything', () => {
    for (const value of [undefined, null, '', '   ']) {
      expect(inspectMfaKey(value)).toEqual({ present: false, formatValid: false, decodedBytes: 0 });
    }
  });

  it('reports malformed keys with byte length but never the key material', () => {
    const attempts = ['!!!not-base64!!!', 'a'.repeat(64), b64(16), `"${b64(32)}"`];
    for (const value of attempts) {
      const info = inspectMfaKey(value);
      expect(info.present).toBe(true);
      expect(info.formatValid).toBe(false);
      expect(Number.isInteger(info.decodedBytes)).toBe(true);
      expect(JSON.stringify(info)).not.toContain(value.slice(0, 10));
    }
  });

  it('reports a valid key as valid with length 32', () => {
    expect(inspectMfaKey(b64(32))).toEqual({ present: true, formatValid: true, decodedBytes: 32 });
  });
});
