[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([switch]$Force)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'modules\LakeFormsDeployment.psm1') -Force
if (-not $Force -and -not $PSCmdlet.ShouldContinue('Remove the LakeGroupForms task and deployment-owned configuration?', 'Lake Group Forms uninstall')) { exit 0 }
try {
  Uninstall-LakeFormsDeployment
} catch {
  Write-FormsStatus FAIL 'Uninstall' $_.Exception.Message
  exit 1
}
