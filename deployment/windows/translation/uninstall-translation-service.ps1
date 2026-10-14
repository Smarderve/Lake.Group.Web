[CmdletBinding(SupportsShouldProcess)]
param([string]$InstallRoot = "$env:ProgramData\Lake Group\Translation", [switch]$RemovePrivateFiles)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'rollback-translation-service.ps1')
if ($RemovePrivateFiles) { Write-Warning 'Private files can contain model weights and logs. Review retention and obtain IT authorization before removing them.'; Remove-Item -LiteralPath $InstallRoot -Recurse -Confirm }
else { Write-Output "Private files retained at $InstallRoot; database content and translation memory are always retained." }
