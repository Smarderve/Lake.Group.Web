[CmdletBinding()]
param(
  [string]$ProjectRoot,
  [string]$SiteName
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'modules\LakeFormsDeployment.psm1') -Force
try {
  Invoke-LakeFormsVerification -ScriptRoot $PSScriptRoot -ProjectRoot $ProjectRoot -SiteName $SiteName
} catch {
  Write-FormsStatus FAIL 'Verification' $_.Exception.Message
  exit 1
}
