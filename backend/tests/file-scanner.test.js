import { describe, expect, it, vi } from 'vitest';
import { createDefenderScanner } from '../src/lib/defender-scanner.js';
import { createFileScanner } from '../src/lib/file-scanner.js';

const healthy = JSON.stringify({ AMServiceEnabled: true, AntivirusEnabled: true, AMRunningMode: 'Normal', AMEngineVersion: '1.1.1.1', AntivirusSignatureVersion: '1.2.3.4', AntivirusSignatureLastUpdated: new Date().toISOString() });

function setup({ scanCode = 0, detected = false, fail = false, maxConcurrent = 3 } = {}) {
  const cleanup = vi.fn(async () => {});
  const temporary = { path: 'C:\\Temp\\random.upload', directory: 'C:\\Temp\\random' };
  const execute = vi.fn(async (command, args) => {
    if (fail) throw new Error('process unavailable');
    if (args.includes('-Scan')) return { code: scanCode, stdout: '', stderr: '' };
    if (process.env.SystemRoot && command.endsWith('powershell.exe')) return { code: 0, stdout: healthy, stderr: '' };
    return { code: 0, stdout: JSON.stringify({ detected }), stderr: '' };
  });
  // The second PowerShell command is threat lookup; status is identified by its first invocation.
  let powerShellCalls = 0;
  execute.mockImplementation(async (_command, args) => {
    if (fail) throw new Error('process unavailable');
    if (args.includes('-Scan')) return { code: scanCode, stdout: '', stderr: '' };
    powerShellCalls += 1;
    return { code: 0, stdout: powerShellCalls === 1 ? healthy : JSON.stringify({ detected }), stderr: '' };
  });
  return { cleanup, execute, scanner: createDefenderScanner({ platform: 'win32', execute, findCommand: async () => 'C:\\Defender\\MpCmdRun.exe', createTemporaryFile: async () => temporary, cleanup, maxConcurrent }) };
}

describe('file scanner contract', () => {
  it('dispatches ClamAV and Defender providers and rejects unknown providers', () => {
    expect(typeof createFileScanner({ provider: 'clamd', clamdHost: '127.0.0.1' })).toBe('function');
    expect(typeof createFileScanner({ provider: 'defender', platform: 'win32' })).toBe('function');
    expect(() => createFileScanner({ provider: 'disabled' })).toThrow();
  });
  it('returns a clean Defender verdict only after structured no-threat lookup', async () => {
    const { scanner, cleanup } = setup();
    await expect(scanner({ buffer: Buffer.from('safe'), filename: 'a.pdf', mimeType: 'application/pdf' })).resolves.toEqual({ clean: true, provider: 'defender' });
    expect(cleanup).toHaveBeenCalledWith('C:\\Temp\\random');
  });
  it('maps structured Defender detections to MALWARE_DETECTED and always cleans up', async () => {
    const { scanner, cleanup } = setup({ scanCode: 2, detected: true });
    await expect(scanner({ buffer: Buffer.from('eicar') })).rejects.toMatchObject({ code: 'MALWARE_DETECTED' });
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('fails closed for scan errors, process errors, non-Windows, and concurrency exhaustion', async () => {
    await expect(setup({ scanCode: 2 }).scanner({ buffer: Buffer.from('safe') })).rejects.toMatchObject({ code: 'SCANNER_UNAVAILABLE' });
    await expect(setup({ fail: true }).scanner({ buffer: Buffer.from('safe') })).rejects.toMatchObject({ code: 'SCANNER_UNAVAILABLE' });
    await expect(createDefenderScanner({ platform: 'linux' }).ready()).rejects.toMatchObject({ code: 'SCANNER_UNAVAILABLE' });
    const { scanner } = setup({ maxConcurrent: 1 });
    const pending = scanner({ buffer: Buffer.from('safe') });
    await expect(scanner({ buffer: Buffer.from('safe') })).rejects.toMatchObject({ code: 'SCANNER_UNAVAILABLE' });
    await pending;
  });
});
