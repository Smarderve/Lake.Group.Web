[CmdletBinding()]
param([string]$ProjectRoot)
$ErrorActionPreference = 'Stop'
$root = if ($ProjectRoot) { (Resolve-Path $ProjectRoot).Path } else { (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$base = Join-Path $env:ProgramData 'LakeGroup\FormsLocal'; $data = Join-Path $base 'Postgres\data'; $envPath = Join-Path $base 'forms-local.env'; $pidPath = Join-Path $base 'forms-local.pid'; $bin = 'C:\Program Files\PostgreSQL\18\bin'
if (-not (Test-Path $envPath) -or -not (Test-Path (Join-Path $data 'PG_VERSION'))) { throw 'Run setup-local-test.ps1 first.' }
& (Join-Path $bin 'pg_ctl.exe') -D $data status *> $null
if ($LASTEXITCODE -ne 0) { & (Join-Path $bin 'pg_ctl.exe') -D $data -l (Join-Path $base 'Postgres\postgres.log') -w start | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Dedicated forms PostgreSQL cluster failed to start.' } }
if (Test-Path $pidPath) { $old = Get-Process -Id (Get-Content $pidPath) -ErrorAction SilentlyContinue; if ($old) { Write-Host '[PASS] Local forms lab is already running.'; exit 0 } }
$backend = Join-Path $root 'backend'; $entry = Join-Path $backend 'src\forms-local-index.js'; $node = Get-Command node.exe -ErrorAction Stop
$previousEnv = $env:DOTENV_CONFIG_PATH; $env:DOTENV_CONFIG_PATH = $envPath
try { $process = Start-Process -FilePath $node.Source -ArgumentList $entry -WorkingDirectory $backend -WindowStyle Hidden -PassThru } finally { $env:DOTENV_CONFIG_PATH = $previousEnv }
$process.Id | Set-Content $pidPath -Encoding ascii; Start-Sleep -Seconds 2
try { $result = Invoke-WebRequest 'http://127.0.0.1:8080/api/contact/token' -UseBasicParsing -TimeoutSec 5; if ($result.StatusCode -ne 200) { throw 'Contact token did not return HTTP 200.' } } catch { Remove-Item $pidPath -Force -ErrorAction SilentlyContinue; throw 'Local forms lab failed to start. Run verify-local-test.ps1 for safe diagnostics.' }
Write-Host '[PASS] Local forms lab: http://127.0.0.1:8080/contact.html'
