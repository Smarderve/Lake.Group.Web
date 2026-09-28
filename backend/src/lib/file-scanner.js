import { createClamdScanner } from './clamd-scanner.js';
import { createDefenderScanner } from './defender-scanner.js';
import { formError } from './public-form-security.js';

/** Provider-neutral CV scanner contract: scan({ buffer, filename, mimeType }). */
export function createFileScanner({ provider = '', clamdHost = '', clamdPort = 3310, platform = process.platform, ...options } = {}) {
  if (provider === 'clamd') return createClamdScanner({ host: clamdHost, port: clamdPort, ...options });
  if (provider === 'defender') return createDefenderScanner({ platform, ...options });
  throw formError('SCANNER_UNAVAILABLE', 503);
}
