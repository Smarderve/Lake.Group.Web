[CmdletBinding()]
param([Parameter(Mandatory)][string]$InstallRoot, [Parameter(Mandatory)][string]$Executable, [Parameter(Mandatory)][string]$ModelPath, [int]$MinimumFreeMemoryGiB = 8, [int]$MinimumFreeDiskGiB = 10, [switch]$ApprovedByIT)
$ErrorActionPreference = 'Stop'
if (-not $ApprovedByIT) { throw 'IT must explicitly approve the selected checkpoint/runtime and local executable before configuration.' }
if (-not (Test-Path -LiteralPath $Executable -PathType Leaf) -or -not (Test-Path -LiteralPath $ModelPath -PathType Container)) { throw 'Executable/model path does not exist; no configuration was written.' }
$root = [IO.Path]::GetFullPath($InstallRoot)
if ($root.StartsWith([IO.Path]::GetFullPath($env:SystemDrive + '\inetpub\wwwroot'), [StringComparison]::OrdinalIgnoreCase)) { throw 'Private translation config cannot be stored under IIS public root.' }
$config = [ordered]@{ executable = [IO.Path]::GetFullPath($Executable); modelPath = [IO.Path]::GetFullPath($ModelPath); minimumFreeMemoryBytes = [long]$MinimumFreeMemoryGiB * 1GB; minimumFreeDiskBytes = [long]$MinimumFreeDiskGiB * 1GB; configuredAt = (Get-Date).ToUniversalTime().ToString('o'); modelStatus = 'IT-approved; benchmark evidence must be retained separately' }
$destination = Join-Path $root 'config\engine.json'
$temp = "$destination.tmp"
$config | ConvertTo-Json | Set-Content -LiteralPath $temp -Encoding utf8
Move-Item -LiteralPath $temp -Destination $destination -Force
Write-Output "Wrote private engine configuration to $destination. Ensure the service account can read model files; secrets belong in the approved machine secret store, not this JSON."
