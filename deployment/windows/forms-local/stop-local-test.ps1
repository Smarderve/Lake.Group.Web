$ErrorActionPreference = 'SilentlyContinue'
$pidPath = Join-Path $env:ProgramData 'LakeGroup\FormsLocal\forms-local.pid'
if (Test-Path $pidPath) { & "$env:SystemRoot\System32\taskkill.exe" /pid (Get-Content $pidPath) /t /f 2>$null; Remove-Item $pidPath -Force }
Write-Host '[PASS] Local forms lab stopped.'
