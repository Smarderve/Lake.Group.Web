[CmdletBinding()]
param([switch]$StopDatabase)
$ErrorActionPreference = 'SilentlyContinue'
$base = Join-Path $env:ProgramData 'LakeGroup\FormsLocal'; $pidPath = Join-Path $base 'forms-local.pid'
if (Test-Path $pidPath) { & "$env:SystemRoot\System32\taskkill.exe" /pid (Get-Content $pidPath) /t /f 2>$null; Remove-Item $pidPath -Force }
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*forms-local-index.js*' } |
  ForEach-Object { & "$env:SystemRoot\System32\taskkill.exe" /pid $_.ProcessId /t /f 2>$null }
Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue } |
  Where-Object { $_.ProcessName -eq 'node' } |
  ForEach-Object { & "$env:SystemRoot\System32\taskkill.exe" /pid $_.Id /t /f 2>$null }
Start-Sleep -Seconds 1
$remaining = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
if ($remaining) { throw 'The loopback local forms port is still occupied; stop that local-lab process from the Windows session that started it.' }
if ($StopDatabase) { & 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D (Join-Path $base 'Postgres\data') -m fast -w stop *> $null }
Write-Host '[PASS] Local forms lab stopped.'
