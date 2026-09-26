[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$Snapshot)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'modules\LakeFormsDeployment.psm1') -Force
try {
  Restore-LakeFormsDeployment -Snapshot $Snapshot
} catch {
  Write-FormsStatus FAIL 'Rollback' $_.Exception.Message
  exit 1
}
