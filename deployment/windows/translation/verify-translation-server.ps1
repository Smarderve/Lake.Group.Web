[CmdletBinding()]
param(
  [string]$ModelPath = '',
  [string]$DatabaseHost = 'localhost',
  [int]$DatabasePort = 5432,
  [int]$MinimumFreeMemoryGiB = 8,
  [int]$MinimumFreeDiskGiB = 10,
  [int]$DatabaseTimeoutMs = 1500
)
$ErrorActionPreference = 'Stop'

function Get-CommandVersion([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { return $null }
  try { return (& $command.Source --version 2>$null | Select-Object -First 1).Trim() } catch { return $null }
}

$os = Get-CimInstance Win32_OperatingSystem
$processors = @(Get-CimInstance Win32_Processor)
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [ordered]@{ Name = $_.Name; DriverVersion = $_.DriverVersion; AdapterMemoryGiB = if ($_.AdapterRAM) { [math]::Round([double]$_.AdapterRAM / 1GB, 2) } else { $null } }
})
$diskRoot = if ($ModelPath) { [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($ModelPath)) } else { $env:SystemDrive + '\' }
$diskId = $diskRoot.TrimEnd('\')
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$diskId'"
$serviceInventory = @(Get-CimInstance Win32_Service | Where-Object {
  $_.Name -match '(?i)qwen|ollama|whisper' -or $_.DisplayName -match '(?i)qwen|ollama|whisper' -or $_.PathName -match '(?i)qwen|ollama|whisper'
} | ForEach-Object { [ordered]@{ Name = $_.Name; DisplayName = $_.DisplayName; State = $_.State; ProcessId = $_.ProcessId } })
$processInventory = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -match '(?i)qwen|ollama|whisper' -or $_.CommandLine -match '(?i)qwen|ollama|whisper'
} | ForEach-Object {
  $process = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
  [ordered]@{ Name = $_.Name; ProcessId = $_.ProcessId; WorkingSetMiB = if ($process) { [math]::Round($process.WorkingSet64 / 1MB, 1) } else { $null } }
})
$nodeVersion = Get-CommandVersion 'node'
$npmVersion = Get-CommandVersion 'npm'
$nodeOk = $false
if ($nodeVersion -match '^v?(\d+)\.(\d+)\.(\d+)') {
  $nodeOk = ([version]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3]) -ge [version]::new(22, 6, 0))
}
$databaseProbe = [ordered]@{ Host = $DatabaseHost; Port = $DatabasePort; TcpReachable = $false; Probe = 'TCP only; no credentials sent and no database selected' }
if ($DatabaseHost) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $pending = $client.BeginConnect($DatabaseHost, $DatabasePort, $null, $null)
    if ($pending.AsyncWaitHandle.WaitOne($DatabaseTimeoutMs, $false)) { $client.EndConnect($pending); $databaseProbe.TcpReachable = $true }
  } catch { $databaseProbe.Error = $_.Exception.GetType().Name }
  finally { $client.Close() }
}
$postgresServices = @(Get-CimInstance Win32_Service | Where-Object { $_.Name -match '(?i)postgres' -or $_.DisplayName -match '(?i)postgres' } | ForEach-Object {
  [ordered]@{ Name = $_.Name; DisplayName = $_.DisplayName; State = $_.State; ProcessId = $_.ProcessId }
})
$report = [ordered]@{
  Computer = $env:COMPUTERNAME
  OS = $os.Caption
  OSVersion = $os.Version
  OSBuild = $os.BuildNumber
  PowerShellVersion = $PSVersionTable.PSVersion.ToString()
  TotalMemoryGiB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
  AvailableMemoryGiB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
  CPU = @($processors | ForEach-Object { $_.Name })
  LogicalProcessors = [int](($processors | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum)
  CPUPercent = @($processors | ForEach-Object { $_.LoadPercentage })
  GPU = $gpus
  DiskRoot = $diskRoot
  FreeDiskGiB = if ($disk) { [math]::Round([double]$disk.FreeSpace / 1GB, 1) } else { $null }
  ExistingQwenWhisperServices = $serviceInventory
  ExistingQwenWhisperProcesses = $processInventory
  PostgreSQLServices = $postgresServices
  PostgreSQLTcpProbe = $databaseProbe
  WindowsRuntime = [ordered]@{ Node = $nodeVersion; NodeMinimum = '22.6.0'; NodeRequirementMet = $nodeOk; Npm = $npmVersion; PowerShell = $PSVersionTable.PSVersion.ToString(); ScheduledTasksAvailable = [bool](Get-Command Register-ScheduledTask -ErrorAction SilentlyContinue) }
  ModelPath = $ModelPath
  TranslationMigrationApplied = 'Not checked by preflight; use the isolated staging migration procedure'
}
$report | ConvertTo-Json -Depth 6
$blockers = @()
if ($report.AvailableMemoryGiB -lt $MinimumFreeMemoryGiB) { $blockers += "Available RAM below configured preflight floor (${MinimumFreeMemoryGiB} GiB); this is not a model sufficiency claim." }
if ($null -eq $report.FreeDiskGiB -or $report.FreeDiskGiB -lt $MinimumFreeDiskGiB) { $blockers += "Free disk below configured preflight floor (${MinimumFreeDiskGiB} GiB) or selected volume unavailable." }
if (-not $ModelPath -or -not (Test-Path -LiteralPath $ModelPath -PathType Container)) { $blockers += 'Private model directory is not present.' }
if (-not $nodeOk) { $blockers += 'Node.js 22.6.0 or later is required by backend/package.json.' }
if (-not $databaseProbe.TcpReachable) { $blockers += 'PostgreSQL TCP endpoint is unavailable; TCP reachability does not establish authentication, database isolation, or migration readiness.' }
if ($blockers.Count) { Write-Error ($blockers -join ' ') }
