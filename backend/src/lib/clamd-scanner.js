import net from 'node:net';
import { formError } from './public-form-security.js';

export function createClamdScanner({ host = '', port = 3310, timeoutMs = 8000, maxConcurrent = 3 } = {}) {
  let active = 0;
  return async (buffer) => {
    if (!host || active >= maxConcurrent) throw formError('SCANNER_UNAVAILABLE', 503);
    active += 1;
    try {
      const result = await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        let output = '';
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => {
          socket.write('zINSTREAM\0');
          const size = Buffer.alloc(4); size.writeUInt32BE(buffer.length);
          socket.write(size); socket.write(buffer); socket.end(Buffer.alloc(4));
        });
        socket.on('data', (chunk) => { output += chunk.toString('utf8'); if (output.length > 4096) socket.destroy(); });
        socket.once('end', () => resolve(output));
        socket.once('timeout', () => { socket.destroy(); reject(new Error('scan timeout')); });
        socket.once('error', reject);
      });
      if (/\bFOUND\b/u.test(result)) throw formError('MALWARE_DETECTED');
      if (!/\bOK\b/u.test(result)) throw formError('SCANNER_UNAVAILABLE', 503);
      return { clean: true };
    } catch (error) {
      if (error.code === 'MALWARE_DETECTED') throw error;
      throw formError('SCANNER_UNAVAILABLE', 503);
    } finally { active -= 1; }
  };
}
