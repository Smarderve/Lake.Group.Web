[CmdletBinding(SupportsShouldProcess)]
param([string]$InstallRoot = "$env:ProgramData\Lake Group\Translation", [string]$NodeExe = (Get-Command node -ErrorAction Stop).Source, [string]$BackendSource = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\backend')).Path, [string]$TranslationManifest = (Join-Path $PSScriptRoot '..\..\..\scripts\.generated\i18n-translation-manifest.json'))
$ErrorActionPreference = 'Stop'
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run from an elevated IT PowerShell session.' }
if (Get-ScheduledTask -TaskName 'LakeGroupTranslation' -ErrorAction SilentlyContinue) { throw 'LakeGroupTranslation already exists. Verify or rollback before reinstalling.' }
$private = [IO.Path]::GetFullPath($InstallRoot)
if ($private.StartsWith([IO.Path]::GetFullPath($env:SystemDrive + '\inetpub\wwwroot'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Translation worker/model storage cannot be under the IIS public root.' }
New-Item -ItemType Directory -Force -Path $private, (Join-Path $private 'logs'), (Join-Path $private 'config'), (Join-Path $private 'models') | Out-Null
Copy-Item -LiteralPath $BackendSource -Destination (Join-Path $private 'backend') -Recurse -Force -Exclude @('node_modules','generated','.env')
$manifestTarget = Join-Path $private 'scripts\.generated\i18n-translation-manifest.json'
if (Test-Path -LiteralPath $TranslationManifest -PathType Leaf) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $manifestTarget) | Out-Null
  Copy-Item -LiteralPath $TranslationManifest -Destination $manifestTarget -Force
} else { Write-Output 'No extraction manifest copied; the worker will sync hardcoded jobs after a manifest is installed under the private application root.' }
$account = 'NT AUTHORITY\LOCAL SERVICE'
icacls $private /inheritance:r /grant:r "Administrators:(OI)(CI)F" "SYSTEM:(OI)(CI)F" "${account}:(OI)(CI)RX" | Out-Null
icacls (Join-Path $private 'logs') /grant "${account}:(OI)(CI)M" | Out-Null
$worker = Join-Path $private 'backend\src\translation-worker.js'
$action = New-ScheduledTaskAction -Execute $NodeExe -Argument ('"' + $worker + '"') -WorkingDirectory (Join-Path $private 'backend')
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'LakeGroupTranslation' -Action $action -Trigger $trigger -Settings $settings -User $account -RunLevel Limited -Description 'Private Lake Group translation worker. Requires operator-approved engine config.' | Out-Null
Write-Output "Installed worker shell under $private. No model was installed; configure private DB/runtime environment and run migration preflight before starting the task."
