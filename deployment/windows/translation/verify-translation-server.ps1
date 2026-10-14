[CmdletBinding()]
param([string]$ModelPath = '', [string]$DatabaseHost = '', [int]$MinimumFreeMemoryGiB = 8, [int]$MinimumFreeDiskGiB = 10)
$ErrorActionPreference = 'Stop'
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$diskRoot = if ($ModelPath) { [IO.Path]::GetPathRoot($ModelPath) } else { $env:SystemDrive + '\' }
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($diskRoot.TrimEnd('\'))'"
$services = Get-CimInstance Win32_Service | Where-Object { $_.Name -match 'ollama|whisper|lake.*form|form.*lake' -or $_.DisplayName -match 'Qwen|Whisper|Lake.*Form' } | Select-Object Name,DisplayName,State,ProcessId
$report = [ordered]@{
  Computer = $env:COMPUTERNAME; OS = $os.Caption; TotalMemoryGiB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1); AvailableMemoryGiB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
  CPU = $cpu.Name; LogicalProcessors = $cpu.NumberOfLogicalProcessors; CPUPercent = $cpu.LoadPercentage
  DiskRoot = $diskRoot; FreeDiskGiB = if ($disk) { [math]::Round($disk.FreeSpace / 1GB, 1) } else { $null }
  GPU = 'Not probed; IT must record vendor tooling and driver.'; DatabaseHostConfigured = [bool]$DatabaseHost; ExistingRelevantServices = @($services)
  ModelPath = $ModelPath; Node = (& node --version 2>$null); TranslationMigrationApplied = 'Not checked by preflight; use documented controlled migration'
}
$report | ConvertTo-Json -Depth 5
$blockers = @()
if ($report.AvailableMemoryGiB -lt $MinimumFreeMemoryGiB) { $blockers += 'Available RAM below configured minimum.' }
if ($report.FreeDiskGiB -lt $MinimumFreeDiskGiB) { $blockers += 'Free disk below configured minimum.' }
if (-not $ModelPath -or -not (Test-Path -LiteralPath $ModelPath)) { $blockers += 'Private model directory is not present.' }
if (-not $DatabaseHost) { $blockers += 'Database connectivity was not supplied for a separate authenticated verification.' }
if ($blockers.Count) { Write-Error ($blockers -join ' ') }
