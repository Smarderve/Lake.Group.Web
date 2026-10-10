#Requires -RunAsAdministrator
[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateSet('Start', 'Stop', 'Restart', 'Status')][string]$Action,
  [string]$InstallRoot = (Join-Path $env:ProgramData 'Lake Group\Assistant'),
  [int]$TimeoutSeconds = 300
)
$ErrorActionPreference = 'Stop'
$InstallRoot = [IO.Path]::GetFullPath($InstallRoot)
$taskDescription = 'Managed by Lake Group self-hosted Assistant installer.'
$reportPath = Join-Path $InstallRoot 'install-report.json'

if (-not (Test-Path -LiteralPath $reportPath -PathType Leaf)) { throw "Lake Assistant install report is missing: $reportPath" }
$report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($report.Status -ne 'INSTALLED') { throw "Lake Assistant install status is '$($report.Status)', not INSTALLED." }
$backendPort = [int]$report.PrivateApiPort
$ollamaPort = [int]$report.OllamaLoopbackPort

function Get-OwnedTask([string]$Name) {
  $task = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if (-not $task) { throw "Managed task $Name is missing." }
  $xml = [xml](Export-ScheduledTask -TaskName $Name)
  if ($xml.Task.RegistrationInfo.Description -ne $taskDescription) { throw "Task $Name is not owned by the Lake Assistant installer; refusing to change it." }
  return $task
}

function Wait-For([scriptblock]$Condition, [string]$Description, [int]$Seconds = $TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (& $Condition) { return }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $Description. Check the private logs under '$InstallRoot\logs'."
}

function Get-Listener([int]$Port) { return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) }
function Test-OllamaReady {
  try {
    $tags = Invoke-RestMethod -Uri "http://127.0.0.1:$ollamaPort/api/tags" -TimeoutSec 3
    return @($tags.models | Where-Object { $_.name -eq 'qwen3:4b-instruct-2507-q4_K_M' -or $_.model -eq 'qwen3:4b-instruct-2507-q4_K_M' }).Count -gt 0
  } catch { return $false }
}
function Test-AssistantReady {
  try { return (Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/assistant/health" -TimeoutSec 3).status -eq 'ready' } catch { return $false }
}
function Test-VoiceReady {
  try { return [bool](Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/assistant/voice-health" -TimeoutSec 3).ready } catch { return $false }
}

$ollamaTask = Get-OwnedTask 'LakeAssistant-Ollama'
$backendTask = Get-OwnedTask 'LakeAssistant-Backend'

if ($Action -in @('Stop', 'Restart')) {
  foreach ($task in @($backendTask, $ollamaTask)) {
    if ($task.State -eq 'Running') { Stop-ScheduledTask -TaskName $task.TaskName }
  }
  Wait-For { (Get-ScheduledTask -TaskName 'LakeAssistant-Backend').State -ne 'Running' -and (Get-ScheduledTask -TaskName 'LakeAssistant-Ollama').State -ne 'Running' } 'assistant startup tasks to stop' 45
  Wait-For { (Get-Listener $backendPort).Count -eq 0 -and (Get-Listener $ollamaPort).Count -eq 0 } 'private loopback ports to close' 45
  Write-Host 'Lake Assistant stopped. No process was force-terminated; if a port remains open, inspect its owner before proceeding.'
}

if ($Action -in @('Start', 'Restart')) {
  if ((Get-ScheduledTask -TaskName 'LakeAssistant-Ollama').State -ne 'Running') { Start-ScheduledTask -TaskName 'LakeAssistant-Ollama' }
  Wait-For { Test-OllamaReady } 'the bundled Qwen3 model tag on loopback'
  if ((Get-ScheduledTask -TaskName 'LakeAssistant-Backend').State -ne 'Running') { Start-ScheduledTask -TaskName 'LakeAssistant-Backend' }
  Wait-For { Test-AssistantReady } 'the private assistant API health check'
  Wait-For { Test-VoiceReady } 'the private Whisper health and memory check'
  Write-Host "Lake Assistant is ready. Website-local API: http://127.0.0.1:$backendPort; Ollama loopback: http://127.0.0.1:$ollamaPort."
}

if ($Action -eq 'Status') {
  $listeners = @((Get-Listener $ollamaPort) + (Get-Listener $backendPort))
  [pscustomobject]@{
    OllamaTask = (Get-ScheduledTask -TaskName 'LakeAssistant-Ollama').State
    BackendTask = (Get-ScheduledTask -TaskName 'LakeAssistant-Backend').State
    OllamaLoopbackOnly = (@($listeners | Where-Object LocalPort -eq $ollamaPort).Count -gt 0 -and @($listeners | Where-Object LocalPort -eq $ollamaPort | Where-Object LocalAddress -ne '127.0.0.1').Count -eq 0)
    BackendLoopbackOnly = (@($listeners | Where-Object LocalPort -eq $backendPort).Count -gt 0 -and @($listeners | Where-Object LocalPort -eq $backendPort | Where-Object LocalAddress -ne '127.0.0.1').Count -eq 0)
    AssistantHealth = (Test-AssistantReady)
    VoiceHealth = (Test-VoiceReady)
    LogDirectory = (Join-Path $InstallRoot 'logs')
  } | Format-List
}
