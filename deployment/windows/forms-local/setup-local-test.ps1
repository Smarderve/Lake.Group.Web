[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$ProjectRoot, [string]$DatabaseUrlRuntime)

$ErrorActionPreference = 'Stop'
$root = if ($ProjectRoot) { (Resolve-Path $ProjectRoot).Path } else { (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path }
$envPath = Join-Path $env:ProgramData 'LakeGroup\FormsLocal\forms-local.env'
if (-not (Test-Path (Join-Path $root 'backend\src\forms-local-index.js'))) { throw 'Approved project root was not found.' }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 22+ must be installed.' }
$version = (& $node.Source --version).Trim()
if ($version -notmatch '^v(\d+)\.(\d+)' -or [int]$Matches[1] -lt 22 -or ([int]$Matches[1] -eq 22 -and [int]$Matches[2] -lt 6)) { throw 'Node.js 22.6+ must be installed.' }
if (-not $DatabaseUrlRuntime) { $DatabaseUrlRuntime = [Environment]::GetEnvironmentVariable('DATABASE_URL_RUNTIME', 'Machine') }
if (-not $DatabaseUrlRuntime) { $DatabaseUrlRuntime = Read-Host 'Private local DATABASE_URL_RUNTIME' }
if (-not $DatabaseUrlRuntime) { throw 'DATABASE_URL_RUNTIME is required; local replay protection cannot be weakened.' }
$existing = @{}
if (Test-Path $envPath) { Get-Content $envPath | ForEach-Object { if ($_ -match '^([A-Z0-9_]+)=(.*)$') { $existing[$Matches[1]] = $Matches[2].Trim('"') } } }
$password = $existing.SMTP_PASS
if (-not $password -and -not $WhatIfPreference) {
  $secure = Read-Host 'Gmail App Password' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}
$secret = $existing.PUBLIC_FORM_TOKEN_SECRET
if (-not $secret) { $bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); $secret = [Convert]::ToBase64String($bytes) }
if ($WhatIfPreference) { Write-Host '[INFO] Would create protected local forms configuration and install backend dependencies.'; exit 0 }
New-Item -ItemType Directory -Path (Split-Path $envPath) -Force | Out-Null
@("FORMS_MODE=local-test", 'NODE_ENV=development', 'PORT=8080', "DATABASE_URL_RUNTIME=$DatabaseUrlRuntime", "PUBLIC_FORM_TOKEN_SECRET=$secret", 'SMTP_HOST=smtp.gmail.com', 'SMTP_PORT=587', 'SMTP_SECURE=false', 'SMTP_USER=projectdevemail001@gmail.com', "SMTP_PASS=$password", 'MAIL_FROM="Lake Group Website Test <projectdevemail001@gmail.com>"', 'CONTACT_RECIPIENT_EMAIL=projectdevemail001@gmail.com', 'CAREERS_RECIPIENT_EMAIL=projectdevemail001@gmail.com', 'CONTACT_ALLOWED_ORIGINS=http://127.0.0.1:8080', 'CAREERS_ALLOWED_ORIGINS=http://127.0.0.1:8080', 'CAREERS_CLAMD_HOST=127.0.0.1', 'CAREERS_CLAMD_PORT=3310') | Set-Content $envPath -Encoding UTF8
$acl = Get-Acl $envPath; $acl.SetAccessRuleProtection($true, $false); foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRule($rule) }; foreach ($account in @('BUILTIN\Administrators', 'NT AUTHORITY\SYSTEM')) { [void]$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($account, 'FullControl', 'Allow'))) }; Set-Acl $envPath $acl
Push-Location (Join-Path $root 'backend'); try { npm.cmd ci --omit=dev; if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' } } finally { Pop-Location }
Write-Host '[PASS] Local configuration and backend dependencies are ready.'
