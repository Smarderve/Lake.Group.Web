[CmdletBinding()]
param([string]$ProjectRoot)

$ErrorActionPreference = 'Stop'
$root = if ($ProjectRoot) { (Resolve-Path $ProjectRoot).Path } else { (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$envPath = Join-Path $env:ProgramData 'LakeGroup\FormsLocal\forms-local.env'
$pidPath = Join-Path $env:ProgramData 'LakeGroup\FormsLocal\forms-local.pid'
if (-not (Test-Path $envPath)) { throw 'Run setup-local-test.ps1 first.' }
if (Test-Path $pidPath) { $old = Get-Process -Id (Get-Content $pidPath) -ErrorAction SilentlyContinue; if ($old) { Write-Host '[PASS] Local forms lab is already running.'; exit 0 } }
$backend = Join-Path $root 'backend'; $entry = Join-Path $backend 'src\forms-local-index.js'
$command = "set `"DOTENV_CONFIG_PATH=$envPath`"&& node `"$entry`""
$process = Start-Process -FilePath "$env:SystemRoot\System32\cmd.exe" -ArgumentList "/d /c $command" -WorkingDirectory $backend -WindowStyle Hidden -PassThru
$process.Id | Set-Content $pidPath -Encoding ascii
Start-Sleep -Seconds 2
try { $result = Invoke-WebRequest 'http://127.0.0.1:8080/api/contact/token' -UseBasicParsing -TimeoutSec 5; if ($result.StatusCode -ne 200) { throw 'Contact token did not return HTTP 200.' } } catch { Remove-Item $pidPath -Force -ErrorAction SilentlyContinue; throw 'Local forms lab failed to start. Run verify-local-test.ps1 for safe diagnostics.' }
Write-Host '[PASS] Local forms lab: http://127.0.0.1:8080/contact.html'
