$base = Join-Path $env:ProgramData 'LakeGroup\FormsLocal'; $envPath = Join-Path $base 'forms-local.env'; $data = Join-Path $base 'Postgres\data'
Write-Host "Lake Group Local Forms Lab Verification`n======================================="
$current = [Security.Principal.WindowsIdentity]::GetCurrent().Name; $acl = if (Test-Path $envPath) { Get-Acl $envPath } else { $null }
Write-Host "Config protected          $(if ($acl -and $acl.AreAccessRulesProtected -and ($acl.Access.IdentityReference.Value -contains $current)) { 'PASS' } else { 'FAIL' })"
$pg = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "Dedicated PostgreSQL      $(if ($pg -and (Test-Path (Join-Path $data 'PG_VERSION'))) { 'PASS' } else { 'FAIL' })"
foreach ($route in @('contact/token', 'careers/token')) { try { $r = Invoke-WebRequest "http://127.0.0.1:8080/api/$route" -UseBasicParsing -TimeoutSec 5; Write-Host "$route                 $(if ($r.StatusCode -eq 200) { 'PASS' } else { 'FAIL' })" } catch { Write-Host "$route                 FAIL" } }
$clam = Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "ClamAV loopback           $(if ($clam -and $clam.LocalAddress -in @('127.0.0.1','::1')) { 'PASS' } else { 'FAIL (expected until installed)' })"
Write-Host 'SMTP/Gmail receipt        MANUAL — submit the controlled forms; this script never sends mail.'
