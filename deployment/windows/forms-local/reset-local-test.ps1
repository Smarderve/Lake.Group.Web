[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([switch]$Force)

$state = Join-Path $env:ProgramData 'LakeGroup\FormsLocal'
if (-not $Force -and -not $PSCmdlet.ShouldContinue('Remove local forms configuration and PID only?', 'Reset local forms lab')) { exit 0 }
if ($WhatIfPreference) { Write-Host "[INFO] Would remove $state"; exit 0 }
& (Join-Path $PSScriptRoot 'stop-local-test.ps1')
Remove-Item -LiteralPath $state -Recurse -Force -ErrorAction SilentlyContinue
Write-Host '[PASS] Local forms lab state removed. PostgreSQL and ClamAV were not changed.'
