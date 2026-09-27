$envPath = Join-Path $env:ProgramData 'LakeGroup\FormsLocal\forms-local.env'
Write-Host "Lake Group Local Forms Lab Verification`n======================================="
Write-Host "Config protected          $(if ((Test-Path $envPath) -and (Get-Acl $envPath).AreAccessRulesProtected) { 'PASS' } else { 'FAIL' })"
foreach ($route in @('contact/token', 'careers/token')) { try { $r = Invoke-WebRequest "http://127.0.0.1:8080/api/$route" -UseBasicParsing -TimeoutSec 5; Write-Host "$route                 $(if ($r.StatusCode -eq 200) { 'PASS' } else { 'FAIL' })" } catch { Write-Host "$route                 FAIL" } }
$clam = Get-NetTCPConnection -LocalPort 3310 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "ClamAV loopback           $(if ($clam -and $clam.LocalAddress -in @('127.0.0.1','::1')) { 'PASS' } else { 'FAIL' })"
Write-Host 'SMTP/Gmail receipt        MANUAL — submit the controlled forms; this script never sends mail.'
