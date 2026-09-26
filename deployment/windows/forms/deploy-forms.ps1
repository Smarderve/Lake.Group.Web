[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$ProjectRoot,
  [string]$SiteName,
  [string]$DatabaseUrlRuntime,
  [switch]$SkipSoftwareInstall,
  [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'modules\LakeFormsDeployment.psm1') -Force

try {
  Start-LakeFormsDeployment -ScriptRoot $PSScriptRoot -ProjectRoot $ProjectRoot -SiteName $SiteName `
    -DatabaseUrlRuntime $DatabaseUrlRuntime -SkipSoftwareInstall:$SkipSoftwareInstall -VerifyOnly:$VerifyOnly
} catch {
  Write-FormsStatus FAIL 'Deployment' $_.Exception.Message
  exit 1
}
