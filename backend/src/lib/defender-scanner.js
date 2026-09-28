import { randomBytes } from 'node:crypto';
import { access, chmod, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { formError } from './public-form-security.js';

const MAX_SIGNATURE_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const POWERSHELL_STATUS = '$ErrorActionPreference="Stop";$s=Get-MpComputerStatus;[pscustomobject]@{AMServiceEnabled=$s.AMServiceEnabled;AntivirusEnabled=$s.AntivirusEnabled;AMRunningMode=$s.AMRunningMode;AMEngineVersion=$s.AMEngineVersion;AntivirusSignatureVersion=$s.AntivirusSignatureVersion;AntivirusSignatureLastUpdated=$s.AntivirusSignatureLastUpdated.ToUniversalTime().ToString("o")}|ConvertTo-Json -Compress';
const POWERSHELL_THREATS = '$ErrorActionPreference="Stop";$p=$env:LAKE_GROUP_DEFENDER_SCAN_PATH;$m=@(Get-MpThreatDetection|Where-Object{@($_.Resources|ForEach-Object{[string]$_}) -match [regex]::Escape($p)});[pscustomobject]@{detected=($m.Count -gt 0)}|ConvertTo-Json -Compress';

function run(command, args, { timeoutMs, env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, shell: false, env: { ...process.env, ...env } });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('scanner timeout')); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

async function firstAccessible(paths) {
  for (const path of paths) {
    try { await access(path); return path; } catch { /* try next supported location */ }
  }
  return '';
}

export async function findMpCmdRun({ programData = process.env.ProgramData, programFiles = process.env.ProgramFiles } = {}) {
  const platformRoot = join(programData || 'C:\\ProgramData', 'Microsoft', 'Windows Defender', 'Platform');
  let versions = [];
  try { versions = (await readdir(platformRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().reverse(); } catch { /* fallback below */ }
  return firstAccessible([...versions.flatMap((version) => [
    join(platformRoot, version, 'MpCmdRun.exe'),
    join(platformRoot, version, 'X64', 'MpCmdRun.exe'),
    join(platformRoot, version, 'X86', 'MpCmdRun.exe'),
  ]), join(programFiles || 'C:\\Program Files', 'Windows Defender', 'MpCmdRun.exe')]);
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { throw formError('SCANNER_UNAVAILABLE', 503); }
}

function ready(status) {
  const updated = new Date(status.AntivirusSignatureLastUpdated).getTime();
  return status?.AMServiceEnabled === true && status?.AntivirusEnabled === true && status?.AMRunningMode === 'Normal'
    && typeof status?.AMEngineVersion === 'string' && status.AMEngineVersion.length > 0
    && typeof status?.AntivirusSignatureVersion === 'string' && status.AntivirusSignatureVersion.length > 0
    && Number.isFinite(updated) && Date.now() - updated <= MAX_SIGNATURE_AGE_MS;
}

async function defaultTemporaryFile(buffer) {
  const directory = join(tmpdir(), `lakegroup-careers-${randomBytes(18).toString('hex')}`);
  await mkdir(directory, { recursive: false, mode: 0o700 });
  const path = join(directory, `${randomBytes(18).toString('hex')}.upload`);
  await writeFile(path, buffer, { mode: 0o600, flag: 'wx' });
  await chmod(path, 0o600).catch(() => {});
  return { path, directory };
}

/** Windows-only Defender adapter. It never trusts a scan exit code by itself. */
export function createDefenderScanner({ platform = process.platform, timeoutMs = 15_000, maxConcurrent = 3,
  execute = run, findCommand = findMpCmdRun, createTemporaryFile = defaultTemporaryFile,
  cleanup = (directory) => rm(directory, { recursive: true, force: true }) } = {}) {
  let active = 0;
  const powerShell = process.env.SystemRoot ? join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe') : 'powershell.exe';
  const status = async () => {
    if (platform !== 'win32') throw formError('SCANNER_UNAVAILABLE', 503);
    const result = await execute(powerShell, ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_STATUS], { timeoutMs });
    if (result.code !== 0 || !ready(parseJson(result.stdout))) throw formError('SCANNER_UNAVAILABLE', 503);
    return parseJson(result.stdout);
  };
  const readiness = async () => {
    await status();
    const command = await findCommand();
    if (!command) throw formError('SCANNER_UNAVAILABLE', 503);
    return command;
  };
  const scanner = async ({ buffer } = {}) => {
    if (!Buffer.isBuffer(buffer) || active >= maxConcurrent) throw formError('SCANNER_UNAVAILABLE', 503);
    active += 1;
    let temporary;
    try {
      const command = await readiness();
      temporary = await createTemporaryFile(buffer);
      const scan = await execute(command, ['-Scan', '-ScanType', '3', '-File', temporary.path], { timeoutMs });
      if (![0, 2].includes(scan.code)) throw formError('SCANNER_UNAVAILABLE', 503);
      const threats = await execute(powerShell, ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_THREATS], {
        timeoutMs, env: { LAKE_GROUP_DEFENDER_SCAN_PATH: temporary.path },
      });
      if (threats.code !== 0) throw formError('SCANNER_UNAVAILABLE', 503);
      if (parseJson(threats.stdout).detected === true) throw formError('MALWARE_DETECTED');
      if (scan.code !== 0) throw formError('SCANNER_UNAVAILABLE', 503);
      return { clean: true, provider: 'defender' };
    } catch (error) {
      if (error?.code === 'MALWARE_DETECTED') throw error;
      throw formError('SCANNER_UNAVAILABLE', 503);
    } finally {
      if (temporary?.directory) await cleanup(temporary.directory).catch(() => {});
      active -= 1;
    }
  };
  scanner.ready = readiness;
  return scanner;
}
