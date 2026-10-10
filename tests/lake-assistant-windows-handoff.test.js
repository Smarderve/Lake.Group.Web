const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const installer = read('deployment/windows/Install-LakeAssistant.ps1');
const verifier = read('deployment/windows/Verify-LakeAssistant.ps1');
const manager = read('deployment/windows/Manage-LakeAssistant.ps1');
const ollamaRunner = read('deployment/windows/Run-LakeAssistantOllama.ps1');
const backendRunner = read('deployment/windows/Run-LakeAssistantBackend.ps1');
const webConfig = read('web.config');

test('IIS only proxies the Assistant API to loopback and refuses public access to the AI payload', () => {
  assert.match(installer, /\^api\/assistant\/\(\.\*\)\$/);
  assert.match(installer, /http:\/\/127\.0\.0\.1:\$Port\/api\/assistant\/\{R:1\}/);
  assert.match(installer, /Set-AssistantProxyRule -Path \$webConfigPath -Port \$backendPort/);
  assert.match(webConfig, /\(\?:ai\|backend\|cms\|docs/);
  assert.match(webConfig, /Deny private repository paths/);
  assert.doesNotMatch(webConfig, /11434|whisper-cli|ollama\.exe/i);
});

test('installer checks and copies the complete private payload outside the IIS root', () => {
  assert.match(installer, /Test-ContainedPath \$siteRoot \$InstallRoot/);
  assert.match(installer, /ai\\models\\blobs/);
  assert.match(installer, /ai\\speech\\models\\ggml-base\.bin/);
  assert.match(installer, /ai\\speech\\runtime\\whisper-cli\.exe/);
  assert.match(installer, /Copy-Item -LiteralPath \$source -Destination \(Join-Path \$InstallRoot 'ai'\) -Recurse -Force/);
  assert.match(installer, /private Whisper is not ready/);
});

test('boot recovery uses LocalService tasks, bounded retry, loopback listeners and separate logs', () => {
  assert.match(installer, /New-ScheduledTaskTrigger -AtStartup/);
  assert.match(installer, /New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\\LOCAL SERVICE'/);
  assert.match(installer, /RestartCount 5 -RestartInterval/);
  assert.match(ollamaRunner, /OLLAMA_HOST = "127\.0\.0\.1:/);
  assert.match(ollamaRunner, /ollama\.stdout\.log/);
  assert.match(backendRunner, /NODE_ENV = 'production'/);
  assert.match(backendRunner, /backend\.stderr\.log/);
  assert.match(backendRunner, /-Wait -PassThru/);
});

test('operations manager stops backend before Ollama and verifies the private health gates', () => {
  assert.match(manager, /@\(\$backendTask, \$ollamaTask\)/);
  assert.match(manager, /Test-OllamaReady/);
  assert.match(manager, /Test-AssistantReady/);
  assert.match(manager, /Test-VoiceReady/);
  assert.match(manager, /Wait-For \{ \(Get-Listener \$backendPort\)\.Count -eq 0/);
  assert.match(verifier, /Assistant API loopback binding/);
  assert.match(verifier, /Same-origin private Whisper health/);
});
